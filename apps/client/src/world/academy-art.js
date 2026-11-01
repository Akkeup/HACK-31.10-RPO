import * as THREE from "three";
import { ACADEMY_HUB, ACADEMY_ROOMS } from "./academy-locations.js";
import { textTexture } from "./visuals.js";

// Art is anchored to the wall surfaces, independently of interaction points.
const HALL_DOOR_WALL_Z = 65.5;
const ROOM_EXIT_WALL_Z = 6.5;

// Local mock scenery. Room IDs and education contracts live in academy-locations;
// this module only creates removable art and never grades or changes state.
export class AcademyArt {
  constructor(scene) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = new Map();
    this.groups = new Map();
    this.textures = new Set();
    this.modelSlots = [];
    this.portals = new THREE.Group();
    scene.add(this.portals);
    for (const x of [67.3, 92.7])
      for (const z of [68, 91])
        this.modelSlots.push({
          key: "planter",
          group: this.portals,
          x,
          z,
          placeholder: [],
        });
    // Leave the door leaves clear instead of running the wall trim across them.
    this.wallSkirting(
      this.portals,
      65.5,
      94.5,
      65.65,
      ACADEMY_ROOMS.map((r) => r.door.x),
      0.76,
      0.79,
      0x9e7954,
      0x6f5a46,
    );
    // Close the unused opening in the back wall instead of showing the white sky.
    this.box(this.portals, 80, 2.15, 94.5, 3.3, 4.3, 0.24, 0xe9dec9);
    this.box(this.portals, 80, 0.38, 94.34, 3.3, 0.76, 0.08, 0x9e7954);
    this.box(this.portals, 80, 0.79, 94.31, 3.3, 0.1, 0.12, 0x6f5a46);
    for (const x of [72, 88])
      for (const z of [83, 88]) {
        const top = this.box(
          this.portals,
          x,
          0.882,
          z,
          2.35,
          0.003,
          1.24,
          0xb99168,
        );
        this.paintDesk(top, "Читальный зал");
      }
    for (let x = -12.8; x <= 12.81; x += 3.2)
      for (let z = -12.8; z <= 12.81; z += 3.2)
        this.modelSlots.push({
          key: "ceiling",
          group: this.portals,
          x: 80 + x,
          y: 4.12,
          z: 80 + z,
          scale: [3.2 / 3, 1, 3.2 / 3],
          placeholder: [],
        });
    for (const room of ACADEMY_ROOMS) {
      this.addPortal(room);
      const group = this.buildRoom(room);
      group.visible = false;
      scene.add(group);
      this.groups.set(room.roomId, group);
    }
  }
  material(color, options = {}) {
    const key = `${color}:${JSON.stringify(options)}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...options }),
      );
    return this.materials.get(key);
  }
  box(parent, x, y, z, w, h, d, color, options) {
    const mesh = new THREE.Mesh(this.geometry, this.material(color, options));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = h > 0.2;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cylinder(parent, x, y, z, rt, rb, h, color, sides = 12) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, sides),
      this.material(color),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  sign(parent, text, x, y, z, w, h, color = "#493f31", bg = "#f2e8d0") {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(2048, Math.ceil(w * 360));
    canvas.height = Math.max(128, Math.round((canvas.width * h) / w));
    const ctx = canvas.getContext("2d"),
      W = canvas.width,
      H = canvas.height;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#bba882";
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.fillStyle = color;
    let size = H * 0.52;
    do {
      ctx.font = `800 ${size--}px system-ui, sans-serif`;
    } while (ctx.measureText(text).width > W - 40 && size > 16);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, H / 2);
    const texture = textTexture(canvas);
    this.textures.add(texture);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  paintDesk(mesh, subject) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#b99168";
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = "#a77f58";
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 31);
      ctx.lineTo(1024, i * 31 + 5);
      ctx.stroke();
    }
    // The paper and notebook ruling are painted directly into the table's top material.
    ctx.fillStyle = "#658578";
    ctx.fillRect(325, 112, 374, 300);
    ctx.fillStyle = "#f4eedc";
    ctx.fillRect(334, 120, 356, 280);
    ctx.strokeStyle = "#bdc6c1";
    ctx.lineWidth = 1;
    for (let y = 170; y < 382; y += 20) {
      ctx.beginPath();
      ctx.moveTo(354, y);
      ctx.lineTo(672, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#c58c7c";
    ctx.beginPath();
    ctx.moveTo(381, 140);
    ctx.lineTo(381, 386);
    ctx.stroke();
    ctx.fillStyle = "#324e45";
    ctx.font = "bold 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(subject, 512, 150);
    const texture = textTexture(canvas);
    this.textures.add(texture);
    const wood = this.material(0xb99168);
    const paper = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
    });
    mesh.material = [wood, wood, paper, wood, wood, wood];
  }
  wallSkirting(parent, left, right, z, doors, height, railY, wood, trim) {
    let start = left;
    for (const end of [...doors.map((x) => x - 0.72), right]) {
      const width = end - start;
      this.box(
        parent,
        start + width / 2,
        height / 2,
        z,
        width,
        height,
        0.08,
        wood,
      );
      this.box(parent, start + width / 2, railY, z, width, 0.1, 0.12, trim);
      start = end + 1.44;
    }
  }
  exitDoor(group) {
    // Geometry fallback while the supplied door GLB loads.
    const door = new THREE.Group();
    door.name = "exit-door";
    door.position.set(0, 0, ROOM_EXIT_WALL_Z);
    this.box(door, 0, 1.58, 0, 2.6, 3.16, 0.16, 0x7e6249);
    for (const x of [-1.4, 1.4])
      this.box(door, x, 1.65, 0, 0.17, 3.3, 0.28, 0x5d4939);
    this.box(door, 0, 3.25, 0, 2.98, 0.18, 0.28, 0x5d4939);
    for (const y of [0.8, 2.27])
      this.box(door, 0, y, -0.095, 2.18, 1.12, 0.04, 0x987450);
    this.box(door, -0.9, 1.4, -0.17, 0.27, 0.045, 0.08, 0xc4a15e);
    const fallback = [...door.children];
    for (const x of [-1.13, 1.13])
      this.box(door, x, 1.5, 0, 0.86, 3, 0.23, 0xe6dac3);
    this.box(door, 0, 3.13, 0, 3.1, 0.38, 0.23, 0xe6dac3);
    this.modelSlots.push({
      key: "door",
      group: door,
      x: 0,
      z: 0,
      rotationY: Math.PI,
      placeholder: fallback,
    });
    const plaque = this.sign(
      door,
      "E · В читальный зал",
      0,
      3.14,
      -0.13,
      2.08,
      0.25,
    );
    plaque.rotation.y = Math.PI;
    group.add(door);
  }
  addPortal(room) {
    const group = new THREE.Group();
    group.position.set(room.door.x, 0, HALL_DOOR_WALL_Z);
    this.box(group, -1.22, 1.65, 0, 0.18, 3.3, 0.27, 0x806146);
    this.box(group, 1.22, 1.65, 0, 0.18, 3.3, 0.27, 0x806146);
    this.box(group, 0, 3.26, 0, 2.6, 0.18, 0.3, 0x806146);
    this.box(group, 0, 0.04, 0.18, 2.3, 0.08, 0.58, 0xb79569);
    this.box(group, 0, 1.56, -0.14, 2.1, 2.95, 0.12, room.accent);
    this.box(group, 0, 1.55, -0.065, 1.9, 2.73, 0.025, 0x907a5c);
    for (const x of [-0.52, 0.52])
      this.box(group, x, 1.92, 0.005, 0.78, 1.46, 0.025, 0xc5b891);
    this.cylinder(group, 0.78, 1.45, 0.13, 0.055, 0.055, 0.035, 0xc5a464);
    const fallback = [...group.children];
    for (const x of [-1.13, 1.13])
      this.box(group, x, 1.5, 0, 0.86, 3, 0.24, 0xe9dec9);
    this.box(group, 0, 3.13, 0, 3.1, 0.38, 0.24, 0xe9dec9);
    this.modelSlots.push({
      key: "door",
      group,
      x: 0,
      z: 0,
      placeholder: fallback,
    });
    this.sign(
      group,
      `${room.number} · ${room.subject}`,
      0,
      3.75,
      0.135,
      3.3,
      0.56,
    );
    this.portals.add(group);
  }
  wallShell(group, room) {
    const c = room.center,
      stone = 0xe6dac3,
      oak = 0x9a7959,
      trim = 0x735b45;
    group.position.set(c.x, 0, c.z);
    this.box(group, 0, -0.12, 0, 13.2, 0.24, 13.2, 0xcdb899);
    for (let i = -6; i <= 6; i++)
      this.box(
        group,
        i,
        0.017,
        0,
        0.96,
        0.024,
        12.85,
        i % 3 ? 0xc8a982 : 0xd3b58e,
      );
    this.box(group, 0, 4.48, 0, 13.2, 0.2, 13.2, 0xe8dec8);
    const beamStart = group.children.length;
    for (const p of [-6.3, -3.2, 0, 3.2, 6.3]) {
      this.box(group, p, 4.34, 0, 0.14, 0.2, 13, trim);
      this.box(group, 0, 4.34, p, 13, 0.2, 0.14, trim);
    }
    const beams = group.children.slice(beamStart);
    for (const x of [-4.8, -1.6, 1.6, 4.8])
      for (const z of [-4.8, -1.6, 1.6, 4.8])
        this.modelSlots.push({
          key: "ceiling",
          group,
          x,
          y: 4.23,
          z,
          scale: [3.2 / 3, 1, 3.2 / 3],
          placeholder: x === -4.8 && z === -4.8 ? beams : [],
        });
    for (const z of [-6.5, 6.5]) {
      if (z < 0) this.box(group, 0, 2.18, z, 13.1, 4.36, 0.22, stone);
      else {
        this.box(group, -4.05, 2.18, z, 5, 4.36, 0.22, stone);
        this.box(group, 4.05, 2.18, z, 5, 4.36, 0.22, stone);
        this.box(group, 0, 3.81, z, 3.15, 1.08, 0.22, stone);
      }
      if (z < 0) {
        this.box(group, 0, 0.38, z + 0.16, 13, 0.72, 0.08, oak);
        this.box(group, 0, 0.76, z + 0.2, 13, 0.075, 0.1, trim);
      } else {
        this.wallSkirting(
          group,
          -6.5,
          6.5,
          z - 0.16,
          [0],
          0.72,
          0.76,
          oak,
          trim,
        );
      }
    }
    for (const x of [-6.5, 6.5]) {
      this.box(group, x, 2.18, 0, 0.22, 4.36, 13.1, stone);
      this.box(group, x + (x < 0 ? 0.16 : -0.16), 0.38, 0, 0.08, 0.72, 13, oak);
      for (const z of [-4.7, 0, 4.7]) {
        this.box(
          group,
          x + (x < 0 ? 0.22 : -0.22),
          2.1,
          z,
          0.19,
          4.1,
          0.28,
          trim,
        );
        this.box(
          group,
          x + (x < 0 ? 0.27 : -0.27),
          2.1,
          z,
          0.08,
          3.7,
          0.22,
          0xd0b691,
        );
      }
    }
    // Arched interior windows share the warm oak and pale stone palette.
    for (const x of [-6.33, 6.33])
      for (const z of [-2.35, 2.35]) {
        const ix = x + (x < 0 ? 0.12 : -0.12);
        this.box(group, ix, 2.4, z, 0.03, 2.35, 1.8, 0xb9d8cd, {
          emissive: 0x86a9a0,
          emissiveIntensity: 0.28,
        });
        const arch = new THREE.Shape();
        arch.moveTo(-0.86, 0);
        arch.lineTo(0.86, 0);
        arch.absarc(0, 0, 0.86, 0, Math.PI, false);
        const glass = new THREE.Mesh(
          new THREE.ShapeGeometry(arch),
          this.material(0xb9d8cd, {
            emissive: 0x86a9a0,
            emissiveIntensity: 0.28,
            side: THREE.DoubleSide,
          }),
        );
        glass.position.set(ix + (x < 0 ? 0.018 : -0.018), 3.48, z);
        glass.rotation.y = Math.PI / 2;
        group.add(glass);
        const frame = new THREE.Mesh(
          new THREE.TorusGeometry(0.86, 0.075, 6, 22, Math.PI),
          this.material(trim),
        );
        frame.position.set(ix + (x < 0 ? 0.045 : -0.045), 3.48, z);
        frame.rotation.y = Math.PI / 2;
        group.add(frame);
        for (const dz of [-0.93, 0.93])
          this.box(
            group,
            ix + (x < 0 ? 0.04 : -0.04),
            2.4,
            z + dz,
            0.09,
            2.5,
            0.09,
            trim,
          );
        this.box(
          group,
          ix + (x < 0 ? 0.04 : -0.04),
          2.4,
          z,
          0.09,
          2.5,
          0.07,
          trim,
        );
        this.box(
          group,
          ix + (x < 0 ? 0.04 : -0.04),
          2.45,
          z,
          0.09,
          0.08,
          1.88,
          trim,
        );
        this.box(
          group,
          ix + (x < 0 ? 0.16 : -0.16),
          1.13,
          z,
          0.32,
          0.12,
          2.1,
          oak,
        );
      }
    for (const x of [-5.8, 5.8])
      for (const z of [-5.8, 5.8]) {
        this.cylinder(group, x, 2.13, z, 0.23, 0.25, 4.23, 0xd9c8a8, 10);
        this.box(group, x, 0.18, z, 0.72, 0.32, 0.72, trim);
        this.box(group, x, 4.2, z, 0.72, 0.28, 0.72, trim);
      }
    this.sign(
      group,
      "ВЫХОД В ЧИТАЛЬНЫЙ ЗАЛ",
      0,
      3.75,
      ROOM_EXIT_WALL_Z - 0.125,
      3.2,
      0.45,
    ).rotation.y = Math.PI;
    this.exitDoor(group);
    for (const z of [-2.2, 2.2]) {
      this.cylinder(group, 0, 4.08, z, 0.45, 0.32, 0.14, 0x76654f, 16);
      this.cylinder(group, 0, 3.93, z, 0.34, 0.34, 0.14, 0xffe5ab, 16);
      const light = new THREE.PointLight(0xffd9a0, 1.2, 13);
      light.position.set(0, 3.7, z);
      group.add(light);
    }
  }
  desk(
    group,
    x,
    z,
    accent,
    width = 2.2,
    study = false,
    subject = "",
    student = study,
  ) {
    const deskStart = group.children.length;
    const top = this.box(group, x, 0.84, z, width, 0.11, 1.2, 0xb99168);
    this.box(group, x, 0.64, z - 0.43, width - 0.22, 0.34, 0.14, 0x765b46);
    for (const dx of [-width / 2 + 0.15, width / 2 - 0.15])
      for (const dz of [-0.44, 0.44])
        this.box(group, x + dx, 0.4, z + dz, 0.1, 0.8, 0.1, 0x765b46);
    if (study) {
      this.paintDesk(top, subject);
      top.userData.notebookSurface = true;
    }
    if (student) {
      // Reuse the supplied desk without its equipment; keep the flush notebook surface.
      this.modelSlots.push({
        key: "study-desk",
        group,
        x,
        z,
        placeholder: group.children
          .slice(deskStart)
          .filter((mesh) => !study || mesh !== top),
      });
      const first = group.children.length;
      this.box(group, x, 0.45, z + 1.05, 0.62, 0.1, 0.62, 0x806148);
      this.box(group, x, 0.85, z + 1.33, 0.62, 0.72, 0.1, 0x806148);
      for (const dx of [-0.23, 0.23])
        for (const dz of [-0.23, 0.23])
          this.box(
            group,
            x + dx,
            0.22,
            z + 1.05 + dz,
            0.07,
            0.44,
            0.07,
            0x806148,
          );
      this.modelSlots.push({
        key: "chair",
        group,
        x,
        z: z + 1.05,
        placeholder: group.children.slice(first),
      });
    }
  }
  shelf(group, x, z) {
    const first = group.children.length;
    this.box(group, x, 1.22, z, 2.4, 2.42, 0.56, 0x745b43);
    this.box(group, x, 1.23, z + 0.29, 2.16, 2.2, 0.035, 0xd0ac78);
    for (const y of [0.15, 0.83, 1.52, 2.28])
      this.box(group, x, y, z + 0.02, 2.44, 0.09, 0.66, 0x9f7a54);
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 10; i++)
        this.box(
          group,
          x - 0.93 + i * 0.205,
          0.42 + row * 0.7,
          z - 0.06,
          0.15,
          0.43 + (i % 3) * 0.04,
          0.27,
          [0x65827a, 0xa77d5d, 0x56748b, 0xc9a961][(i + row) % 4],
        );
    this.modelSlots.push({
      key: "shelf",
      group,
      placeholder: group.children.slice(first),
      x,
      z,
    });
  }
  board(group, room) {
    const accent = room.accent;
    this.box(group, 0, 2.35, -6.25, 5.6, 2.45, 0.14, 0x8d6e4d).name =
      "classroom-board";
    const chalk = room.moduleId === "informatics-basics" ? 0x163e43 : 0x314a42;
    this.box(group, 0, 2.35, -6.14, 5.3, 2.18, 0.03, chalk);
    this.sign(
      group,
      room.boardText,
      0,
      2.48,
      -6.105,
      4.65,
      0.62,
      "#f0ebd8",
      `#${chalk.toString(16).padStart(6, "0")}`,
    );
    this.box(group, 0, 1.06, -6.08, 5.8, 0.12, 0.35, 0x866447);
    this.sign(group, room.wallCaption, 0, 3.83, -6.055, 5.7, 0.46);
    // Topic-specific teaching props, placed away from the central path.
    if (room.exhibit === "geometry") {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.75, 5),
        this.material(accent),
      );
      cone.position.set(-2.7, 1.27, -3.3);
      group.add(cone);
      this.cylinder(group, -1.9, 1.245, -3.3, 0.35, 0.35, 0.7, 0xb9956e, 8);
    } else if (room.exhibit === "computers") {
      const first = group.children.length;
      // One workstation fallback, hidden together with the old desk after GLB loading.
      this.box(group, -2.5, 1.32, -3.3, 1.08, 0.68, 0.09, 0x30494e);
      this.box(group, -2.5, 1.32, -3.245, 0.94, 0.54, 0.01, 0x55a9a6, {
        emissive: 0x1b7775,
        emissiveIntensity: 0.2,
      });
      this.box(group, -2.5, 0.96, -3.3, 0.12, 0.16, 0.1, 0x30494e);
      this.box(group, -2.5, 0.91, -3.3, 0.45, 0.03, 0.24, 0x30494e);
      this.box(group, -2.5, 0.92, -2.98, 0.84, 0.04, 0.25, 0x41585a);
      for (const mesh of group.children.slice(first))
        mesh.userData.workstationFallback = true;
    } else if (room.exhibit === "archive") {
      for (const x of [-2.8, -2.2])
        this.cylinder(group, x, 1.2, -3.3, 0.13, 0.13, 0.6, 0xd7bc88, 10);
    } else if (room.exhibit === "globe") {
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 12, 8),
        this.material(0x6d9b9a),
      );
      globe.position.set(-2.5, 1.46, -3.3);
      group.add(globe);
      this.cylinder(group, -2.5, 0.94, -3.3, 0.34, 0.34, 0.08, 0x8c6a49);
      for (let i = 0; i < 3; i++)
        this.box(
          group,
          3.25 + i * 0.62,
          2.8,
          -6.04,
          0.55,
          0.34,
          0.03,
          [0x4c8067, 0xe7d5ac, 0x986b58][i],
        );
    }
  }
  topicPanel(group, room) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const c = canvas.getContext("2d");
    c.scale(2, 2);
    c.fillStyle = "#eee1c5";
    c.fillRect(0, 0, 512, 512);
    c.strokeStyle = "#9a7853";
    c.lineWidth = 18;
    c.strokeRect(12, 12, 488, 488);
    c.lineWidth = 5;
    if (room.exhibit === "geometry") {
      c.strokeStyle = "#527b96";
      c.beginPath();
      c.moveTo(90, 390);
      c.lineTo(250, 95);
      c.lineTo(420, 390);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.arc(255, 265, 78, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#526d83";
      c.font = "bold 38px system-ui";
      c.fillText("a", 130, 260);
      c.fillText("b", 340, 260);
      c.fillText("c", 242, 420);
    } else if (room.exhibit === "computers") {
      c.strokeStyle = "#3c8e8c";
      c.fillStyle = "#548f8c";
      for (const [x, y, label] of [
        [165, 90, "ВХОД"],
        [165, 220, "ЦИКЛ"],
        [165, 350, "ИТОГ"],
      ]) {
        c.strokeRect(x, y, 185, 70);
        c.font = "bold 28px system-ui";
        c.fillText(label, x + 35, y + 46);
      }
      for (const y of [160, 290]) {
        c.beginPath();
        c.moveTo(256, y);
        c.lineTo(256, y + 60);
        c.stroke();
      }
    } else if (room.exhibit === "archive") {
      c.strokeStyle = "#a57d58";
      c.beginPath();
      c.moveTo(75, 265);
      c.bezierCurveTo(170, 120, 285, 410, 435, 170);
      c.stroke();
      for (const [x, y] of [
        [105, 224],
        [240, 270],
        [390, 210],
      ]) {
        c.beginPath();
        c.arc(x, y, 17, 0, 7);
        c.fillStyle = "#8d6448";
        c.fill();
      }
      c.fillStyle = "#735d46";
      c.font = "bold 28px system-ui";
      c.fillText("1000", 65, 330);
      c.fillText("1500", 225, 350);
      c.fillText("1900", 365, 315);
    } else {
      c.fillStyle = "#83a89d";
      const polygon = (points) => {
        c.beginPath();
        points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.fill();
      };
      polygon([
        [48, 120],
        [100, 65],
        [170, 85],
        [180, 145],
        [145, 175],
        [160, 230],
        [120, 250],
        [105, 190],
        [65, 185],
      ]);
      polygon([
        [155, 270],
        [210, 285],
        [225, 340],
        [205, 425],
        [173, 450],
        [165, 380],
        [135, 325],
      ]);
      polygon([
        [250, 100],
        [315, 70],
        [355, 120],
        [430, 115],
        [470, 175],
        [440, 235],
        [380, 225],
        [350, 275],
        [300, 230],
        [260, 270],
        [235, 190],
      ]);
      polygon([
        [270, 280],
        [345, 290],
        [355, 355],
        [315, 425],
        [280, 380],
      ]);
      polygon([
        [390, 375],
        [460, 395],
        [470, 445],
        [420, 455],
      ]);
      c.fillStyle = "#6d8b7f";
      c.font = "bold 26px system-ui";
      c.fillText("АТЛАС МИРА", 145, 45);
    }
    const texture = textTexture(canvas);
    this.textures.add(texture);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    panel.position.set(4.15, 2.35, -6.045);
    group.add(panel);
  }
  buildRoom(room) {
    const group = new THREE.Group();
    group.name = room.roomId;
    this.wallShell(group, room);
    this.board(group, room);
    this.topicPanel(group, room);
    for (const object of room.objects) {
      if (object.kind === "desk") {
        const first = group.children.length;
        this.desk(
          group,
          object.x,
          object.z,
          room.accent,
          object.width,
          object.study,
          room.subject,
          object.student,
        );
        if (room.exhibit === "computers" && !object.student)
          this.modelSlots.push({
            key: "computer-desk",
            group,
            x: object.x,
            z: object.z,
            placeholder: [
              ...group.children.slice(first),
              ...group.children.filter((n) => n.userData.workstationFallback),
            ],
          });
      } else if (object.kind === "shelf") this.shelf(group, object.x, object.z);
      else if (object.kind === "lamp")
        this.modelSlots.push({
          key: object.kind,
          group,
          placeholder: [],
          ...object,
          ...(room.exhibit === "computers" ? { y: 0.865 } : {}),
        });
    }
    for (const x of [-5, 5]) {
      const first = group.children.length;
      this.cylinder(group, x, 0.38, 4.7, 0.45, 0.52, 0.74, 0x927254, 9);
      const plant = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.53, 1),
        this.material(0x688b70),
      );
      plant.position.set(x, 1.04, 4.7);
      group.add(plant);
      this.modelSlots.push({
        key: "planter",
        group,
        x,
        z: 4.7,
        placeholder: group.children.slice(first),
      });
    }
    return group;
  }
  setLocation(id) {
    this.portals.visible = id === ACADEMY_HUB;
    for (const [roomId, group] of this.groups) group.visible = roomId === id;
  }
  applyModel(key, makeInstance) {
    if (key === "ceiling") return this.applyCeiling(makeInstance);
    for (const slot of this.modelSlots.filter(
      (item) => item.key === key && !item.model,
    )) {
      const model = makeInstance();
      if (!model) continue;
      model.position.x += slot.x;
      model.position.y += slot.y || 0;
      model.position.z += slot.z;
      if (Array.isArray(slot.scale))
        model.scale.multiply(new THREE.Vector3(...slot.scale));
      else if (slot.scale) model.scale.multiplyScalar(slot.scale);
      if (slot.rotationY) model.rotation.y += slot.rotationY;
      model.userData.academyImported = true;
      slot.group.add(model);
      slot.model = model;
      for (const mesh of slot.placeholder) mesh.visible = false;
    }
  }
  applyCeiling(makeInstance) {
    const groups = new Set(
      this.modelSlots
        .filter((s) => s.key === "ceiling" && !s.model)
        .map((s) => s.group),
    );
    for (const group of groups) {
      const template = makeInstance();
      if (!template) return;
      template.updateMatrixWorld(true);
      const slots = this.modelSlots.filter(
        (s) => s.key === "ceiling" && s.group === group && !s.model,
      );
      const root = new THREE.Group();
      root.userData.academyImported = true;
      template.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const batch = new THREE.InstancedMesh(
          mesh.geometry,
          mesh.material,
          slots.length,
        );
        slots.forEach((slot, i) => {
          const transform = new THREE.Matrix4().makeScale(...slot.scale);
          transform.premultiply(
            new THREE.Matrix4().makeTranslation(slot.x, slot.y, slot.z),
          );
          batch.setMatrixAt(i, transform.multiply(mesh.matrixWorld));
        });
        batch.instanceMatrix.needsUpdate = true;
        batch.receiveShadow = true;
        root.add(batch);
      });
      group.add(root);
      for (const slot of slots) {
        slot.model = root;
        for (const mesh of slot.placeholder) mesh.visible = false;
      }
    }
  }
  dispose() {
    for (const group of [this.portals, ...this.groups.values()])
      group.traverse((node) => {
        for (let parent = node; parent; parent = parent.parent)
          if (parent.userData?.academyImported) {
            if (node.isInstancedMesh) node.dispose();
            return;
          }
        if (node.isMesh) {
          if (node.geometry !== this.geometry) node.geometry.dispose();
          for (const material of [node.material].flat())
            if (material?.map) material.dispose();
        }
      });
    this.portals.removeFromParent();
    for (const group of this.groups.values()) group.removeFromParent();
    this.groups.clear();
    this.geometry.dispose();
    for (const mat of this.materials.values()) mat.dispose();
    this.materials.clear();
    for (const texture of this.textures) texture.dispose();
    this.textures.clear();
  }
}
