// Demo-only visual replacements. Gameplay IDs, collision and protocol resources stay authoritative.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import config from "../config/local-art.json" with { type: "json" };
import { disposeObject } from "./resources.js";

const furniture = {
  "reading-shelf": "shelf",
  "reading-book": "book",
  "reading-desk": "desk",
  "competition-chair": "chair",
  "reading-notebook": "notebook",
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
    await Promise.all(
      Object.entries(config)
        .filter(([, entry]) => entry.available)
        .map(async ([key, entry]) => {
          try {
            const result = await this.loader.loadAsync(entry.path);
            if (this.disposed) {
              disposeObject(result.scene);
              return;
            }
            this.templates.set(key, result);
            this.applyWorld();
            this.applyActors();
            if (["shelf", "desk", "lamp"].includes(key))
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
      (key.startsWith("teacher-") || key === "examiner") &&
      !source.animations.length
    ) {
      const left = model.getObjectByName("LeftArm");
      const right = model.getObjectByName("RightArm");
      if (left && right) {
        left.rotation.z = -1.15;
        right.rotation.z = 1.15;
      }
    }
    model.scale.setScalar(spec.scale);
    model.rotation.y = spec.rotationY;
    model.updateMatrixWorld(true);
    const floor = new THREE.Box3().setFromObject(model).min.y;
    model.position.set(spec.offset[0], spec.offset[1] - floor, spec.offset[2]);
    return model;
  }

  applyWorld() {
    for (const chunk of this.game.resources.roots.values()) {
      for (const root of chunk.roots) {
        const key = furniture[root.userData.placement?.modelId];
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
      const profile = root.userData.npcProfile;
      if (profile?.npcId === "npc-guide") continue;
      const role = profile?.role;
      const key =
        role === "teacher"
          ? config[profile?.npcId] ? profile.npcId : null
          : role === "examiner"
            ? "examiner"
            : null;
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
        };
        this.actorInstances.add(root);
      }
      if (root.userData.body) root.userData.body.visible = false;
    }
  }

  updateActor(root, state, dt) {
    const visual = root.userData.localArt;
    if (!visual?.model) return false;
    if (!visual.mixer) return true;
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
    visual.model.removeFromParent();
    root.userData.localArt = null;
    this.actorInstances.delete(root);
  }

  dispose() {
    this.disposed = true;
    for (const root of [...this.actorInstances]) this.releaseActor(root);
    for (const result of this.templates.values()) disposeObject(result.scene);
    this.templates.clear();
  }
}
