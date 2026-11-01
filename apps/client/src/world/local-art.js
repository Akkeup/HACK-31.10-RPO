// Shared visual assets for local and LAN sessions. Gameplay and network IDs stay authoritative.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import config from "../config/local-art.json" with { type: "json" };
import { actorVisualKey } from "./actor-visuals.js";
import { HumanoidGait } from "./humanoid-gait.js";
import { disposeObject, detachInstance } from "./resources.js";

const furniture = {
  "reading-shelf": "shelf",
  "competition-chair": "chair",
  "competition-table": "round-table",
};

export class LocalArt {
  constructor(game, onError) {
    this.game = game;
    this.onError = onError;
    this.loader = new GLTFLoader();
    this.templates = new Map();
    this.actorInstances = new Set();
    this.disposed = false;
  }

  async preload() {
    const byPath = new Map();
    await Promise.all(
      Object.entries(config)
        .filter(([, entry]) => entry.available)
        .map(async ([key, entry]) => {
          try {
            if (!byPath.has(entry.path))
              byPath.set(entry.path, this.loader.loadAsync(entry.path));
            const result = await byPath.get(entry.path);
            if (this.disposed) {
              disposeObject(result.scene);
              return;
            }
            this.templates.set(key, result);
            this.applyWorld();
            this.applyActors();
            if (
              [
                "shelf",
                "chair",
                "lamp",
                "door",
                "computer-desk",
                "study-desk",
                "board",
                "ceiling",
                "planter",
              ].includes(key)
            )
              this.game.academyArt?.applyModel(key, () => this.instance(key));
          } catch (error) {
            if (!this.disposed)
              this.onError(
                `Модель ${entry.path} недоступна; показана заглушка.`,
              );
          }
        }),
    );
  }

