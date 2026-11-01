import * as THREE from "three";
import { WorldResources, disposeObject, detachInstance } from "./resources.js";
import { nameTag } from "./visuals.js";
import { selectNpcAppearance } from "./npc-appearance.js";
import { SnapshotBuffer } from "../network/interpolation.js";
import { examinerGroups } from "../gameplay/education.js";
import { command } from "../network/protocol.js";
import {
  ACADEMY_HUB,
  ACADEMY_ROOMS,
  roomById,
  roomByPosition,
} from "./academy-locations.js";
import { AcademyArt } from "./academy-art.js";
import { matchesShelf, closestShelfPoint } from "./shelf-layout.js";
import { NpcVisualPatrol } from "./npc-visual-patrol.js";
import { actorPhase } from "./actor-seed.js";
import { CompetitionArt } from "./competition-art.js";

const PLAYER_RADIUS = 0.32;
const HALL_DOOR_WALL_Z = 65.65;
const HALL_DOOR_WALL_LEFT = 65.5;
const HALL_DOOR_WALL_RIGHT = 94.5;
const HALL_DOOR_HALF_WIDTH = 0.72;

function hallWallColliders() {
  const doors = ACADEMY_ROOMS.map((room) => room.door.x).sort((a, b) => a - b);
  const segments = [];
  let start = HALL_DOOR_WALL_LEFT;
  for (const doorX of doors) {
    const end = doorX - HALL_DOOR_HALF_WIDTH;
    if (end > start)
      segments.push({
        x: (start + end) / 2,
        z: HALL_DOOR_WALL_Z,
        hx: (end - start) / 2,
        hz: 0.18,
      });
    start = doorX + HALL_DOOR_HALF_WIDTH;
  }
  if (HALL_DOOR_WALL_RIGHT > start)
    segments.push({
      x: (start + HALL_DOOR_WALL_RIGHT) / 2,
      z: HALL_DOOR_WALL_Z,
      hx: (HALL_DOOR_WALL_RIGHT - start) / 2,
      hz: 0.18,
    });
  // The rear opening is visibly filled by AcademyArt; close the rest of that wall too.
  segments.push(
    { x: (65.5 + 78.35) / 2, z: 94.5, hx: (78.35 - 65.5) / 2, hz: 0.2 },
    { x: (81.65 + 94.5) / 2, z: 94.5, hx: (94.5 - 81.65) / 2, hz: 0.2 },
    { x: 80, z: 94.5, hx: 1.65, hz: 0.2 },
    { x: 65.5, z: 80, hx: 0.2, hz: 14.5 },
    { x: 94.5, z: 80, hx: 0.2, hz: 14.5 },
  );
  return segments;
}

function colliderSeparation(x, z, collider, radius = PLAYER_RADIUS) {
  const dx = Math.abs(x - collider.x) - collider.hx;
  const dz = Math.abs(z - collider.z) - collider.hz;
  return (
    Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) +
    Math.min(Math.max(dx, dz), 0) -
    radius
  );
}

