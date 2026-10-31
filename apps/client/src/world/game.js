import * as THREE from "three";
import { WorldResources, disposeObject, detachInstance } from "./resources.js";
import { nameTag } from "./visuals.js";
import { selectNpcAppearance } from "./npc-appearance.js";
import { SnapshotBuffer } from "../network/interpolation.js";
import { examinerGroups } from "../gameplay/education.js";
import { command } from "../network/protocol.js";
import { ACADEMY_HUB, ACADEMY_ROOMS, roomById } from "./academy-locations.js";
import { AcademyArt } from "./academy-art.js";
export class Game {
  constructor(container, adapter, configs, onUpdate, onError) {
    this.container = container;
    this.adapter = adapter;
    this.configs = configs;
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.keys = new Set();
    this.others = new Map();
    this.npcs = new Map();
    this.actors = new Map();
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
    this.lastTick = -1;
    this.yaw = 0;
    this.pitch = 0;
    this.activity = { mode: "exploring", targetId: null, seatId: null };
    this.tableLabels = new Map();
    this.readingLabels = new Map();
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
    this.player = this.createActor("self", "Вы");
    this.player.position.copy(this.authoritative);
    this.player.visible = false;
    this.resources = new WorldResources(adapter, this.scene, {
      beforeChange: () => this.clearModels(),
      onLoaded: () => {
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
    this.chunks = this.resources;
    this.unsub = adapter.onEvent((event) => this.onEvent(event));
    this.unsubStatus = adapter.onStatus((status) => {
      if (status === "connected") {
        this.lastTick = -1;
        for (const other of this.others.values())
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
    root.userData = { tag, body: null, modelId: null };
    this.scene.add(root);
    this.actors.set(id, root);
    return root;
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
      const id = owner.startsWith("npc:")
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
      const body = this.resources.instantiate(id, "actor:" + owner);
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
      } else if (this.resources.assets && !this.missingModelWarned) {
        this.missingModelWarned = true;
        this.onError(
          "Выбранная модель недоступна в текущем interest. Выберите разрешённую модель.",
        );
      }
    }
    this.localArt?.applyActors();
    this.applyCharacter();
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
    await this.adapter.enterLocation(roomId);
    this.locationId = roomId;
    this.academyArt.setLocation(roomId);
    const room = roomById(roomId);
    const at = room ? room.entry : ACADEMY_ROOMS.find((item) =>
      Math.hypot(this.authoritative.x - item.hubReturn.x, this.authoritative.z - item.hubReturn.z) < 3
    )?.hubReturn;
    if (at) {
      this.authoritative.set(at.x, 0, at.z);
      this.player.position.copy(this.authoritative);
      this.camera.position.set(at.x, this.configs.firstPerson.standingEyeHeightM, at.z);
    }
    this.yaw = room ? 0 : Math.PI;
    this.pitch = 0;
    this.keys.clear();
    this.walkTarget = null;
    document.exitPointerLock?.();
    this.syncReadingLabels();
    this.applyWorld();
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
      }
      this.lastTick = -1;
      return;
    }
    if (event.type === "world.interest") {
      this.loadError = null;
      this.resources.accept(p);
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
    this.syncTableLabels();
    const ids = new Set();
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
        this.others.set(player.playerId, other);
      }
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
      if (!actor) {
        actor = {
          id: npc.npcId,
          name: npc.displayName,
          title: npc.subject,
          root: this.createActor("npc:" + npc.npcId, npc.displayName),
        };
        this.npcs.set(npc.npcId, actor);
      }
      actor.root.position.set(npc.position.x, npc.position.y, npc.position.z);
      actor.root.rotation.y = npc.yawRad;
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
          e.target.closest?.("input,select,textarea,button") ||
          this.inputBlocked
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
          ].includes(e.code)
        ) {
          e.preventDefault();
          this.keys.add(e.code);
          this.walkTarget = null;
        }
      },
      { signal },
    );
    window.addEventListener("keyup", (e) => this.keys.delete(e.code), {
      signal,
    });
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
        if (!this.inputBlocked)
          canvas.requestPointerLock?.()?.catch?.(() => {});
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
        const label = nameTag("Соревнование · 5 мест");
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
    if (this.activity.mode !== "exploring" || this.locationId !== ACADEMY_HUB) return null;
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
    for (const object of this.readingObjects()) {
      const station = this.configs.gameplay.education.stations.find(
        (s) => s.moduleId === object.notebook?.moduleId,
      );
      const name =
        object.kind === "notebook"
          ? "Тетрадь · " +
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
        object.kind === "shelf" ? 2.9 : 1.5,
        object.position.z,
      );
      this.scene.add(tag);
      this.readingLabels.set(object.id, tag);
    }
  }
  readingObjects() {
    const current = roomById(this.locationId);
    if (current) return [{
      id: `notebook-${current.moduleId}`,
      kind: "notebook",
      name: `Тетрадь · ${current.subject}`,
      position: current.notebook,
      notebook: { moduleId: current.moduleId, examinerId: current.examinerId },
    }];
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
      .filter((o) => o && kinds.has(o.id))
      .map((o) => ({ ...o, ...kinds.get(o.id) }));
  }
  getNearby() {
    const room = roomById(this.locationId);
    const portal = room
      ? { id: "exit-" + room.roomId, kind: "door", roomId: ACADEMY_HUB, name: "Выход в читальный зал", position: room.exit }
      : ACADEMY_ROOMS.map((item) => ({ id: "door-" + item.roomId, kind: "door", roomId: item.roomId, name: item.title, position: item.door }))
        .find((item) => Math.hypot(item.position.x - this.player.position.x, item.position.z - this.player.position.z) < 3.2);
    if (portal) {
      const distance = Math.hypot(portal.position.x - this.player.position.x, portal.position.z - this.player.position.z);
      const direction = new THREE.Vector3(portal.position.x, 1.5, portal.position.z)
        .sub(this.camera.position).normalize();
      if (distance <= 3.2 && direction.dot(this.camera.getWorldDirection(new THREE.Vector3())) > 0.45)
        return { ...portal, distance };
    }
    let nearest = null;
    for (const npc of this.npcs.values()) {
      const distance = npc.root.position.distanceTo(this.player.position);
      const toward = npc.root.position
        .clone()
        .add(new THREE.Vector3(0, 1, 0))
        .sub(this.camera.position)
        .normalize();
      const aimed =
        toward.dot(this.camera.getWorldDirection(new THREE.Vector3())) > 0.75;
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
      const pos = new THREE.Vector3(
        object.position.x,
        object.position.y,
        object.position.z,
      );
      const distance = pos.distanceTo(this.player.position);
      pos.y = object.kind === "shelf" ? 1.5 : 0.95;
      const aimed =
        pos
          .sub(this.camera.position)
          .normalize()
          .dot(this.camera.getWorldDirection(new THREE.Vector3())) > 0.65;
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
    this.academyArt?.setLocation(this.locationId);
    for (const { roots } of this.resources?.roots.values() || [])
      roots.forEach((root) => (root.visible = this.modelsVisible !== false && this.locationId === ACADEMY_HUB));
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
      (document.pointerLockElement === this.renderer.domElement ||
        document.activeElement === this.renderer.domElement) &&
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
    if (length) {
      x /= length;
      z /= length;
      this.heading = Math.atan2(x, z);
    }
    this.inputTimer += dt;
    if (this.inputTimer >= 0.05) {
      this.inputTimer %= 0.05;
      this.adapter.sendInput([x, z], this.yaw, false);
    }
    this.player.position.lerp(this.authoritative, 1 - Math.exp(-18 * dt));
    this.player.rotation.y = this.heading;
    for (const npc of this.npcs.values()) {
      const root = npc.root;
      const dx = this.player.position.x - root.position.x;
      const dz = this.player.position.z - root.position.z;
      if (Math.hypot(dx, dz) > 3.2 || npc.role !== "teacher" || npc.id === "npc-guide") continue;
      const target = Math.atan2(dx, dz);
      const difference = Math.atan2(Math.sin(target - root.rotation.y), Math.cos(target - root.rotation.y));
      root.rotation.y += difference * (1 - Math.exp(-3.8 * dt));
    }
    for (const other of this.others.values()) {
      const pose = other.buffer.sample(now);
      if (pose) {
        other.root.position.fromArray(pose.position);
        other.root.rotation.y = pose.heading + Math.PI;
      }
    }
    {
      for (const [id, actor] of this.actors) {
        const body = actor.userData.body;
        if (!body) continue;
        const seated = actor.userData.seated;
        const moving = id === "self" ? length : !id.startsWith("npc:");
        if (
          this.localArt?.updateActor(
            actor,
            seated ? "sitting" : moving ? "walking" : "idle",
            dt * this.configs.characterVisual.animationRate,
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
    if (this.statsTimer > 0.4) {
      this.fps = Math.round(this.frames / this.frameTime);
      const r = this.resources.metrics;
      this.onUpdate({
        fps: this.fps,
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
    for (const [id, actor] of this.actors) this.removeActor(id, actor);
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
