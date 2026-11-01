import * as THREE from "three";

// Presentation-only layer for the competition table. It consumes server summaries
// but never changes a stake, wallet, seat or match state.
export class CompetitionArt {
  constructor(scene, tables = []) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = "discovery-emerald-poker-table";
    scene.add(this.root);
    this.tables = new Map();
    this.materials = new Map();
    this.geometries = new Set();
    this.animations = [];
    this.lastSettlements = new Set();
    this.chipColors = [0xc94f5f, 0x4e82b6, 0xf0e3c2, 0xd6ad52];
    this.chipMaterials = this.chipColors.map((color) => this.material(color));
    this.chipGeometry = this.geometry(() => new THREE.CylinderGeometry(0.14, 0.14, 0.055, 16));
    for (const table of tables) this.addTable(table);
  }

  material(color, options = {}) {
    const key = `${color}:${JSON.stringify(options)}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.62,
          metalness: options.metalness ?? 0,
          ...options,
        }),
      );
    return this.materials.get(key);
  }

  geometry(factory) {
    const value = factory();
    this.geometries.add(value);
    return value;
  }

  addTable(config) {
    if (!config?.tableId || this.tables.has(config.tableId)) return this.tables.get(config.tableId);
    const table = {
      config,
      root: new THREE.Group(),
      bank: new THREE.Group(),
      chips: new THREE.Group(),
      dynamic: new THREE.Group(),
      lastPot: 0,
      renderedPot: -1,
      lastRevision: 0,
      lastSettlement: null,
    };
    table.root.name = `emerald-table-${config.tableId}`;
    table.root.position.set(config.position.x, config.position.y || 0, config.position.z);
    table.root.add(table.bank, table.chips, table.dynamic);
    this.buildTable(table);
    this.root.add(table.root);
    this.tables.set(config.tableId, table);
    return table;
  }

  buildTable(table) {
    const g = table.root;
    const wood = this.material(0x392316, { roughness: 0.38 });
    const woodEdge = this.material(0x754a2b, { roughness: 0.36 });
    const felt = this.material(0x0b5a46, { roughness: 0.94 });
    const feltLight = this.material(0x14785d, { roughness: 0.9 });
    const brass = this.material(0xd0a85d, { metalness: 0.72, roughness: 0.25 });

    const body = new THREE.Mesh(
      this.geometry(() => new THREE.CylinderGeometry(4.25, 4.55, 0.66, 48)),
      wood,
    );
    body.position.y = 1.12;
    body.scale.z = 0.62;
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    const edge = new THREE.Mesh(
      this.geometry(() => new THREE.TorusGeometry(3.92, 0.22, 10, 64)),
      woodEdge,
    );
    edge.rotation.x = Math.PI / 2;
    edge.scale.z = 0.62;
    edge.position.y = 1.48;
    edge.castShadow = edge.receiveShadow = true;
    g.add(edge);

    const play = new THREE.Mesh(
      this.geometry(() => new THREE.CylinderGeometry(3.72, 3.72, 0.08, 48)),
      felt,
    );
    play.rotation.x = Math.PI / 2;
    play.scale.z = 0.62;
    play.position.y = 1.45;
    play.receiveShadow = true;
    g.add(play);

    const inner = new THREE.Mesh(
      this.geometry(() => new THREE.TorusGeometry(2.78, 0.018, 6, 48)),
      feltLight,
    );
    inner.rotation.x = Math.PI / 2;
    inner.scale.z = 0.62;
    inner.position.y = 1.5;
    g.add(inner);

    const ring = new THREE.Mesh(
      this.geometry(() => new THREE.TorusGeometry(4.02, 0.045, 8, 64)),
      brass,
    );
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = 0.62;
    ring.position.y = 1.51;
    g.add(ring);

    const pedestal = new THREE.Mesh(
      this.geometry(() => new THREE.CylinderGeometry(1.45, 2.08, 1.05, 24)),
      wood,
    );
    pedestal.position.y = 0.47;
    pedestal.castShadow = pedestal.receiveShadow = true;
    g.add(pedestal);
    const foot = new THREE.Mesh(
      this.geometry(() => new THREE.CylinderGeometry(2.45, 2.65, 0.18, 32)),
      woodEdge,
    );
    foot.position.y = 0.08;
    foot.castShadow = foot.receiveShadow = true;
    g.add(foot);

    const plaque = new THREE.Mesh(
      this.geometry(() => new THREE.BoxGeometry(1.75, 0.1, 0.34)),
      brass,
    );
    plaque.position.set(0, 1.57, -0.08);
    plaque.rotation.x = -0.12;
    g.add(plaque);

    this.buildDecorativeChips(table);
  }

  seatPosition(table, index) {
    const seats = table.config.seats || [];
    const seat = seats[index];
    if (seat?.position) return new THREE.Vector3(seat.position.x, seat.position.y || 0, seat.position.z);
    const angle = (index / Math.max(1, seats.length || 5)) * Math.PI * 2;
    return new THREE.Vector3(
      table.config.position.x + Math.sin(angle) * 4.25,
      0,
      table.config.position.z + Math.cos(angle) * 2.65,
    );
  }

  buildDecorativeChips(table) {
    const chipGeometry = this.geometry(() => new THREE.CylinderGeometry(0.13, 0.13, 0.055, 16));
    const seats = table.config.seats || [];
    for (let i = 0; i < Math.max(5, seats.length); i++) {
      const p = this.seatPosition(table, i);
      const angle = Math.atan2(p.x - table.config.position.x, p.z - table.config.position.z);
      const base = new THREE.Vector3(
        (p.x - table.config.position.x) * 0.62,
        1.57,
        (p.z - table.config.position.z) * 0.62,
      );
      const count = 2 + ((i * 7) % 3);
      for (let j = 0; j < count; j++) {
        const chip = new THREE.Mesh(chipGeometry, this.chipMaterials[(i + j) % this.chipMaterials.length]);
        chip.position.set(base.x + Math.cos(angle) * (j % 2) * 0.22, base.y + j * 0.065, base.z + Math.sin(angle) * (j % 2) * 0.22);
        chip.rotation.y = (i * 0.47 + j * 0.23) % Math.PI;
        chip.castShadow = chip.receiveShadow = true;
        table.chips.add(chip);
      }
    }
  }

  chipValue(value) {
    const amount = Math.max(0, Number(value) || 0);
    return Math.max(1, Math.min(18, Math.ceil(amount / 10)));
  }

  addChipStack(parent, amount, colorOffset = 0) {
    const count = this.chipValue(amount);
    const stack = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const chip = new THREE.Mesh(this.chipGeometry, this.chipMaterials[(colorOffset + i) % this.chipMaterials.length]);
      chip.position.y = i * 0.065;
      chip.castShadow = chip.receiveShadow = true;
      stack.add(chip);
    }
    parent.add(stack);
    return stack;
  }

  clearBank(table) {
    for (const child of [...table.bank.children]) child.removeFromParent();
  }

  sync(summary) {
    const list = Array.isArray(summary) ? summary : summary ? [summary] : [];
    for (const item of list) {
      const table = this.tables.get(item.tableId) || this.addTable({
        tableId: item.tableId,
        position: item.position || { x: 80, y: 0, z: 83 },
        seats: item.seats || [],
      });
      const nextPot = Number(item.potAura ?? item.pot ?? 0) || 0;
      if (nextPot !== table.lastPot && table.lastPot === 0 && nextPot > 0)
        this.animateStake(table, nextPot, table.lastPot);
      table.lastPot = nextPot;
      table.lastRevision = Math.max(table.lastRevision, Number(item.revision) || 0);
      if (table.renderedPot !== nextPot) {
        this.clearBank(table);
        if (nextPot > 0) {
          const stack = this.addChipStack(table.bank, nextPot, 3);
          stack.position.set(0, 1.52, 0);
        }
        table.renderedPot = nextPot;
      }
    }
  }

  syncState(state) {
    if (!state?.tableId) return;
    const table = this.tables.get(state.tableId);
    if (!table || state.revision <= table.lastRevision) return;
    const previous = table.lastPot;
    table.lastRevision = state.revision;
    table.lastPot = state.potAura || 0;
    if (table.lastPot > previous) {
      const participant = state.participants?.filter((item) => !item.left).at(-1);
      const seatIndex = participant
        ? Math.max(0, (table.config.seats || []).findIndex((seat) => seat.seatId === participant.seatId))
        : Math.max(0, (table.config.seats || []).length - 1);
      this.animateStake(table, table.lastPot - previous, previous, seatIndex);
    }
    if (table.renderedPot !== table.lastPot) {
      this.clearBank(table);
      if (table.lastPot > 0) {
        const stack = this.addChipStack(table.bank, table.lastPot, 3);
        stack.position.set(0, 1.52, 0);
      }
      table.renderedPot = table.lastPot;
    }
  }

  animateStake(table, amount, previous = 0, seatIndex = null) {
    const participants = table.config.seats || [];
    const seat = this.seatPosition(table, seatIndex ?? Math.max(0, participants.length - 1));
    const from = new THREE.Vector3(seat.x - table.config.position.x, 1.62, seat.z - table.config.position.z);
    const token = this.addChipStack(table.dynamic, amount, Math.floor(previous / 10));
    token.position.copy(from);
    this.animations.push({ token, from: from.clone(), to: new THREE.Vector3(0, 1.54, 0), elapsed: 0, duration: 0.72 });
  }

  settle(payload) {
    if (!payload?.settlementId || this.lastSettlements.has(payload.settlementId)) return;
    this.lastSettlements.add(payload.settlementId);
    const table = this.tables.get(payload.tableId) || [...this.tables.values()][0];
    if (!table) return;
    const payouts = payload.payouts || [];
    const winner = payload.winnerPlayerId;
    const amount = Number(payload.potAura) || table.lastPot;
    const targetIndex = Math.max(0, (table.config.seats || []).findIndex((s) => s.playerId === winner));
    const target = this.seatPosition(table, targetIndex < 0 ? 0 : targetIndex);
    const to = new THREE.Vector3(target.x - table.config.position.x, 1.62, target.z - table.config.position.z);
    const token = this.addChipStack(table.dynamic, payouts[0]?.amountAura || amount, 1);
    token.position.set(0, 1.54, 0);
    this.animations.push({ token, from: token.position.clone(), to, elapsed: 0, duration: 0.86 });
    table.lastPot = 0;
    table.renderedPot = 0;
    // A new lobby starts its own server revision sequence after settlement.
    table.lastRevision = 0;
    this.clearBank(table);
  }

  update(dt) {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const a = this.animations[i];
      a.elapsed += dt;
      const t = THREE.MathUtils.clamp(a.elapsed / a.duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      a.token.position.lerpVectors(a.from, a.to, eased);
      a.token.position.y += Math.sin(t * Math.PI) * 0.55;
      if (t >= 1) {
        a.token.removeFromParent();
        this.animations.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const animation of this.animations) animation.token.removeFromParent();
    this.animations.length = 0;
    this.root.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.geometries.clear();
    this.materials.clear();
    this.tables.clear();
  }
}
