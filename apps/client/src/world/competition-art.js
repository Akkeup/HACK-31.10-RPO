import * as THREE from "three";
import { splitAura, chipTotal, newCommittedStakes } from "./chip-bank.js";

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
    this.denomColors = new Map([
      [500, 0x672f75],
      [100, 0xc94f5f],
      [25, 0x287f65],
      [10, 0x4e82b6],
      [5, 0xd6ad52],
      [1, 0xf0e3c2],
    ]);
    this.chipMaterials = new Map(
      [...this.denomColors].map(([amount, color]) => [
        amount,
        this.material(color, { roughness: 0.49 }),
      ]),
    );
    this.chipGeometry = this.geometry(
      () => new THREE.CylinderGeometry(0.093, 0.093, 0.036, 20),
    );
    // All measurements are in the same world units as the five confirmed seats.
    // The 2.3m seat radius leaves a 0.55m knee clearance around this 3.2×2.0m top.
    this.dimensions = Object.freeze({
      halfX: 2.23,
      halfZ: 1.49,
      feltY: 1.05,
      chipY: 1.119,
    });
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
    if (!config?.tableId || this.tables.has(config.tableId))
      return this.tables.get(config.tableId);
    const seatRadii = (config.seats || [])
      .map((seat) =>
        Math.hypot(
          seat.position.x - config.position.x,
          seat.position.z - config.position.z,
        ),
      )
      .filter((radius) => radius > 0);
    const radius = seatRadii.length
      ? seatRadii.reduce((sum, value) => sum + value, 0) / seatRadii.length
      : 2.3;
    this.visualScale = THREE.MathUtils.clamp(radius / 2.3, 0.5, 1.15);
    this.dimensions = {
      halfX: 2.23 * this.visualScale,
      halfZ: 1.49 * this.visualScale,
      feltY: 1.05,
      chipY: 1.119,
    };
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
      seatByPlayer: new Map(),
      lastState: null,
      lobbyId: null,
      matchId: null,
      committed: new Map(),
      bankAnimations: 0,
      settledMatchId: null,
      // Reconstructed on reconnect from the authoritative summary.
      drawnAmount: 0,
    };
    table.root.name = `emerald-table-${config.tableId}`;
    table.root.position.set(
      config.position.x,
      config.position.y || 0,
      config.position.z,
    );
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

    const { halfX, halfZ, feltY } = this.dimensions;
    const body = new THREE.Mesh(
      this.geometry(
        () => new THREE.CylinderGeometry(halfX + 0.16, halfX + 0.26, 0.48, 48),
      ),
      wood,
    );
    body.position.y = 0.86;
    body.scale.z = (halfZ + 0.16) / (halfX + 0.16);
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    const edge = new THREE.Mesh(
      this.geometry(() => new THREE.TorusGeometry(halfX + 0.12, 0.15, 10, 64)),
      woodEdge,
    );
    edge.rotation.x = Math.PI / 2;
    // TorusGeometry starts in the XY plane; after X rotation its local Y maps to Z.
    edge.scale.y = (halfZ + 0.12) / (halfX + 0.12);
    edge.position.y = feltY + 0.025;
    edge.castShadow = edge.receiveShadow = true;
    g.add(edge);

    const play = new THREE.Mesh(
      this.geometry(
        () => new THREE.CylinderGeometry(halfX - 0.13, halfX - 0.13, 0.065, 48),
      ),
      felt,
    );
    // CylinderGeometry is already horizontal: do not rotate it.
    play.scale.z = (halfZ - 0.13) / (halfX - 0.13);
    play.position.y = feltY;
    play.receiveShadow = true;
    g.add(play);

    const inner = new THREE.Mesh(
      this.geometry(() => new THREE.TorusGeometry(halfX * 0.68, 0.014, 6, 48)),
      feltLight,
    );
    inner.rotation.x = Math.PI / 2;
    inner.scale.y = halfZ / halfX;
    inner.position.y = feltY + 0.04;
    g.add(inner);

    const ring = new THREE.Mesh(
      this.geometry(() => new THREE.TorusGeometry(halfX + 0.14, 0.026, 8, 64)),
      brass,
    );
    ring.rotation.x = Math.PI / 2;
    ring.scale.y = (halfZ + 0.14) / (halfX + 0.14);
    ring.position.y = feltY + 0.04;
    g.add(ring);

    const pedestal = new THREE.Mesh(
      this.geometry(() => new THREE.CylinderGeometry(0.55, 0.82, 0.86, 24)),
      wood,
    );
    pedestal.position.y = 0.43;
    pedestal.castShadow = pedestal.receiveShadow = true;
    g.add(pedestal);
    const foot = new THREE.Mesh(
      this.geometry(() => new THREE.CylinderGeometry(1.1, 1.22, 0.14, 32)),
      woodEdge,
    );
    foot.position.y = 0.08;
    foot.castShadow = foot.receiveShadow = true;
    g.add(foot);

    // Keep the middle clear for the actual pot. No solid plaque blocking chips.

    this.buildDecorativeChips(table);
    this.buildLuxurySeats(table);
  }

  buildLuxurySeats(table) {
    const walnut = this.material(0x4a2b1d, { roughness: 0.46 });
    const leather = this.material(0x26332d, { roughness: 0.72 });
    const highlight = this.material(0x8e6f4e, {
      metalness: 0.28,
      roughness: 0.38,
    });
    const cushion = this.material(0x405047, { roughness: 0.8 });
    const box = (parent, mat, x, y, z, w, h, d) => {
      const mesh = new THREE.Mesh(
        this.geometry(() => new THREE.BoxGeometry(w, h, d)),
        mat,
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    for (let i = 0; i < (table.config.seats || []).length; i++) {
      const seat = this.seatPosition(table, i);
      const dx = seat.x - table.config.position.x;
      const dz = seat.z - table.config.position.z;
      const chair = new THREE.Group();
      chair.position.set(dx, 0, dz);
      chair.rotation.y = Math.atan2(dx, dz);
      chair.scale.setScalar(this.visualScale);
      table.root.add(chair);
      // High-backed upholstered club chairs, not classroom furniture.
      box(chair, walnut, 0, 0.43, 0, 0.95, 0.18, 0.84);
      box(chair, cushion, 0, 0.56, -0.03, 0.86, 0.13, 0.74);
      box(chair, leather, 0, 1.24, 0.37, 0.95, 1.28, 0.2);
      box(chair, cushion, 0, 1.26, 0.245, 0.79, 1.05, 0.1);
      box(chair, highlight, 0, 1.9, 0.35, 0.96, 0.07, 0.24);
      for (const side of [-1, 1]) {
        box(chair, walnut, side * 0.45, 0.82, -0.02, 0.14, 0.18, 0.92);
        box(chair, leather, side * 0.45, 0.94, -0.07, 0.18, 0.13, 0.77);
        for (const z of [-0.27, 0.3])
          box(chair, walnut, side * 0.37, 0.2, z, 0.11, 0.42, 0.11);
      }
    }
  }

  seatPosition(table, index) {
    const seats = table.config.seats || [];
    const seat = seats[index];
    if (seat?.position)
      return new THREE.Vector3(
        seat.position.x,
        seat.position.y || 0,
        seat.position.z,
      );
    const angle = (index / Math.max(1, seats.length || 5)) * Math.PI * 2;
    return new THREE.Vector3(
      table.config.position.x + Math.sin(angle) * 2.3,
      0,
      table.config.position.z + Math.cos(angle) * 2.3,
    );
  }

  chipMesh(denomination) {
    const chip = new THREE.Mesh(
      this.chipGeometry,
      this.chipMaterials.get(denomination),
    );
    chip.userData.aura = denomination;
    chip.castShadow = true;
    return chip;
  }

  buildDecorativeChips(table) {
    const seats = table.config.seats || [];
    const denominations = [25, 10, 5, 1];
    for (let i = 0; i < Math.max(5, seats.length); i++) {
      const position = this.chipSeatPoint(table, i);
      for (let j = 0; j < 3; j++) {
        const chip = this.chipMesh(
          denominations[(i + j) % denominations.length],
        );
        chip.position.set(
          position.x + j * 0.108,
          position.y + j * 0.039,
          position.z,
        );
        table.chips.add(chip);
      }
    }
  }

  chipSeatPoint(table, index) {
    const seat = this.seatPosition(table, index);
    const dx = seat.x - table.config.position.x;
    const dz = seat.z - table.config.position.z;
    const length = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(
      (dx / length) * 1.32,
      this.dimensions.chipY,
      (dz / length) * 0.87,
    );
  }

  // A chip with a denomination is always exactly that amount. No visual rounding.
  stackChips(parent, amount, at, colorOffset = 0) {
    const values = splitAura(amount);
    const stack = new THREE.Group();
    const piles = Math.max(1, Math.ceil(values.length / 7));
    for (let i = 0; i < values.length; i++) {
      const chip = this.chipMesh(values[i]);
      const pile = Math.floor(i / 7);
      chip.position.set(
        (pile - (piles - 1) / 2) * 0.195,
        (i % 7) * 0.038,
        ((colorOffset % 3) - 1) * 0.014,
      );
      stack.add(chip);
    }
    stack.position.copy(at);
    parent.add(stack);
    stack.userData.aura = chipTotal(values);
    return stack;
  }

  clearBank(table) {
    for (const child of [...table.bank.children]) child.removeFromParent();
    table.drawnAmount = 0;
  }

  drawBank(table, amount) {
    this.clearBank(table);
    if (!amount) return;
    const confirmed = [...table.committed.entries()];
    if (
      confirmed.length &&
      confirmed.reduce((sum, [, value]) => sum + value, 0) === amount
    ) {
      for (const [index, [id, value]] of confirmed.entries()) {
        const seatId = table.seatByPlayer.get(id);
        const seatIndex = table.config.seats.findIndex(
          (seat) => seat.seatId === seatId,
        );
        this.placeBankStake(table, value, seatIndex >= 0 ? seatIndex : index);
      }
    } else {
      // Recovery snapshot with aggregate amount but no author/seat breakdown.
      this.stackChips(
        table.bank,
        amount,
        new THREE.Vector3(0, this.dimensions.chipY, 0),
      );
    }
    table.drawnAmount = amount;
  }

  bankPoint(seatIndex) {
    const angle = (Math.PI * 2 * seatIndex) / 5;
    return new THREE.Vector3(
      Math.cos(angle) * 0.45,
      this.dimensions.chipY,
      Math.sin(angle) * 0.36,
    );
  }

  placeBankStake(table, amount, seatIndex) {
    return this.stackChips(
      table.bank,
      amount,
      this.bankPoint(seatIndex),
      seatIndex,
    );
  }

  stopAnimations(table) {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      if (this.animations[i].table !== table) continue;
      this.animations[i].token.removeFromParent();
      this.animations.splice(i, 1);
    }
    table.bankAnimations = 0;
  }

  sync(summary) {
    for (const item of Array.isArray(summary)
      ? summary
      : summary
        ? [summary]
        : []) {
      const table =
        this.tables.get(item.tableId) ||
        this.addTable({
          tableId: item.tableId,
          position: item.position || { x: 80, y: 0, z: 83 },
          seats: item.seats || [],
        });
      const nextPot = item.potAura ?? item.pot;
      if (nextPot == null || table.bankAnimations) continue;
      // Once there is a full competition.state for the same lobby, don't let
      // lossy world.snapshot summaries overwrite the more specific bank.
      if (table.lastState) continue;
      const amount = Number(nextPot) || 0;
      if (amount !== table.drawnAmount) this.drawBank(table, amount);
    }
  }

  syncState(state) {
    if (!state?.tableId) return;
    const table = this.tables.get(state.tableId);
    if (!table) return;
    const first = !table.lastState;
    const newLobby = table.lobbyId && table.lobbyId !== state.lobbyId;
    if (newLobby) {
      this.stopAnimations(table);
      this.clearBank(table);
      table.committed.clear();
      table.lastState = null;
      table.lastRevision = 0;
      table.matchId = null;
      table.settledMatchId = null;
    }
    if (!newLobby && state.revision <= table.lastRevision) return;
    const previous = table.lastState;
    const committed = newCommittedStakes(previous, state);
    table.lobbyId = state.lobbyId;
    table.matchId = state.matchId;
    table.lastRevision = state.revision;
    table.lastState = state;
    table.lastPot = state.potAura;
    table.seatByPlayer = new Map(
      (state.participants || []).map((p) => [p.playerId, p.seatId]),
    );
    if (
      table.settledMatchId &&
      table.settledMatchId === state.matchId &&
      ["finished", "cancelled"].includes(state.status)
    ) {
      // Keep already-authorized payout flight alive: only the pot is empty.
      this.clearBank(table);
      return;
    }
    if (committed.length) {
      table.committed = new Map(committed.map((p) => [p.playerId, p.amount]));
      // Every accepted wager is shown, not just the last participant.
      this.stopAnimations(table);
      this.clearBank(table);
      committed.forEach((p, index) => {
        const seatIndex = table.config.seats.findIndex(
          (seat) => seat.seatId === p.seatId,
        );
        if (seatIndex < 0) return;
        this.animateStake(table, p.amount, seatIndex, index * 0.12);
      });
    } else if (!table.bankAnimations && table.drawnAmount !== state.potAura) {
      // Reconnect, configuration update, or new lobby: authoritative exact reconstruction.
      if (first || newLobby || !previous || previous.status !== state.status)
        table.committed.clear();
      this.drawBank(table, state.potAura);
    }
  }

  animateStake(table, amount, seatIndex, delay = 0) {
    const from = this.chipSeatPoint(table, seatIndex);
    const to = this.bankPoint(seatIndex);
    const token = this.stackChips(table.dynamic, amount, from, seatIndex);
    table.bankAnimations++;
    this.animations.push({
      table,
      token,
      from: from.clone(),
      to,
      delay,
      elapsed: 0,
      duration: 0.85,
      onComplete: () => {
        // At the end of every flight, exactly the accepted denominations
        // remain in the persistent central bank.
        this.placeBankStake(table, amount, seatIndex);
        table.drawnAmount += amount;
        table.bankAnimations--;
        if (table.bankAnimations === 0 && table.drawnAmount !== table.lastPot)
          this.drawBank(table, table.lastPot);
      },
    });
  }

  settle(payload) {
    if (
      !payload?.settlementId ||
      this.lastSettlements.has(payload.settlementId)
    )
      return;
    this.lastSettlements.add(payload.settlementId);
    // Recent settlement replay protection; bounded for long-running sessions.
    if (this.lastSettlements.size > 512)
      this.lastSettlements.delete(this.lastSettlements.values().next().value);
    const table =
      this.tables.get(payload.tableId) || [...this.tables.values()][0];
    if (!table) return;
    this.stopAnimations(table);
    this.clearBank(table);
    table.settledMatchId = payload.matchId;
    const recipients = (payload.payouts || []).filter((p) => p.amountAura > 0);
    for (const [index, payout] of recipients.entries()) {
      const seatId = table.seatByPlayer.get(payout.playerId);
      const seatIndex = table.config.seats.findIndex(
        (seat) => seat.seatId === seatId,
      );
      if (seatIndex < 0) continue;
      const at = this.bankPoint(index);
      const token = this.stackChips(
        table.dynamic,
        payout.amountAura,
        at,
        index,
      );
      this.animations.push({
        table,
        token,
        from: at,
        to: this.chipSeatPoint(table, seatIndex),
        elapsed: 0,
        delay: 0,
        duration: 0.9,
      });
    }
    table.lastPot = 0;
    table.renderedPot = 0;
    table.committed.clear();
    // The lobby lifecycle is identified by lobbyId, never merely by revision.
  }

  update(dt) {
    const offset = new THREE.Vector3();
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const animation = this.animations[i];
      animation.elapsed += Math.min(0.1, Math.max(0, dt));
      if (animation.elapsed < animation.delay) continue;
      const t = THREE.MathUtils.clamp(
        (animation.elapsed - animation.delay) / animation.duration,
        0,
        1,
      );
      const eased = t * t * (3 - 2 * t);
      offset.lerpVectors(animation.from, animation.to, eased);
      animation.token.position.set(
        offset.x,
        offset.y + Math.sin(t * Math.PI) * 0.28,
        offset.z,
      );
      if (t === 1) {
        animation.token.removeFromParent();
        this.animations.splice(i, 1);
        animation.onComplete?.();
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
