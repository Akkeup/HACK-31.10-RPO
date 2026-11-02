import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LoadingManager } from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { imageMemory, embeddedBytes } from "./image-budget.js";
import { validate, parseJSON } from "../network/protocol.js";
export function disposeObject(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((n) => {
    if (n.geometry) geometries.add(n.geometry);
    for (const m of Array.isArray(n.material)
      ? n.material
      : n.material
        ? [n.material]
        : []) {
      materials.add(m);
      for (const value of Object.values(m))
        if (value?.isTexture) textures.add(value);
    }
    n.skeleton?.dispose();
  });
  textures.forEach((t) => {
    t.source?.data?.close?.();
    t.dispose();
  });
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
  root.removeFromParent();
  root.clear();
}
export function detachInstance(root) {
  root.traverse((n) => n.skeleton?.dispose());
  root.removeFromParent();
  root.clear();
  root.userData = {};
}
export function estimateObject(root) {
  let bytes = 1024;
  const seen = new Set();
  root.traverse((n) => {
    bytes += 512;
    if (n.geometry && !seen.has(n.geometry)) {
      seen.add(n.geometry);
      for (const attr of Object.values(n.geometry.attributes))
        bytes += attr.array.byteLength * 2;
      bytes += (n.geometry.index?.array.byteLength || 0) * 2;
    }
    for (const m of Array.isArray(n.material)
      ? n.material
      : n.material
        ? [n.material]
        : []) {
      if (!seen.has(m)) {
        seen.add(m);
        bytes += 2048;
      }
      for (const t of Object.values(m))
        if (t?.isTexture && !seen.has(t)) {
          seen.add(t);
          bytes += (t.image?.width || 1) * (t.image?.height || 1) * 4 * 1.34;
        }
    }
  });
  return Math.ceil(bytes);
}
export class ResourceLedger {
  constructor(manifest, physicalLimit = 256 * 1048576) {
    this.records = new Map();
    this.ownerBytes = new Map();
    this.physicalLimit = physicalLimit;
    this.evictions = 0;
    this.setManifest(manifest);
  }
  setManifest(m) {
    validate("streaming", m, "manifest");
    if (m.cacheBudgetBytes !== Math.floor(m.totalWorldBytes / 10))
      throw Error("INVALID_REQUEST: B != floor(W/10)");
    if (this.records.size && this.worldRevision !== m.worldRevision)
      throw Error("Сначала освободите предыдущую worldRevision");
    this.manifest = m;
    this.worldRevision = m.worldRevision;
    this.budget = m.cacheBudgetBytes;
  }
  get residentBytes() {
    return [...this.records.values()]
      .filter((r) => r.state === "resident")
      .reduce((n, r) => n + r.descriptor.byteSize, 0);
  }
  get reservedBytes() {
    return [...this.records.values()]
      .filter((r) => r.state === "reserved")
      .reduce((n, r) => n + r.descriptor.byteSize, 0);
  }
  get usedBytes() {
    return this.residentBytes + this.reservedBytes;
  }
  get physicalBytes() {
    return (
      [...this.ownerBytes.values()].reduce((n, v) => n + v, 0) +
      [...this.records.values()].reduce((n, r) => n + (r.physicalBytes || 0), 0)
    );
  }
  get cacheBytes() {
    return [...this.records.values()]
      .filter((r) => r.state === "resident" && !r.refs.size)
      .reduce((n, r) => n + r.descriptor.byteSize, 0);
  }
  evict(hash) {
    const r = this.records.get(hash);
    if (!r || r.refs.size || r.state === "reserved") return false;
    r.template && disposeObject(r.template);
    r.template = null;
    r.animations = null;
    r.buffer = null;
    r.data = null;
    this.records.delete(hash);
    this.evictions++;
    return true;
  }
  makeRoom(bytes) {
    for (const [hash, r] of [...this.records].sort(
      (a, b) => a[1].used - b[1].used,
    )) {
      if (this.usedBytes + bytes <= this.budget) break;
      if (!r.refs.size) this.evict(hash);
    }
    if (this.usedBytes + bytes > this.budget)
      throw Error("RESOURCE_TOO_LARGE: ресурсы и резервы превышают 10% мира");
  }
  reserve(d) {
    const existing = this.records.get(d.sha256);
    if (existing) {
      if (existing.descriptor.byteSize !== d.byteSize)
        throw Error("Разные byteSize одного hash");
      return existing;
    }
    this.makeRoom(d.byteSize);
    const record = {
      descriptor: d,
      state: "reserved",
      refs: new Set(),
      used: performance.now(),
      physicalBytes: d.byteSize,
      buffer: null,
    };
    if (this.physicalBytes + record.physicalBytes > this.physicalLimit)
      throw Error("RESOURCE_TOO_LARGE: RAM/VRAM 256 МиБ");
    this.records.set(d.sha256, record);
    return record;
  }
  commit(hash, buffer) {
    const r = this.records.get(hash);
    if (
      !r ||
      r.state !== "reserved" ||
      buffer.byteLength !== r.descriptor.byteSize
    )
      throw Error("INVALID_REQUEST: reservation");
    r.buffer = buffer;
    r.state = "resident";
  }
  fail(hash) {
    const r = this.records.get(hash);
    if (r?.state === "reserved") {
      r.buffer = null;
      this.records.delete(hash);
    }
  }
  clearCache() {
    for (const [hash, r] of this.records) if (!r.refs.size) this.evict(hash);
  }
  releaseOwner(owner) {
    this.ownerBytes.delete(owner);
    for (const r of this.records.values()) {
      r.refs.delete(owner);
      r.used = performance.now();
    }
  }
  dispose() {
    for (const r of this.records.values()) {
      if (r.refs.size || r.state === "reserved")
        throw Error("Ресурс ещё используется");
    }
    this.clearCache();
  }
}
function gltfDocument(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 20 && view.getUint32(0, true) === 0x46546c67) {
    if (
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== bytes.length
    )
      throw Error("INVALID_REQUEST: GLB header");
    const size = view.getUint32(12, true);
    return parseJSON(
      new TextDecoder().decode(bytes.subarray(20, 20 + size)),
      1048576,
    );
  }
  return parseJSON(new TextDecoder().decode(bytes), 1048576);
}
export class WorldResources {
  constructor(adapter, scene, { beforeChange, onLoaded, onError }) {
    this.adapter = adapter;
    this.scene = scene;
    this.beforeChange = beforeChange;
    this.onLoaded = onLoaded;
    this.onError = onError;
    this.ledger = new ResourceLedger(adapter.manifest);
    this.roots = new Map();
    this.chain = Promise.resolve();
    this.generation = 0;
    this.pending = 0;
    this.disposed = false;
  }
  accept(interest) {
    validate("streaming", interest, "interest");
    this.abort?.abort();
    const generation = ++this.generation;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.chain = this.chain
      .catch(() => {})
      .then(() => this.prepare(interest, generation, signal))
      .catch((error) => {
        if (error.name !== "AbortError" && generation === this.generation) {
          this.adapter.ready = false;
          this.beforeChange();
          this.clearChunks();
          for (const r of this.ledger.records.values())
            r.refs.delete("interest");
          this.ledger.clearCache();
          this.onError(error.message);
        }
      });
    return this.chain;
  }
  async prepare(interest, generation, signal) {
    if (signal.aborted || this.disposed) return;
    this.beforeChange();
    this.clearChunks();
    for (const r of this.ledger.records.values()) r.refs.delete("interest");
    if (this.ledger.worldRevision !== interest.worldRevision) {
      this.ledger.dispose();
      this.ledger.setManifest(this.adapter.manifest);
    }
    if (
      new Set(interest.chunks.map((d) => d.chunkId)).size !==
        interest.chunks.length ||
      new Set(interest.assets.map((d) => d.resourceId)).size !==
        interest.assets.length
    )
      throw Error("INVALID_REQUEST: duplicate IDs");
    const descriptors = [...interest.chunks, ...interest.assets],
      unique = new Map();
    for (const d of descriptors) {
      const previous = unique.get(d.sha256);
      if (previous && previous.byteSize !== d.byteSize)
        throw Error("INVALID_REQUEST: hash metadata");
      unique.set(d.sha256, d);
      const expected = `/api/v2/worlds/${this.adapter.worldId}/`;
      if (
        d.byteSize >
        (d.chunkId
          ? this.ledger.manifest.maxChunkBytes
          : this.ledger.manifest.maxResourceBytes)
      )
        throw Error("RESOURCE_TOO_LARGE: descriptor limit");
      if (!d.url.startsWith(expected)) throw Error("OUT_OF_INTEREST: иной мир");
    }
    const required = [...unique.values()].reduce((n, d) => n + d.byteSize, 0);
    if (required !== interest.requiredBytes || required > this.ledger.budget)
      throw Error("RESOURCE_TOO_LARGE: interest.requiredBytes");
    for (const [hash] of unique) {
      const r = this.ledger.records.get(hash);
      if (r) r.refs.add("interest");
    }
    const missing = [...unique.values()].filter(
      (d) => !this.ledger.records.has(d.sha256),
    );
    this.ledger.makeRoom(missing.reduce((n, d) => n + d.byteSize, 0));
    try {
      for (const d of missing) this.ledger.reserve(d).refs.add("interest");
    } catch (error) {
      for (const d of missing) this.ledger.fail(d.sha256);
      throw error;
    }
    const queue = [...missing];
    const work = async () => {
      while (queue.length && !signal.aborted) {
        const d = queue.shift();
        this.pending++;
        try {
          let buffer;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              buffer = await this.adapter.fetchResource(
                d,
                interest.interestRevision,
                signal,
              );
              break;
            } catch (e) {
              if (
                signal.aborted ||
                attempt ||
                !e.message.startsWith("INVALID_REQUEST")
              )
                throw e;
            }
          }
          signal.throwIfAborted();
          this.ledger.commit(d.sha256, buffer);
        } catch (e) {
          this.ledger.fail(d.sha256);
          throw e;
        } finally {
          this.pending--;
        }
      }
    };
    try {
      const results = await Promise.allSettled([work(), work()]);
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
      signal.throwIfAborted();
      for (const d of missing)
        if (this.ledger.records.get(d.sha256)?.state === "reserved")
          this.ledger.fail(d.sha256);
      await this.decode(interest, signal);
      signal.throwIfAborted();
      if (this.disposed || generation !== this.generation) return;
      this.interest = interest;
      this.assets = new Map(interest.assets.map((d) => [d.resourceId, d]));
      this.buildChunks(interest);
      this.onLoaded();
      this.adapter.markReady(interest, [...unique.keys()]);
    } finally {
      for (const d of missing)
        if (this.ledger.records.get(d.sha256)?.state === "reserved")
          this.ledger.fail(d.sha256);
    }
  }
  async decode(interest, signal) {
    const urls = new Map(),
      created = [];
    try {
      for (const d of interest.assets.filter((d) =>
        d.mediaType.startsWith("model/"),
      )) {
        const r = this.ledger.records.get(d.sha256);
        const url = URL.createObjectURL(
          new Blob([r.buffer], { type: d.mediaType }),
        );
        created.push(url);
        urls.set(new URL(d.url, location.origin).href, url);
      }
      const manager = new LoadingManager();
      manager.setURLModifier((url) => {
        if (url.startsWith("data:") || url.startsWith("blob:")) return url;
        const value = urls.get(new URL(url, location.origin).href);
        if (!value) throw Error("OUT_OF_INTEREST: glTF dependency");
        return value;
      });
      const loader = new GLTFLoader(manager);
      for (const d of interest.assets.filter((d) =>
        d.mediaType.startsWith("model/"),
      )) {
        signal.throwIfAborted();
        const r = this.ledger.records.get(d.sha256);
        if (r.template || !d.mediaType.startsWith("model/")) continue;
        const json = gltfDocument(r.buffer);
        let estimated = d.byteSize * 4;
        for (const accessor of json.accessors || []) {
          const arity = {
            SCALAR: 1,
            VEC2: 2,
            VEC3: 3,
            VEC4: 4,
            MAT2: 4,
            MAT3: 9,
            MAT4: 16,
          }[accessor.type];
          const size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[
            accessor.componentType
          ];
          if (
            !arity ||
            !size ||
            !Number.isSafeInteger(accessor.count) ||
            accessor.count < 0
          )
            throw Error("INVALID_REQUEST: glTF accessor");
          estimated += accessor.count * arity * size * 2;
        }
        for (const image of json.images || []) {
          if (
            image.uri &&
            !image.uri.startsWith("data:") &&
            !urls.has(new URL(image.uri, new URL(d.url, location.origin)).href)
          )
            throw Error("OUT_OF_INTEREST: image URI");
          let imageBytes;
          if (image.uri) {
            imageBytes = image.uri.startsWith("data:")
              ? embeddedBytes(image.uri)
              : this.ledger.records.get(
                  interest.assets.find(
                    (a) =>
                      new URL(a.url, location.origin).href ===
                      new URL(image.uri, new URL(d.url, location.origin)).href,
                  )?.sha256,
                )?.buffer;
          } else if (image.bufferView !== undefined) {
            const bv = json.bufferViews?.[image.bufferView];
            const source = json.buffers?.[bv?.buffer];
            let buffer;
            if (source?.uri) {
              buffer = source.uri.startsWith("data:")
                ? embeddedBytes(source.uri)
                : this.ledger.records.get(
                    interest.assets.find(
                      (a) =>
                        new URL(a.url, location.origin).href ===
                        new URL(source.uri, new URL(d.url, location.origin))
                          .href,
                    )?.sha256,
                  )?.buffer;
            } else {
              const header = new DataView(
                r.buffer.buffer,
                r.buffer.byteOffset,
                r.buffer.byteLength,
              );
              const offset = 20 + header.getUint32(12, true) + 8;
              buffer = r.buffer.subarray(offset);
            }
            imageBytes = buffer?.subarray(
              bv.byteOffset || 0,
              (bv.byteOffset || 0) + bv.byteLength,
            );
          }
          if (!imageBytes) throw Error("INVALID_REQUEST: image buffer");
          estimated += imageMemory(imageBytes);
        }
        for (const buffer of json.buffers || [])
          if (
            buffer.uri &&
            !buffer.uri.startsWith("data:") &&
            !urls.has(new URL(buffer.uri, new URL(d.url, location.origin)).href)
          )
            throw Error("OUT_OF_INTEREST: buffer URI");
        if (this.ledger.physicalBytes + estimated > this.ledger.physicalLimit)
          throw Error("RESOURCE_TOO_LARGE: декодирование превышает 256 МиБ");
        const parsed = await loader.parseAsync(
          r.buffer.buffer.slice(
            r.buffer.byteOffset,
            r.buffer.byteOffset + r.buffer.byteLength,
          ),
          new URL(".", new URL(d.url, location.origin)).href,
        );
        if (signal.aborted) {
          disposeObject(parsed.scene);
          signal.throwIfAborted();
        }
        const animationBytes = parsed.animations.reduce(
          (n, clip) =>
            n +
            clip.tracks.reduce(
              (sum, t) => sum + t.times.byteLength + t.values.byteLength,
              0,
            ),
          0,
        );
        const bytes =
          estimateObject(parsed.scene) + r.buffer.byteLength + animationBytes;
        if (
          this.ledger.physicalBytes - r.physicalBytes + bytes >
          this.ledger.physicalLimit
        ) {
          disposeObject(parsed.scene);
          throw Error("RESOURCE_TOO_LARGE: RAM/VRAM");
        }
        r.template = parsed.scene;
        r.animations = parsed.animations;
        r.physicalBytes = bytes;
      }
      for (const d of interest.chunks) {
        const r = this.ledger.records.get(d.sha256);
        if (!r.data) {
          const physical = r.buffer.byteLength + Math.ceil(d.byteSize * 2.5);
          if (
            this.ledger.physicalBytes - r.physicalBytes + physical >
            this.ledger.physicalLimit
          )
            throw Error("RESOURCE_TOO_LARGE: chunk JSON");
          r.physicalBytes = physical;
          r.data = validate(
            "chunk",
            parseJSON(new TextDecoder().decode(r.buffer), 262144),
          );
        }
        const c = r.data;
        if (
          c.worldId !== this.adapter.worldId ||
          c.worldRevision !== interest.worldRevision ||
          c.chunkId !== d.chunkId ||
          c.x !== d.x ||
          c.z !== d.z ||
          c.objects.some((o) => !d.assetIds.includes(o.modelId))
        )
          throw Error("INVALID_REQUEST: chunk identity/dependencies");
      }
    } finally {
      created.forEach((url) => URL.revokeObjectURL(url));
    }
  }
  instantiate(modelId, owner) {
    const descriptor = this.assets?.get(modelId);
    const record = descriptor && this.ledger.records.get(descriptor.sha256);
    if (!record?.template) return null;
    let instanceBytes = 0;
    record.template.traverse((n) => {
      instanceBytes += 512;
      if (n.isSkinnedMesh)
        instanceBytes += (n.skeleton?.bones.length || 0) * 128;
    });
    if (this.ledger.physicalBytes + instanceBytes > this.ledger.physicalLimit)
      throw Error("RESOURCE_TOO_LARGE: RAM/VRAM instances");
    this.ledger.ownerBytes.set(
      owner,
      (this.ledger.ownerBytes.get(owner) || 0) + instanceBytes,
    );
    record.refs.add(owner);
    record.used = performance.now();
    const root = cloneSkeleton(record.template);
    root.userData.animations = record.animations || [];
    return root;
  }
  async loadImage(descriptor) {
    if (!descriptor?.sha256 || !descriptor?.url) return;
    if (!this.loadingImages) this.loadingImages = new Set();
    if (this.loadingImages.has(descriptor.sha256)) return;
    this.loadingImages.add(descriptor.sha256);
    try {
      this.ledger.reserve(descriptor);
      let buffer;
      try {
        if (this.adapter?.fetchResource) {
          buffer = await this.adapter.fetchResource(descriptor, 1, new AbortController().signal);
        }
      } catch {
        // Fallback to direct fetch
      }
      if (!buffer) {
        const resp = await fetch(descriptor.url);
        if (resp.ok) {
          buffer = new Uint8Array(await resp.arrayBuffer());
        }
      }
      if (buffer && buffer.byteLength === descriptor.byteSize) {
        this.ledger.commit(descriptor.sha256, buffer);
        this.onUpdate?.();
      }
    } catch {
      this.ledger.fail(descriptor.sha256);
    } finally {
      this.loadingImages.delete(descriptor.sha256);
    }
  }
  image(descriptor, owner) {
    const record = this.ledger.records.get(descriptor.sha256);
    if (!record?.buffer || record.descriptor.byteSize !== descriptor.byteSize) {
      this.loadImage(descriptor);
      throw Error("Флаг ещё загружается.");
    }
    const bytes = descriptor.width * descriptor.height * 4 * 1.34;
    if (this.ledger.physicalBytes + bytes > this.ledger.physicalLimit)
      throw Error("RESOURCE_TOO_LARGE: flag image");
    if (descriptor.mediaType === "image/svg+xml") {
      const svg = new TextDecoder().decode(record.buffer);
      if (
        /<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|<!ENTITY|<!DOCTYPE/i.test(
          svg,
        )
      )
        throw Error("Недопустимый SVG флага.");
    }
    record.refs.add(owner);
    this.ledger.ownerBytes.set(owner, Math.ceil(bytes));
    const url = URL.createObjectURL(
      new Blob([record.buffer], { type: descriptor.mediaType }),
    );
    return {
      url,
      release: () => {
        URL.revokeObjectURL(url);
        this.ledger.releaseOwner(owner);
      },
    };
  }
  buildChunks(interest) {
    for (const d of interest.chunks) {
      const record = this.ledger.records.get(d.sha256),
        owner = "chunk:" + d.chunkId;
      record.refs.add(owner);
      const roots = [];
      this.roots.set(d.chunkId, { owner, roots });
      for (const object of record.data.objects) {
        const root = this.instantiate(object.modelId, owner);
        if (!root) throw Error("OUT_OF_INTEREST: modelId");
        root.position.set(
          object.position.x,
          object.position.y,
          object.position.z,
        );
        root.userData.placement = object;
        root.rotation.y = object.yawRad;
        root.scale.setScalar(object.scale);
        root.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });
        this.scene.add(root);
        roots.push(root);
      }
      this.roots.set(d.chunkId, { owner, roots });
    }
  }
  clearChunks() {
    for (const { owner, roots } of this.roots.values()) {
      roots.forEach(detachInstance);
      this.ledger.releaseOwner(owner);
    }
    this.roots.clear();
  }
  get metrics() {
    return {
      resident: this.ledger.residentBytes,
      reserved: this.ledger.reservedBytes,
      used: this.ledger.usedBytes,
      budget: this.ledger.budget,
      total: this.ledger.manifest.totalWorldBytes,
      physical: this.ledger.physicalBytes,
      cache: this.ledger.cacheBytes,
      chunks: this.roots.size,
      pending: this.pending,
      evictions: this.ledger.evictions,
    };
  }
  async dispose() {
    this.disposed = true;
    this.abort?.abort();
    await this.chain.catch(() => {});
    this.beforeChange();
    this.clearChunks();
    for (const r of this.ledger.records.values()) r.refs.delete("interest");
    this.ledger.dispose();
  }
}
