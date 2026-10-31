import * as THREE from "three";
import { box, cylinder, mesh, landmark } from "./art.js";
export class CampusArt {
  constructor() {
    this.scene = new THREE.Group();
    this.landmarks = new Map();
    this.buildWorld();
  }
  buildWorld() {
    const ground = mesh(new THREE.PlaneGeometry(600, 600), 0xa8b38a);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = false;
    this.scene.add(ground);
    const courtyard = cylinder(21, 21, 0.15, 0xded7bc, 0, 0.03, 0, 80);
    courtyard.castShadow = false;
    this.scene.add(courtyard);
    for (const [w, d] of [
      [7, 470],
      [470, 7],
    ])
      this.scene.add(box(w, 0.12, d, 0xdad0b2, 0, 0.02, 0));
    for (const radius of [8.8, 17.8, 20.6]) {
      const ring = mesh(
        new THREE.RingGeometry(radius, radius + 0.16, 96),
        0xb8ae91,
        0,
        0.125,
        0,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.castShadow = false;
      this.scene.add(ring);
    }
    this.scene.add(cylinder(4, 4.3, 0.5, 0xc9bea0, 0, 0.35, 0));
    this.scene.add(cylinder(3.55, 3.55, 0.58, 0xe9dfc7, 0, 0.7, 0));
    const water = cylinder(3.2, 3.2, 0.06, 0x7eaaa0, 0, 1.02, 0);
    water.material.roughness = 0.25;
    this.scene.add(water);
    this.scene.add(cylinder(0.9, 1.1, 2.4, 0xe7d9b9, 0, 1.7, 0));
    this.globe = new THREE.Group();
    this.globe.position.y = 3.5;
    this.globe.add(mesh(new THREE.IcosahedronGeometry(1.3, 1), 0x879a78));
    for (const tilt of [0.3, 1.25]) {
      const ring = mesh(new THREE.TorusGeometry(1.85, 0.055, 8, 64), 0xc3a065);
      ring.rotation.x = tilt;
      ring.rotation.y = tilt;
      this.globe.add(ring);
    }
    this.scene.add(this.globe);
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10;
      const x = Math.sin(angle) * 13,
        z = Math.cos(angle) * 13;
      if (Math.abs(x) < 4 || Math.abs(z) < 4) continue;
      const planter = new THREE.Group();
      planter.position.set(x, 0, z);
      planter.add(cylinder(1.3, 1.1, 0.7, 0xc3ac83, 0, 0.4, 0));
      planter.add(
        mesh(new THREE.SphereGeometry(1.15, 12, 8), 0x7d8a60, 0, 1.1, 0),
      );
      for (let j = 0; j < 5; j++)
        planter.add(
          mesh(
            new THREE.IcosahedronGeometry(0.15, 0),
            [0xe8d4a3, 0xc78568, 0xe4e1c4][j % 3],
            Math.sin(j * 2) * 0.8,
            1.85,
            Math.cos(j * 2) * 0.8,
          ),
        );
      this.scene.add(planter);
    }
    for (const x of [-9, 9])
      for (const z of [-10, 10]) {
        const bench = new THREE.Group();
        bench.add(box(3, 0.17, 0.8, 0xa08258, 0, 0.8, 0));
        bench.add(box(3, 0.6, 0.14, 0xa08258, 0, 1.2, -0.42));
        for (const k of [-1, 1])
          bench.add(box(0.14, 0.7, 0.65, 0x626b59, k * 1.1, 0.4, 0));
        bench.position.set(x, 0, z);
        bench.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(bench);
      }
    for (const id of ["observatory", "pavilion"]) {
      const object = landmark(id);
      this.landmarks.set(id, object);
      this.scene.add(object);
    }
    const positions = [
      [-28, -12],
      [-25, 19],
      [25, 18],
      [5, -32],
      [-37, -30],
      [36, -25],
    ];
    for (const [x, z] of positions) {
      const mound = mesh(
        new THREE.SphereGeometry(8, 16, 8),
        0x99a87b,
        x,
        -5.7,
        z,
      );
      mound.scale.y = 0.8;
      this.scene.add(mound);
    }
  }
}