  instance(key) {
    const source = this.templates.get(key);
    if (!source) return null;
    const spec = config[key];
    const model = cloneSkeleton(source.scene);
    if (
      (key.startsWith("teacher-") ||
        ["examiner", "guide", "player"].includes(key)) &&
      !source.animations.length
    ) {
      const left = model.getObjectByName("LeftArm");
      const right = model.getObjectByName("RightArm");
      if (left && right) {
        left.rotation.z = -1.15;
        right.rotation.z = 1.15;
      }
    }
    for (const name of spec.hiddenNodes || [])
      model.getObjectByName(name)?.removeFromParent();
    model.scale.setScalar(spec.scale);
    model.rotation.y = spec.rotationY;
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = !node.isSkinnedMesh;
        if (key === "shelf") {
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          for (const material of materials) {
            if (!material) continue;
            material.transparent = false;
            material.opacity = 1;
            material.alphaTest = 0;
            material.depthWrite = true;
            material.needsUpdate = true;
          }
        }
      }
    });
    model.updateMatrixWorld(true);
    const floor = new THREE.Box3().setFromObject(model).min.y;
    model.position.set(spec.offset[0], spec.offset[1] - floor, spec.offset[2]);
    return model;
  }

  applyWorld() {
    for (const chunk of this.game.resources.roots.values()) {
      for (const root of chunk.roots) {
        const id = root.userData.placement?.modelId;
        if (
          id === "terrain-2-2" &&
          (!root.userData.flatStudyProps ||
            (this.templates.has("planter") && !root.userData.plantersReplaced))
        ) {
          // Replace raised paper props and the old wall trim crossing door openings.
          root.updateMatrixWorld(true);
          const matrix = new THREE.Matrix4(),
            at = new THREE.Vector3();
          root.traverse((node) => {
            if (!node.isInstancedMesh) {
              if (node.isMesh && this.templates.has("planter")) {
                node.getWorldPosition(at);
                if (
                  [67.3, 92.7].some((x) => Math.abs(x - at.x) < 0.01) &&
                  [68, 91].some((z) => Math.abs(z - at.z) < 0.01) &&
                  at.y > 0.2 &&
                  at.y < 1.1
                )
                  node.visible = false;
              }
              return;
            }
            for (let i = 0; i < node.count; i++) {
              node.getMatrixAt(i, matrix);
              at.setFromMatrixPosition(
                matrix.clone().premultiply(node.matrixWorld),
              );
              const raisedPaper =
                [72, 88].some((x) => Math.abs(x - at.x) < 0.01) &&
                [83, 88].some((z) => Math.abs(z - at.z) < 0.01) &&
                at.y > 0.89 &&
                at.y < 0.98;
              const doorWallTrim =
                Math.abs(at.x - 80) < 0.01 &&
                Math.abs(at.z - 65.65) < 0.01 &&
                [0.38, 0.79].some((y) => Math.abs(y - at.y) < 0.01);
              const oldPlanter =
                this.templates.has("planter") &&
                [67.3, 92.7].some((x) => Math.abs(x - at.x) < 0.01) &&
                [68, 91].some((z) => Math.abs(z - at.z) < 0.01) &&
                at.y > 0.2 &&
                at.y < 1.1;
              if (raisedPaper || doorWallTrim || oldPlanter)
                node.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
            }
            node.instanceMatrix.needsUpdate = true;
          });
          root.userData.flatStudyProps = true;
          root.userData.plantersReplaced = this.templates.has("planter");
        }
        if (["reading-book", "reading-notebook"].includes(id)) {
          root.userData.presentationHidden = true;
          root.visible = false;
          continue;
        }
        const key = furniture[id];
        if (!key || root.userData.localArt) continue;
        const model = this.instance(key);
        if (!model) continue;
        for (const child of root.children) child.visible = false;
        root.add(model);
        root.userData.localArt = model;
      }
    }
  }

  applyActors() {
    for (const root of this.game.actors.values()) {
      const key = actorVisualKey(root, config);
      if (!key) continue;
      if (!root.userData.localArt) {
        const model = this.instance(key);
        if (!model) continue;
        const clips = this.templates.get(key).animations;
        root.add(model);
        root.userData.localArt = {
          model,
          mixer: clips.length ? new THREE.AnimationMixer(model) : null,
          clips,
          action: null,
          gait: new HumanoidGait(model),
        };
        this.actorInstances.add(root);
      }
      if (root.userData.body) root.userData.body.visible = false;
    }
  }

  updateActor(root, state, dt, speed = 0) {
    const visual = root.userData.localArt;
    if (!visual?.model) return false;
    if (!visual.mixer) {
      visual.gait.update(
        state,
        speed,
        dt,
        this.game.configs.render.animationEnabled,
      );
      return true;
    }
    if (!this.game.configs.render.animationEnabled) {
      visual.mixer.stopAllAction();
      visual.action = null;
      return true;
    }
    const match =
      state === "walking"
        ? /walk|run|move/i
        : state === "sitting"
          ? /sit|seat/i
          : /idle|stand|rest/i;
    const clip =
      visual.clips.find((item) => match.test(item.name)) ||
      (state === "idle" ? visual.clips[0] : null);
    if (clip !== visual.action?.getClip()) {
      visual.action?.fadeOut(0.2);
      visual.action = clip ? visual.mixer.clipAction(clip) : null;
      visual.action?.reset().fadeIn(0.2).play();
    }
    visual.mixer.update(dt);
    return true;
  }

  releaseActor(root) {
    const visual = root.userData.localArt;
    if (!visual?.model) return;
    visual.mixer?.stopAllAction();
    visual.mixer?.uncacheRoot(visual.model);
    detachInstance(visual.model);
    root.userData.localArt = null;
    this.actorInstances.delete(root);
  }

  dispose() {
    this.disposed = true;
    for (const root of [...this.actorInstances]) this.releaseActor(root);
    for (const result of new Set(this.templates.values()))
      disposeObject(result.scene);
    this.templates.clear();
  }
}