export function blocksColliderMove(x, z, fromX, fromZ, collider) {
  const next = colliderSeparation(x, z, collider);
  if (next >= 0) return false;
  const current = colliderSeparation(fromX, fromZ, collider);
  // Allow motion parallel to a surface and outward from a restored overlap.
  return current >= 0 || next < current - 1e-5;
}
export class Game {
  constructor(container, adapter, configs, onUpdate, onError) {
    this.container = container;
    this.adapter = adapter;
    this.configs = configs;
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.keys = new Set();
    this.others = new Map();
    this.sharedPlayerPositions = [];
    this.npcs = new Map();
    this.actors = new Map();
    this.ambientStudents = new Map();
    this.authoritative = new THREE.Vector3(
      ...Object.values(configs.world.spawn),
    );
    this.target = this.authoritative.clone();
    this.heading = 0;
    this.inputTimer = 0;
    this.statsTimer = 0;
    this.metricsTimer = 0;
    this.frames = 0;
    this.frameTime = 0;
    this.frameDeltas = [];
    this.fpsLow1Pct = 60;
    this.currentFrameTimeMs = 16.6;
    this.lastTick = -1;
    this.serverTime = 0;
    this.serverTimeReceivedAt = performance.now();
    this.yaw = 0;
    this.pitch = 0;
    this.activity = { mode: "exploring", targetId: null, seatId: null };
    this.tableLabels = new Map();
    this.readingLabels = new Map();
    this.shelfColliders = [];
    this.hallWallColliders = hallWallColliders();
    this.dialogTargets = new Map();
    this.localDialogNpcIds = new Set();
    this.elevation = 0.8;
    this.distance = 0;
    this.abort = new AbortController();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#dce5df");
    this.scene.fog = new THREE.Fog("#dce5df", 35, 100);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 280);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D-мир Discovery. WASD — движение, щелчок — захват мыши, E — взаимодействие.",
    );
    this.renderer.domElement.tabIndex = 0;
    container.append(this.renderer.domElement);
    this.ambient = new THREE.HemisphereLight(0xfff7de, 0x7b8d76, 2.6);
    this.sun = new THREE.DirectionalLight(0xffecd4, 3.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -45,
      right: 45,
      top: 45,
      bottom: -45,
      near: 1,
      far: 130,
    });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.08;
    this.scene.add(this.ambient, this.sun, this.sun.target);
    this.locationId = ACADEMY_HUB;
    this.academyArt = new AcademyArt(this.scene);
    this.academyArt.setLocation(this.locationId, this.authoritative);
    this.competitionArt = new CompetitionArt(
      this.scene,
      configs.gameplay?.competition?.tables || [],
    );
    this.player = this.createActor("self", "Вы");
    this.player.position.copy(this.authoritative);
    this.player.visible = false;
    this.resources = new WorldResources(adapter, this.scene, {
      beforeChange: () => {
        this.clearModels();
        this.shelfColliders = [];
      },
      onLoaded: () => {
        this.refreshShelfColliders();
        this.localArt?.applyWorld();
        this.hydrateActors();
        this.syncReadingLabels();
        this.applyRender();
      },
      onError: (error) => {
        this.loadError = error;
        this.onError(error);
      },
    });
    this.createAmbientStudents();
    this.chunks = this.resources;
    this.unsub = adapter.onEvent((event) => this.onEvent(event));
    this.unsubStatus = adapter.onStatus((status) => {
      if (status === "connected") {
        this.lastTick = -1;
        for (const other of [...this.others.values(), ...this.npcs.values()])
          other.buffer = new SnapshotBuffer();
      }
      if (status === "auth-expired") {
        this.resources.dispose().catch(onError);
      }
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.bindInput();
    this.applyRender();
    this.last = performance.now();
    this.frame = requestAnimationFrame((t) => this.animate(t));
  }
  createActor(id, name) {
    const root = new THREE.Group();
    const tag = nameTag(name);
    root.add(tag);
    root.userData = {
      actorId: id,
      tag,
      body: null,
      modelId: null,
      actorKind: id === "self" || id.startsWith("player:") ? "player" : "npc",
      displayName: name,
    };
    this.scene.add(root);
    this.actors.set(id, root);
    return root;
  }
  createAmbientStudents() {
    const routes = [
      [[68.2, 70.8], [72.8, 70.5], [76.1, 73.2], [74.9, 78.5], [69.2, 79.1]],
      [[84.2, 70.5], [90.8, 71.2], [91.4, 76.2], [86.1, 79.3], [83.7, 75.4]],
      [[68.1, 86.2], [70.4, 90.5], [75.1, 91.3], [76.2, 87.9], [73.4, 85.1]],
      [[84.4, 85.2], [89.8, 84.1], [92.1, 88.3], [90.6, 92.1], [85.7, 92.5]],
    ];
    routes.forEach((route, index) => {
      const id = `player:ambient-student-${index + 1}`;
      const root = this.createActor(id, "Ученик");
      root.userData.ambientStudent = true;
      root.userData.tag.visible = this.configs.characterVisual.showNames;
      const points = route.map(([x, z]) => ({ x, z }));
      const phase = actorPhase(id);
      root.userData.visualPatrol = new NpcVisualPatrol(points, {
        speed: 0.48 + phase * 0.2,
        phase,
        initialPause: 1.5 + phase * 2.5,
        pause: 1.8 + actorPhase(`${id}:pause`) * 2.2,
      });
      this.ambientStudents.set(id, root);
    });
  }
  setNpcDialogueFrozen(id, frozen) {
    if (frozen) this.localDialogNpcIds.add(id);
    else this.localDialogNpcIds.delete(id);
  }
  setActorName(root, name) {
    const cleanName = String(name || "Игрок")
      .trim()
      .slice(0, 40);
    if (root.userData.displayName === cleanName) return;
    if (root.userData.tag) disposeObject(root.userData.tag);
    const tag = nameTag(cleanName);
    tag.position.y = root.userData.seated ? 2.1 : 2.55;
    tag.visible = this.configs.characterVisual.showNames;
    root.add(tag);
    root.userData.tag = tag;
    root.userData.displayName = cleanName;
  }
  clearModels() {
    for (const [owner, root] of this.actors) {
      if (root.userData.body) {
        root.userData.mixer?.stopAllAction();
        root.userData.mixer?.uncacheRoot(root.userData.body);
        detachInstance(root.userData.body);
        root.userData.body = null;
        root.userData.modelId = null;
        root.userData.mixer = null;
      }
      this.resources?.ledger.releaseOwner("actor:" + owner);
    }
  }
  hydrateActors() {
    for (const [owner, root] of this.actors) {
      let id = owner.startsWith("npc:")
        ? this.configs.characterVisual.npcModelId
        : this.configs.characterVisual.playerModelId;
      if (root.userData.modelId === id && root.userData.body) {
        if (owner.startsWith("npc:"))
          selectNpcAppearance(root.userData.body, root.userData.npcProfile);
        continue;
      }
      if (root.userData.body) {
        root.userData.mixer?.stopAllAction();
        root.userData.mixer?.uncacheRoot(root.userData.body);
        root.userData.mixer = null;
        detachInstance(root.userData.body);
        this.resources.ledger.releaseOwner("actor:" + owner);
      }
      let body = this.resources.instantiate(id, "actor:" + owner);
      if (!body) {
        id = "explorer";
        body = this.resources.instantiate(id, "actor:" + owner);
        if (body && !owner.startsWith("npc:")) {
          this.configs.characterVisual.playerModelId = "explorer";
        }
      }
      root.userData.modelId = body ? id : null;
      root.userData.body = body;
      if (body) {
        selectNpcAppearance(body, root.userData.npcProfile);
        if (body.userData.animations?.length) {
          const mixer = new THREE.AnimationMixer(body);
          const clip =
            body.userData.animations.find((c) => /idle|walk/i.test(c.name)) ||
            body.userData.animations[0];
          mixer.clipAction(clip).play();
          root.userData.mixer = mixer;
        }
        body.traverse((n) => {
          if (n.isMesh) n.castShadow = true;
        });
        root.add(body);
      }
    }
    this.localArt?.applyActors();
    this.applyCharacter();
  }
  refreshShelfColliders() {
    this.shelfColliders = [...(this.resources?.roots.values() || [])]
      .flatMap((chunk) => chunk.roots)
      .map((root) => root.userData.placement)
      .filter(
        (placement) =>
          placement?.collidable && placement.modelId === "reading-shelf",
      )
      .map((placement) => {
        const scale = placement.scale ?? 1;
        const c = Math.abs(Math.cos(placement.yawRad));
        const s = Math.abs(Math.sin(placement.yawRad));
        return {
          x: placement.position.x,
          z: placement.position.z,
          hx: scale * (c + s / 2) + 0.35,
          hz: scale * (s + c / 2) + 0.35,
        };
      });
  }
  removeActor(id, root) {
    this.localArt?.releaseActor(root);
    if (root.userData.body) {
      root.userData.mixer?.stopAllAction();
      root.userData.mixer?.uncacheRoot(root.userData.body);
      detachInstance(root.userData.body);
      this.resources.ledger.releaseOwner("actor:" + id);
    }
    disposeObject(root.userData.tag);
    root.removeFromParent();
    root.clear();
    this.actors.delete(id);
  }
  async start() {
    const { LocalArt } = await import("./local-art.js");
    this.localArt = new LocalArt(this, this.onError);
    this.localArt.preload();
    return this.adapter.connect();
  }
  async enterLocation(roomId) {
    if (!this.academyArt || this.activity.mode !== "exploring") return;
    if (this.zoneTransition) return this.zoneTransition;
    this.zoneTransition = this.adapter
      .enterLocation(roomId)
      .then(() => {
        this.locationId = roomId;
        this.academyArt.setLocation(roomId, this.authoritative);
        this.syncNpcPlacement();
        this.syncReadingLabels();
        this.applyWorld();
      })
      .catch((error) => this.onError(error))
      .finally(() => {
        this.zoneTransition = null;
      });
    return this.zoneTransition;
  }
  updateLocationFromPosition() {
    if (this.zoneTransition || !this.adapter.ready) return;
    const inside = roomByPosition(this.authoritative);
    const next = inside?.roomId || ACADEMY_HUB;
    if (next !== this.locationId) this.enterLocation(next);
  }
  updateZoneRendering(dt) {
    this.zoneVisualTimer = (this.zoneVisualTimer || 0) + dt;
    if (this.zoneVisualTimer < 0.15) return;
    this.zoneVisualTimer = 0;
    this.academyArt?.setLocation(this.locationId, this.authoritative);
    for (const room of ACADEMY_ROOMS) {
      const distance = Math.hypot(
        this.authoritative.x - room.door.x,
        this.authoritative.z - 65.5,
      );
      if (this.locationId === room.roomId || distance < 8)
        this.localArt?.prefetchRoom?.(room.roomId);
      else if (distance > 14) {
        this.localArt?.releaseRoom?.(room.roomId);
        this.academyArt?.disposeRoom(room.roomId);
      }
    }
  }
  syncNpcPlacement() {
    const currentRoom = roomById(this.locationId);
    if (currentRoom) {
      for (const [id, npc] of this.npcs) {
        if (id === currentRoom.teacherId) {
          npc.root.position.set(
            currentRoom.teacherPosition.x,
            currentRoom.teacherPosition.y,
            currentRoom.teacherPosition.z,
          );
          npc.baseYaw = 0;
          npc.visualPatrol = null;
          npc.visualPatrolKey = null;
          npc.root.visible = true;
        } else if (npc.role === "examiner") {
          npc.root.position.set(
            currentRoom.examinerPosition.x,
            currentRoom.examinerPosition.y,
            currentRoom.examinerPosition.z,
          );
          npc.baseYaw = 0;
          npc.visualPatrol = null;
          npc.visualPatrolKey = null;
          npc.root.visible = true;
        } else {
          npc.visualPatrol = null;
          npc.root.visible = false;
        }
      }
    } else {
      for (const npc of this.npcs.values()) {
        npc.visualPatrol = null;
        npc.visualPatrolKey = null;
        npc.root.visible = npc.role !== "teacher" || npc.id === "npc-guide";
      }
    }
  }
  onEvent(event) {
    const p = event.payload;
    if (event.type === "server.welcome") {
      this.adapter.playerId = p.playerId;
      const self = p.session.players.find((v) => v.playerId === p.playerId);
      if (self) {
        this.authoritative.set(
          self.position.x,
          self.position.y,
          self.position.z,
        );
        this.player.position.copy(this.authoritative);
        const restoredRoom = roomByPosition(self.position);
        this.locationId = restoredRoom?.roomId || ACADEMY_HUB;
        this.academyArt?.setLocation(this.locationId);
        this.syncNpcPlacement();
      }
      this.lastTick = -1;
      return;
    }
    if (event.type === "world.interest") {
      this.loadError = null;
      this.resources.accept(p);
      return;
    }
    if (event.type === "competition.state") {
      this.competitionArt?.syncState(p);
      return;
    }
    if (event.type === "competition.settled") {
      this.competitionArt?.settle(p);
      return;
    }
    if (event.type === "config.changed") {
      this.pendingConfig = p;
      return;
    }
    if (event.type === "progress.updated") {
      this.onProgress?.(p);
      return;
    }
    if (event.type !== "world.snapshot" || p.tick <= this.lastTick) return;
    this.lastTick = p.tick;
    this.serverTime = p.tick / 20;
    this.serverTimeReceivedAt = performance.now();
    if (this.pendingConfig && p.tick >= this.pendingConfig.effectiveTick) {
      this.applyPublicConfig(this.pendingConfig.publicConfig);
      this.pendingConfig = null;
    }
    if (p.configRevision !== this.configs.revision && !this.refreshingConfig) {
      this.adapter.ready = false;
      this.refreshingConfig = this.adapter
        .getPublicConfig()
        .then((doc) => {
          this.applyPublicConfig(doc);
          if (this.resources.interest === this.adapter.interest)
            this.adapter.markReady(this.adapter.interest, [
              ...new Set(
                [
                  ...this.adapter.interest.chunks,
                  ...this.adapter.interest.assets,
                ].map((d) => d.sha256),
              ),
            ]);
        })
        .catch(this.onError)
        .finally(() => (this.refreshingConfig = null));
    }
    this.tables = p.tables;
    this.sharedPlayerPositions = p.players.map((player) => ({
      x: player.position.x,
      z: player.position.z,
    }));
    this.competitionArt?.sync(p.tables);
    this.syncTableLabels();
    const ids = new Set();
    this.dialogTargets.clear();
    for (const player of p.players) {
      if (player.activity?.mode === "learning" && player.activity.targetId) {
        this.dialogTargets.set(player.activity.targetId, {
          x: player.position.x,
          z: player.position.z,
        });
      }
    }
    for (const player of p.players) {
      if (player.playerId === this.adapter.playerId) {
        if (JSON.stringify(this.activity) !== JSON.stringify(player.activity)) {
          this.activity = player.activity;
          const seat = [
            ...this.configs.gameplay.competition.tables.flatMap((t) => t.seats),
            ...this.configs.gameplay.education.stations.map(
              (s) => s.examinerSeat,
            ),
          ].find((s) => s.seatId === player.activity.seatId);
          if (seat) {
            this.yaw = seat.yawRad;
            this.pitch = 0;
          }
          this.keys.clear();
          this.walkTarget = null;
          this.seatTransitionUntil =
            performance.now() + this.configs.firstPerson.seatTransitionMs;
        }
        this.authoritative.set(
          player.position.x,
          player.position.y,
          player.position.z,
        );
        continue;
      }
      ids.add(player.playerId);
      let other = this.others.get(player.playerId);
      if (!other) {
        other = {
          root: this.createActor(
            "player:" + player.playerId,
            player.displayName,
          ),
          buffer: new SnapshotBuffer(),
        };
        other.root.position.set(
          player.position.x,
          player.position.y,
          player.position.z,
        );
        other.root.rotation.y = player.yawRad;
        this.others.set(player.playerId, other);
        this.hydrateActors();
        this.localArt?.applyActors();
      }
      this.setActorName(other.root, player.displayName);
      other.root.userData.seated = player.activity.mode.startsWith("seated_");
      other.buffer.push(
        [player.position.x, player.position.y, player.position.z],
        player.yawRad,
        performance.now(),
        p.tick,
      );
    }
    for (const [id, other] of this.others)
      if (!ids.has(id)) {
        this.removeActor("player:" + id, other.root);
        this.others.delete(id);
      }
    const npcIds = new Set();
    const groups = examinerGroups(this.configs.gameplay.education.stations);
    for (const source of p.npcs) {
      const group =
        source.role === "examiner"
          ? groups.find((g) => g.some((s) => s.examinerId === source.npcId))
          : null;
      if (group && source.npcId !== group[0].examinerId) continue;
      const npc =
        group?.length > 1
          ? { ...source, displayName: "Экзаменатор", subject: "Выбор темы" }
          : source;
      npcIds.add(npc.npcId);
      let actor = this.npcs.get(npc.npcId);
      const currentRoom = roomById(this.locationId);
      if (!actor) {
        const initialYaw = currentRoom ? 0 : npc.yawRad;
        const root = this.createActor("npc:" + npc.npcId, npc.displayName);
        root.rotation.y = initialYaw;
        actor = {
          id: npc.npcId,
          name: npc.displayName,
          title: npc.subject,
          role: npc.role,
          root,
          buffer: new SnapshotBuffer(),
          baseYaw: initialYaw,
        };
        this.npcs.set(npc.npcId, actor);
        this.hydrateActors();
        this.localArt?.applyActors();
      }
      if (currentRoom) {
        actor.baseYaw = 0;
        if (npc.npcId === currentRoom.teacherId) {
          if (!actor.visualPatrol || this.adapter.isMock)
            actor.root.position.set(
              currentRoom.teacherPosition.x,
              currentRoom.teacherPosition.y,
              currentRoom.teacherPosition.z,
            );
          actor.root.visible = true;
        } else if (npc.role === "examiner") {
          if (!actor.visualPatrol || this.adapter.isMock)
            actor.root.position.set(
              currentRoom.examinerPosition.x,
              currentRoom.examinerPosition.y,
              currentRoom.examinerPosition.z,
            );
          actor.root.visible = true;
        } else {
          if (!actor.visualPatrol || this.adapter.isMock)
            actor.root.position.set(
              npc.position.x,
              npc.position.y,
              npc.position.z,
            );
          actor.root.visible = false;
        }
      } else {
        actor.baseYaw = npc.yawRad;
        if (
          !actor.buffer.frames.length ||
          actor.root.position.distanceTo(
            new THREE.Vector3(npc.position.x, npc.position.y, npc.position.z),
          ) > 8
        ) {
          actor.buffer = new SnapshotBuffer();
          actor.root.position.set(
            npc.position.x,
            npc.position.y,
            npc.position.z,
          );
          actor.root.rotation.y = npc.yawRad;
        }
        actor.root.visible =
          npc.role !== "teacher" || npc.npcId === "npc-guide";
      }
      actor.buffer.push(
        [npc.position.x, npc.position.y, npc.position.z],
        npc.yawRad,
        performance.now(),
        p.tick,
      );
      actor.state = npc.state;
      if (!this.adapter.isMock && npc.state === "idle") {
        const visualPosition = currentRoom
          ? npc.npcId === currentRoom.teacherId
            ? currentRoom.teacherPosition
            : npc.role === "examiner"
              ? currentRoom.examinerPosition
              : npc.position
          : npc.position;
        this.ensureNpcVisualPatrol(actor, npc, currentRoom, visualPosition);
      } else {
        actor.visualPatrol = null;
        actor.visualPatrolKey = null;
      }
      actor.root.userData.npcProfile = {
        npcId: npc.npcId,
        role: npc.role,
        moduleId: npc.moduleId,
      };
      actor.role = npc.role;
      actor.moduleId = npc.moduleId;
      actor.state = npc.state;
      actor.name = npc.displayName;
      actor.title = npc.subject;
    }
    for (const [id, npc] of this.npcs)
      if (!npcIds.has(id)) {
        this.removeActor("npc:" + id, npc.root);
        this.npcs.delete(id);
      }
    if (this.resources.assets) this.hydrateActors();
  }
  ensureNpcVisualPatrol(actor, npc, room, anchor) {
    const key = `${room?.roomId || "hub"}:${npc.role}:${npc.npcId}`;
    if (actor.visualPatrolKey === key) return;
    let points;
    if (room && npc.npcId === room.teacherId) {
      points = room.teacherRoute.map(([x, z]) => ({
        x: room.center.x + x,
        z: room.center.z + z,
      }));
    } else if (room && npc.role === "examiner") {
      points = room.examinerRoute.map(([x, z]) => ({
        x: room.center.x + x,
        z: room.center.z + z,
      }));
    } else {
      // Hall NPCs follow broad, asymmetric paths instead of circling one spot.
      const radius = npc.npcId === "npc-guide" ? 4.1 : 2.8;
      const clampX = (x) => Math.max(68.5, Math.min(91.5, x));
      const clampZ = (z) => Math.max(69.5, Math.min(91.5, z));
      points = [
        [0, 0],
        [0.58, -0.82],
        [1.05, -0.12],
        [0.62, 0.88],
        [-0.22, 1.06],
        [-1.02, 0.54],
        [-0.88, -0.48],
      ].map(([x, z]) => ({
        x: clampX(anchor.x + x * radius),
        z: clampZ(anchor.z + z * radius),
      }));
    }
    const phase = actorPhase(npc.npcId);
    actor.visualPatrol = new NpcVisualPatrol(points, {
      speed: 0.68 + phase * 0.3,
      phase,
      initialPause: 0.35 + actorPhase(`${npc.npcId}:start`) * 1.25,
      pause: 1.05 + actorPhase(`${npc.npcId}:pause`) * 1.35,
    });
    actor.visualPatrolKey = key;
  }
  applyPublicConfig(doc) {
    this.configs.revision = doc.revision;
    this.configs.world = doc.values.world;
    this.configs.character = doc.values.character;
    this.configs.firstPerson = doc.values.firstPersonDefaults;
    this.configs.gameplay = doc.values.gameplay;
    this.configs.readingRoom = doc.values.readingRoom;
    this.adapter.publicConfig = doc;
    this.applyWorld();
  }
  bindInput() {
    const signal = this.abort.signal;
    const canvas = this.renderer.domElement;

    window.addEventListener(
      "keydown",
      (e) => {
        if (
          this.inputBlocked ||
          e.target.closest?.("input,select,textarea,[contenteditable=true]") ||
          (document.pointerLockElement !== canvas &&
            document.activeElement !== canvas)
        )
          return;
        if (
          [
            "KeyW",
            "KeyA",
            "KeyS",
            "KeyD",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "ShiftLeft",
            "ShiftRight",
          ].includes(e.code)
        ) {
          e.preventDefault();
          // Consume physical WASD keys before page/extension shortcuts such as D.
          e.stopImmediatePropagation();
          this.keys.add(e.code);
          this.walkTarget = null;
        }
      },
      { signal, capture: true },
    );
    window.addEventListener(
      "keyup",
      (e) => {
        if (this.keys.delete(e.code)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { signal, capture: true },
    );
    window.addEventListener("blur", () => this.keys.clear(), { signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        this.keys.clear();
        this.inputTimer = 0;
      },
      { signal },
    );
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), {
      signal,
    });
    canvas.addEventListener(
      "click",
      () => {
        if (!this.inputBlocked) {
          canvas.focus?.();
          canvas.requestPointerLock?.()?.catch?.(() => {});
        }
      },
      { signal },
    );
    document.addEventListener(
      "mousemove",
      (e) => {
        if (document.pointerLockElement !== canvas) return;
        const cfg = this.configs.firstPerson;
        this.yaw =
          THREE.MathUtils.euclideanModulo(
            this.yaw - e.movementX * 0.002 * cfg.mouseSensitivity + Math.PI,
            Math.PI * 2,
          ) - Math.PI;
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - e.movementY * 0.002 * cfg.mouseSensitivity,
          cfg.pitchMinRad,
          cfg.pitchMaxRad,
        );
      },
      { signal },
    );
    document.addEventListener(
      "pointerlockchange",
      () => {
        this.keys.clear();
      },
      { signal },
    );
  }
  syncTableLabels() {
    for (const t of this.configs.gameplay.competition.tables) {
      const present = this.resources.interest?.chunks.some(
        (c) =>
          c.x === Math.floor(t.position.x / 32) &&
          c.z === Math.floor(t.position.z / 32),
      );
      if (present && !this.tableLabels.has(t.tableId)) {
        const count = t.seats.length;
        const label = nameTag(
          `Соревнование · ${count} ${count < 5 ? "места" : "мест"}`,
        );
        label.position.set(t.position.x, 2.4, t.position.z);
        this.scene.add(label);
        this.tableLabels.set(t.tableId, label);
      }
      if (!present && this.tableLabels.has(t.tableId)) {
        disposeObject(this.tableLabels.get(t.tableId));
        this.tableLabels.delete(t.tableId);
      }
    }
  }
  getAimedTable() {
    if (this.activity.mode !== "exploring" || this.locationId !== ACADEMY_HUB)
      return null;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    for (const t of this.configs.gameplay.competition.tables) {
      const offset = new THREE.Vector3(t.position.x, 0.9, t.position.z).sub(
          this.camera.position,
        ),
        distance = Math.hypot(
          t.position.x - this.authoritative.x,
          t.position.z - this.authoritative.z,
        );
      if (
        distance <= t.interactionRadiusM &&
        offset.normalize().dot(direction) > 0.72 &&
        this.tableLabels.has(t.tableId)
      )
        return {
          ...t,
          summary: this.tables?.find((s) => s.tableId === t.tableId),
        };
    }
    return null;
  }

  setBlocked(value, owner = "legacy") {
    this.inputOwners ||= new Set();
    if (value) this.inputOwners.add(owner);
    else this.inputOwners.delete(owner);
    this.inputBlocked = this.inputOwners.size > 0;
    this.keys.clear();
    if (this.inputBlocked) {
      this.walkTarget = null;
      document.exitPointerLock?.();
      this.adapter.sendInput([0, 0], this.yaw);
    }
  }
  focusControls() {
    this.keys.clear();
    if (!this.inputBlocked)
      this.renderer.domElement.focus({ preventScroll: true });
  }
  approachNPC(id) {
    const npc = this.npcs.get(id);
    if (npc) {
      this.yaw = Math.atan2(
        this.player.position.x - npc.root.position.x,
        this.player.position.z - npc.root.position.z,
      );
      this.pitch = 0;
      this.walkTarget = null;
    } else
      this.onError("Собеседник появится после загрузки текущего interest.");
  }
  syncReadingLabels() {
    for (const label of this.readingLabels.values()) disposeObject(label);
    this.readingLabels.clear();
    const labelledShelves = new Set();
    for (const object of this.readingObjects()) {
      if (object.kind === "shelf") {
        if (labelledShelves.has(object.shelf.shelfId)) continue;
        labelledShelves.add(object.shelf.shelfId);
      }
      const station = this.configs.gameplay.education.stations.find(
        (s) => s.moduleId === object.notebook?.moduleId,
      );
      const name =
        object.kind === "notebook"
          ? "Проверка · " +
            ({
              "math-basics": "Математика",
              "informatics-basics": "Информатика",
              "history-basics": "История",
              "flags-demo": "Страны и флаги",
            }[station?.moduleId] || "")
          : object.name;
      const tag = nameTag(name);
      tag.position.set(
        object.position.x,
        object.kind === "shelf" ? 1.85 * (object.scale ?? 1) + 0.35 : 1.12,
        object.position.z,
      );
      this.scene.add(tag);
      this.readingLabels.set(object.id, tag);
    }
  }
  readingObjects() {
    const current = roomById(this.locationId);
    if (current) {
      const shelf = this.configs.readingRoom?.shelves.find((s) =>
        s.bookIds.includes(`book-${current.moduleId}`),
      );
      return [
        {
          id: `notebook-${current.moduleId}`,
          kind: "notebook",
          name: `Проверка · ${current.subject}`,
          position: current.notebook,
          notebook: {
            moduleId: current.moduleId,
            examinerId: current.examinerId,
          },
        },
        ...(shelf
          ? [
              {
                id: shelf.shelfId,
                kind: "shelf",
                name: `Полка · ${current.subject}`,
                position: {
                  x: current.center.x - 4.75,
                  y: 0,
                  z: current.center.z + 1,
                },
                shelf,
              },
            ]
          : []),
      ];
    }
    const room = this.configs.readingRoom;
    if (!room) return [];
    const kinds = new Map([
      ...room.shelves.map((s) => [
        s.shelfId,
        {
          kind: "shelf",
          name:
            "Полка · " +
            {
              mathematics: "Математика",
              informatics: "Информатика",
              history: "История",
              geography_flags: "Страны и флаги",
            }[s.subject],
          shelf: s,
        },
      ]),
      ...room.notebooks.map((n) => [
        n.notebookId,
        { kind: "notebook", name: "Тетрадь · " + n.moduleId, notebook: n },
      ]),
    ]);
    return [...this.resources.roots.values()]
      .flatMap((c) => c.roots)
      .map((root) => root.userData.placement)
      .filter(Boolean)
      .flatMap((o) => {
        const shelf = room.shelves.find((s) => matchesShelf(o, s.shelfId));
        const kind = kinds.get(shelf?.shelfId ?? o.id);
        return kind ? [{ ...o, ...kind }] : [];
      });
  }
  getNearby() {
    const maxDist = Math.max(
      3.5,
      this.configs?.character?.interactionRadiusM || 3.0,
    );
    const room = roomById(this.locationId);
    const camDir = this.camera.getWorldDirection(new THREE.Vector3());
    const portal = room
      ? {
          id: "exit-" + room.roomId,
          kind: "door",
          roomId: ACADEMY_HUB,
          name: "Выход в читальный зал",
          position: room.exit,
        }
      : ACADEMY_ROOMS.map((item) => ({
          id: "door-" + item.roomId,
          kind: "door",
          roomId: item.roomId,
          name: item.title,
          position: item.door,
        })).find(
          (item) =>
            Math.hypot(
              item.position.x - this.player.position.x,
              item.position.z - this.player.position.z,
            ) <= maxDist,
        );
    if (portal) {
      const distance = Math.hypot(
        portal.position.x - this.player.position.x,
        portal.position.z - this.player.position.z,
      );
      const toDoor2D = new THREE.Vector2(
        portal.position.x - this.player.position.x,
        portal.position.z - this.player.position.z,
      ).normalize();
      const camDir2D = new THREE.Vector2(camDir.x, camDir.z).normalize();
      const dot = toDoor2D.dot(camDir2D);
      if (distance <= maxDist && (dot > 0.2 || distance < 2.2))
        return { ...portal, distance };
    }
    let nearest = null;
    for (const npc of this.npcs.values()) {
      if (!npc.root.visible) continue;
      const distance = Math.hypot(
        npc.root.position.x - this.player.position.x,
        npc.root.position.z - this.player.position.z,
      );
      if (distance > maxDist) continue;
      const toward = npc.root.position
        .clone()
        .add(new THREE.Vector3(0, 1, 0))
        .sub(this.camera.position)
        .normalize();
      const aimed = toward.dot(camDir) > 0.35 || distance < 2.0;
      if (aimed && (!nearest || distance < nearest.distance))
        nearest = {
          id: npc.id,
          name: npc.name,
          title: npc.title,
          role: npc.role,
          moduleId: npc.moduleId,
          distance,
        };
    }
    for (const object of this.readingObjects()) {
      const point =
        object.kind === "shelf"
          ? closestShelfPoint(object, this.player.position)
          : object.position;
      const distance = Math.hypot(
        point.x - this.player.position.x,
        point.z - this.player.position.z,
      );
      if (distance > maxDist) continue;
      const pos = new THREE.Vector3(
        point.x,
        object.kind === "shelf" ? 1.5 : 0.95,
        point.z,
      );
      const aimed =
        pos.sub(this.camera.position).normalize().dot(camDir) > 0.35 ||
        distance < 2.0;
      if (aimed && (!nearest || distance < nearest.distance))
        nearest = { ...object, distance };
    }
    return nearest;
  }
  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  applyRender() {
    const c = this.configs.render;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, c.pixelRatio));
    this.renderer.shadowMap.enabled = c.shadows;
    this.renderer.toneMappingExposure = c.exposure;
    this.camera.far = c.drawDistanceM + 70;
    this.camera.updateProjectionMatrix();
    this.scene.traverse((node) => {
      for (const mat of Array.isArray(node.material)
        ? node.material
        : node.material
          ? [node.material]
          : []) {
        if (mat.isMeshStandardMaterial) {
          const flat = this.configs.characterVisual.materialStyle === "flat";
          if (mat.flatShading !== flat) {
            mat.flatShading = flat;
            mat.needsUpdate = true;
          }
        }
      }
    });
    this.resize();
    this.applyWorld();
  }
  applyWorld() {
    const c = this.configs.world;
    const room = roomById(this.locationId);
    const focus = room?.center || { x: 80, z: 80 };
    const day = Math.max(
      0.12,
      Math.sin(((c.timeOfDayHours - 6) / 12) * Math.PI),
    );
    const sky = new THREE.Color().lerpColors(
      new THREE.Color("#263944"),
      new THREE.Color("#dce5df"),
      day,
    );
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.scene.fog.near =
      this.distance * 0.65 +
      this.configs.render.drawDistanceM * (c.weather === "clear" ? 0.4 : 0.2);
    this.scene.fog.far =
      this.distance + this.configs.render.drawDistanceM * 0.75;
    this.ambient.intensity = room?.lighting.ambient ?? 1.7;
    this.sun.intensity = room?.lighting.sun ?? 0.7 + day * 1.1;
    this.sun.position.set(
      focus.x + Math.cos((c.timeOfDayHours / 24) * Math.PI * 2) * 35,
      12 + day * 35,
      focus.z + 25,
    );
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.target.updateMatrixWorld();
    this.academyArt?.setLocation(this.locationId, this.authoritative);
    for (const { roots } of this.resources?.roots.values() || [])
      roots.forEach(
        (root) =>
          (root.visible =
            !root.userData.presentationHidden &&
            this.modelsVisible !== false &&
            this.locationId === ACADEMY_HUB),
      );
    this.scene.traverse((node) => {
      if (node.name.startsWith("lod-far")) node.visible = false;
      if (node.name.startsWith("decor-"))
        node.visible =
          Number(node.name.slice(6)) % 32 < Math.round(c.decorDensity * 32);
    });
  }
  applyCharacter() {
    const c = this.configs.characterVisual;
    for (const root of this.actors.values()) {
      root.scale.setScalar(c.modelScale);
      root.userData.tag.visible = c.showNames;
    }
  }
  animate(now) {
    if (this.disposed) return;
    const elapsed = (now - this.last) / 1000,
      dt = Math.min(elapsed, 0.05);
    this.last = now;
    this.frame = requestAnimationFrame((t) => this.animate(t));
    if (document.hidden) return;
    let x = 0,
      z = 0;
    if (
      !this.inputBlocked &&
      !document.activeElement?.closest?.(
        "input,select,textarea,[contenteditable=true]",
      ) &&
      this.activity.mode === "exploring" &&
      this.adapter.ready
    ) {
      x =
        Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
        Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
      z =
        Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
        Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
      const rotated = x * Math.cos(this.yaw) + z * Math.sin(this.yaw);
      z = -x * Math.sin(this.yaw) + z * Math.cos(this.yaw);
      x = rotated;
      if (!x && !z && this.walkTarget) {
        const dir = this.walkTarget.clone().sub(this.authoritative);
        if (dir.length() < 0.35) this.walkTarget = null;
        else {
          x = dir.x;
          z = dir.z;
        }
      }
    }
    const length = Math.hypot(x, z);
    const running = Boolean(
      this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
    );
    const currentRoom = roomById(this.locationId);
    if (length) {
      x /= length;
      z /= length;
      this.heading = Math.atan2(x, z);
      const speed = running
        ? this.configs.character.walkSpeedMps *
          this.configs.character.runMultiplier
        : this.configs.character.walkSpeedMps;
      const originX = this.authoritative.x;
      const originZ = this.authoritative.z;
      const nextX = originX + x * speed * dt;
      const nextZ = originZ + z * speed * dt;
      if (currentRoom) {
        const b = currentRoom.bounds;
        const nextRoomX = Math.max(
          b.minX + PLAYER_RADIUS,
          Math.min(b.maxX - PLAYER_RADIUS, nextX),
        );
        let acceptedX = originX;
        if (
          !currentRoom.colliders.some((col) =>
            blocksColliderMove(nextRoomX, originZ, originX, originZ, col),
          )
        )
          acceptedX = nextRoomX;
        const atDoor =
          Math.abs(originX - currentRoom.door.x) < 1.05 &&
          this.academyArt?.canPass(currentRoom, this.authoritative);
        const roomMaxZ = b.maxZ - PLAYER_RADIUS;
        const exitMaxZ = atDoor ? b.maxZ + 0.5 : roomMaxZ;
        const nextRoomZ = Math.max(
          b.minZ + PLAYER_RADIUS,
          Math.min(exitMaxZ, nextZ),
        );
        let acceptedZ = originZ;
        if (
          !currentRoom.colliders.some((col) =>
            blocksColliderMove(acceptedX, nextRoomZ, acceptedX, originZ, col),
          )
        )
          acceptedZ = nextRoomZ;
        this.authoritative.set(acceptedX, this.authoritative.y, acceptedZ);
        const travelled = Math.max(speed * dt, 1e-6);
        x = (acceptedX - originX) / travelled;
        z = (acceptedZ - originZ) / travelled;
      } else {
        if (this.locationId === ACADEMY_HUB) {
          const blocked = (x, z, fromX, fromZ) =>
            this.shelfColliders.some((box) =>
              blocksColliderMove(x, z, fromX, fromZ, box),
            ) ||
            this.hallWallColliders.some((box) =>
              blocksColliderMove(x, z, fromX, fromZ, box),
            );
          const tryX = originX + x * speed * dt;
          if (!blocked(tryX, originZ, originX, originZ))
            this.authoritative.x = Math.max(0.5, Math.min(319.5, tryX));
          const tryZ = originZ + z * speed * dt;
          const crossedDoorPlane =
            (originZ - HALL_DOOR_WALL_Z) * (tryZ - HALL_DOOR_WALL_Z) <= 0;
          const door = ACADEMY_ROOMS.find(
            (room) => Math.abs(this.authoritative.x - room.door.x) < 1.05,
          );
          const doorClosed =
            crossedDoorPlane &&
            door &&
            !this.academyArt?.canPass(door, this.authoritative);
          if (
            !doorClosed &&
            !blocked(this.authoritative.x, tryZ, this.authoritative.x, originZ)
          )
            this.authoritative.z = Math.max(0.5, Math.min(319.5, tryZ));
          const travelled = Math.max(speed * dt, 1e-6);
          x = (this.authoritative.x - originX) / travelled;
          z = (this.authoritative.z - originZ) / travelled;
        } else {
          this.authoritative.x = Math.max(
            0.5,
            Math.min(319.5, originX + x * speed * dt),
          );
          this.authoritative.z = Math.max(
            0.5,
            Math.min(319.5, originZ + z * speed * dt),
          );
        }
      }
    }
    this.updateLocationFromPosition();
    this.updateZoneRendering(dt);
    this.inputTimer += dt;
    if (this.inputTimer >= 0.05) {
      this.inputTimer %= 0.05;
      this.adapter.sendInput([x, z], this.yaw, running);
    }
    this.player.position.lerp(this.authoritative, 1 - Math.exp(-18 * dt));
    this.player.rotation.y = this.heading;
    this.academyArt?.updateDoors(
      this.authoritative,
      dt,
      this.sharedPlayerPositions,
    );
    this.competitionArt?.update(dt);
    for (const npc of this.npcs.values()) {
      const root = npc.root,
        pose = npc.buffer.sample(now);
      const dialogTarget = this.localDialogNpcIds.has(npc.id)
        ? { x: this.authoritative.x, z: this.authoritative.z }
        : this.dialogTargets.get(npc.id);
      const previous = root.position.clone();
      const patrolClock =
        this.serverTime + (now - this.serverTimeReceivedAt) / 1000;
      const localPatrol =
        !this.adapter.isMock && npc.state === "idle" && npc.visualPatrol;
      const patrolPose = localPatrol
        ? localPatrol.sample(
            patrolClock,
          )
        : null;
      if (localPatrol) {
        if (dialogTarget && !npc.dialogFrozen) {
          localPatrol.freeze(patrolClock);
          npc.dialogFrozen = true;
        } else if (!dialogTarget && npc.dialogFrozen) {
          localPatrol.resume(patrolClock);
          npc.dialogFrozen = false;
        }
      }
      if (dialogTarget) {
        if (!npc.dialogAnchor) npc.dialogAnchor = root.position.clone();
        root.position.copy(npc.dialogAnchor);
      } else if (localPatrol) {
        npc.dialogAnchor = null;
        if (patrolPose) root.position.copy(patrolPose.position);
      } else if (pose && (this.adapter.isMock || npc.state !== "idle")) {
        npc.dialogAnchor = null;
        root.position.fromArray(pose.position);
      }
      const measuredSpeed =
        dt > 0 ? Math.min(2, previous.distanceTo(root.position) / dt) : 0;
      root.userData.moveSpeed = THREE.MathUtils.damp(
        root.userData.moveSpeed || 0,
        measuredSpeed,
        measuredSpeed > (root.userData.moveSpeed || 0) ? 9 : 5,
        dt,
      );
      let target;
      if (dialogTarget) {
        target = Math.atan2(
          dialogTarget.x - root.position.x,
          dialogTarget.z - root.position.z,
        );
      } else if (patrolPose?.state === "walking") {
        target = patrolPose.heading;
      } else {
        target = pose?.heading ?? npc.baseYaw ?? root.rotation.y;
      }
      const dx = this.player.position.x - root.position.x,
        dz = this.player.position.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (
        !dialogTarget &&
        npc.state !== "walking" &&
        patrolPose?.state !== "walking" &&
        dist <= 3.8 &&
        ["teacher", "examiner"].includes(npc.role) &&
        npc.id !== "npc-guide"
      ) {
        target = Math.atan2(dx, dz);
      }
      const difference = Math.atan2(
        Math.sin(target - root.rotation.y),
        Math.cos(target - root.rotation.y),
      );
      root.rotation.y += difference * (1 - Math.exp(-6 * dt));
    }
    const ambientClock =
      this.serverTime + (now - this.serverTimeReceivedAt) / 1000;
    for (const [id, root] of this.ambientStudents) {
      const visible = this.locationId === ACADEMY_HUB;
      root.visible = visible;
      if (!visible) continue;
      const previous = root.position.clone();
      const motion = root.userData.visualPatrol.sample(ambientClock);
      if (motion) {
        root.position.copy(motion.position);
        const delta = Math.atan2(
          Math.sin(motion.heading - root.rotation.y),
          Math.cos(motion.heading - root.rotation.y),
        );
        root.rotation.y += delta * (1 - Math.exp(-5 * dt));
        const measured =
          dt > 0 ? Math.min(1.5, previous.distanceTo(root.position) / dt) : 0;
        root.userData.moveSpeed = THREE.MathUtils.damp(
          root.userData.moveSpeed || 0,
          measured,
          measured > (root.userData.moveSpeed || 0) ? 8 : 4,
          dt,
        );
      }
    }
    for (const other of this.others.values()) {
      const pose = other.buffer.sample(now);
      if (pose) {
        const previous = other.root.position.clone();
        other.root.position.fromArray(pose.position);
        const measured =
          dt > 0
            ? Math.min(6, previous.distanceTo(other.root.position) / dt)
            : 0;
        other.root.userData.moveSpeed = THREE.MathUtils.damp(
          other.root.userData.moveSpeed || 0,
          measured,
          measured > (other.root.userData.moveSpeed || 0) ? 10 : 5,
          dt,
        );
        const target = pose.heading + Math.PI;
        const difference = Math.atan2(
          Math.sin(target - other.root.rotation.y),
          Math.cos(target - other.root.rotation.y),
        );
        other.root.rotation.y += difference * (1 - Math.exp(-6 * dt));
      }
    }
    {
      for (const [id, actor] of this.actors) {
        const body = actor.userData.body;
        if (!body && !actor.userData.localArt) continue;
        const seated = actor.userData.seated;
        const moving =
          id === "self" ? length : actor.userData.moveSpeed > 0.025;
        if (
          this.localArt?.updateActor(
            actor,
            seated ? "sitting" : moving ? "walking" : "idle",
            dt * this.configs.characterVisual.animationRate,
            actor.userData.moveSpeed || 0,
          )
        ) {
          actor.userData.tag.position.y = seated ? 2.1 : 2.55;
          continue;
        }
        if (
          actor.userData.mixer &&
          !actor.userData.seated &&
          this.configs.render.animationEnabled
        ) {
          actor.userData.mixer.update(
            dt * this.configs.characterVisual.animationRate,
          );
          continue;
        }
        if (body) {
          body.position.y = seated ? -0.4 : 0;
          for (const [index, name] of ["left_leg", "right_leg"].entries()) {
            const leg = body.getObjectByName(name);
            if (leg) {
              leg.position.y = seated ? 0.85 : 0.44;
              leg.position.z = seated ? -0.28 : 0;
              leg.rotation.x = seated
                ? -Math.PI / 2
                : moving && this.configs.render.animationEnabled
                  ? Math.sin(
                      now * 0.009 * this.configs.characterVisual.animationRate +
                        index * Math.PI,
                    ) * 0.35
                  : 0;
            }
          }
        }
        actor.userData.tag.position.y = seated ? 2.1 : 2.55;
      }
    }
    const eye = this.activity.mode.startsWith("seated_")
      ? this.configs.firstPerson.seatedEyeHeightM
      : this.configs.firstPerson.standingEyeHeightM;
    const eyePosition = this.player.position
      .clone()
      .add(new THREE.Vector3(0, eye, 0));
    if (!this.cameraInitialized) {
      this.camera.position.copy(eyePosition);
      this.cameraInitialized = true;
    }
    const duration = this.configs.firstPerson.seatTransitionMs;
    this.camera.position.lerp(
      eyePosition,
      duration && now < this.seatTransitionUntil
        ? 1 - Math.exp((-dt * 5000) / duration)
        : 1,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.player.visible = false;
    this.statsTimer += dt;
    this.metricsTimer += dt;
    this.frames++;
    this.frameTime += elapsed;
    this.currentFrameTimeMs = Math.round(elapsed * 1000 * 10) / 10;
    this.frameDeltas.push(elapsed);
    if (this.frameDeltas.length > 120) this.frameDeltas.shift();
    if (this.statsTimer > 0.4) {
      this.fps = Math.round(this.frames / this.frameTime);
      if (this.frameDeltas.length > 10) {
        const sorted = [...this.frameDeltas].sort((a, b) => a - b);
        const idx = Math.floor(sorted.length * 0.99);
        const worstDelta = sorted[Math.min(idx, sorted.length - 1)];
        this.fpsLow1Pct =
          worstDelta > 0 ? Math.round(1 / worstDelta) : this.fps;
      }
      const r = this.resources.metrics;
      const net = this.adapter.getNetworkStats?.() || {};
      this.onUpdate({
        fps: this.fps,
        fpsLow1Pct: this.fpsLow1Pct,
        frameTimeMs: this.currentFrameTimeMs,
        pingRttMs: net.pingRttMs || 0,
        jitterMs: net.jitterMs || 0,
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        position: this.player.position.toArray(),
        players: this.others.size + 1,
        ...r,
        cacheLimit: r.budget,
        active: r.resident - r.cache,
        nearest: this.getNearby(),
        locationId: this.locationId,
        table: this.getAimedTable(),
        activity: this.activity,
        error: this.loadError,
        ready: this.adapter.ready,
        sessionStatus: this.adapter.sessionStatus,
      });
      this.statsTimer = 0;
      this.frames = 0;
      this.frameTime = 0;
      this.scene.traverse((node) => {
        if (
          node.name.startsWith("lod-near") ||
          node.name.startsWith("lod-far")
        ) {
          const far =
            node
              .getWorldPosition(new THREE.Vector3())
              .distanceTo(this.camera.position) > 48;
          node.visible = !this.configs.render.lod
            ? node.name.startsWith("lod-near")
            : node.name.startsWith(far ? "lod-far" : "lod-near");
        }
      });
      for (const [id, label] of this.tableLabels) {
        const table = this.configs.gameplay.competition.tables.find(
          (t) => t.tableId === id,
        );
        label.visible =
          this.locationId === ACADEMY_HUB &&
          this.activity.mode === "exploring" &&
          Math.hypot(
            this.player.position.x - table.position.x,
            this.player.position.z - table.position.z,
          ) > 4;
      }
      for (const root of this.actors.values())
        root.userData.tag.visible =
          this.configs.characterVisual.showNames &&
          (!this.configs.render.lod ||
            root.position.distanceTo(this.camera.position) < 65);
    }
    if (this.metricsTimer >= 1 && this.adapter.interest) {
      this.metricsTimer %= 1;
      const r = this.resources.metrics;
      this.adapter.send(
        command("client.metrics", {
          residentBytes: r.resident,
          reservedBytes: r.reserved,
          budgetBytes: r.budget,
          fps: Math.min(240, Math.max(0, this.fps || 0)),
        }),
      );
      const net = this.adapter.getNetworkStats?.() || {};
      const heapBytes =
        (typeof performance !== "undefined" &&
          performance.memory?.usedJSHeapSize) ||
        0;
      this.adapter.sendClientTelemetry?.({
        fps: Math.min(240, Math.max(0, this.fps || 0)),
        fpsLow1Pct: Math.min(240, Math.max(0, this.fpsLow1Pct || 0)),
        frameTimeMs: this.currentFrameTimeMs || 16.6,
        pingRttMs: net.pingRttMs || 0,
        jitterMs: net.jitterMs || 0,
        renderedEntities: this.actors.size + (this.others.size || 0),
        activeDrawCalls: this.renderer.info.render.calls || 0,
        triangles: this.renderer.info.render.triangles || 0,
        heapMemoryMb: Math.round((heapBytes / 1048576) * 10) / 10,
        uptimeSec: net.uptimeSec || 0,
        rxBitrateKbps: net.rxKbps || 0,
        txBitrateKbps: net.txKbps || 0,
        locationId: this.locationId || "reading-room-main",
      });
      if (r.physical > 200 * 1048576 && this.renderer.getPixelRatio() > 0.75) {
        this.renderer.setPixelRatio(0.75);
        this.onError("Снижено разрешение: давление на память ресурсов.");
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.unsub();
    this.unsubStatus();
    this.disposeUI?.();
    for (const label of this.readingLabels.values()) disposeObject(label);
    this.readingLabels.clear();
    for (const label of this.tableLabels.values()) disposeObject(label);
    this.tableLabels.clear();
    this.adapter.close();
    await this.resources.dispose();
    this.localArt?.dispose();
    this.academyArt?.dispose();
    this.competitionArt?.dispose();
    for (const [id, actor] of this.actors) this.removeActor(id, actor);
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
