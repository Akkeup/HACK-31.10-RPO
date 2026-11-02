# Discovery Server: Backend Architecture & Design

## 1. System Overview

Discovery is a browser-based educational multiplayer 3D world (educational campus) with an authoritative server model, spatial chunking, and local adaptive NPC AI.

The backend is built in pure Rust for high performance, zero external dependency footprint, and fully offline compilation and deployment.

### Key Technology Stack
- **Language**: Rust (2021 Edition)
- **Web & API Framework**: Native HTTP 1.1 / RFC 6455 WebSocket Engine (`discovery.v1`)
- **Database**: PostgreSQL 18 (with connection pooling and native binary frontend-backend protocol)
- **Security & TLS**: Caddy reverse proxy with self-signed local TLS (`tls internal`)
- **Local AI**: Adaptive rule-based knowledge engine + Ollama model-agnostic internal interface

```mermaid
graph TD
    Client1["Three.js Web Client 1"] <-->|WSS / HTTPS| Caddy["Caddy Reverse Proxy (:443)"]
    Client2["Three.js Web Client 2"] <-->|WSS / HTTPS| Caddy
    Caddy <-->|HTTP / WS (:8080)| Server["Rust Authoritative Server"]
    Server <-->|PostgreSQL Protocol (:5432)| DB[("PostgreSQL 18")]
    Server <-->|Local AI Engine| Knowledge["Knowledge Assets JSON"]
```

## 2. Authoritative Server & Room Lifecycle

The server maintains total authority over positions, physics, and interactions. Clients predict movement locally and send input vectors (`moveX`, `moveZ`, `yawRad`, `running`, `inputSeq`).

### Simulation Properties
- **Tick Rate**: 20 Hz simulation loop (50 ms delta time $dt = 0.05$).
- **Snapshot Rate**: 10 Hz broadcast / event-driven on client ready and input.
- **Velocity Normalization**: Input vectors with Euclidean magnitude $\|(v_x, v_z)\| > 1$ are normalized to unit length, preventing diagonal speed exploits.
- **World Bounds**: Player coordinates are clamped to the valid world grid $[0, 320)$ meters ($10 \times 10$ chunks of 32 m).
- **Room Capacity**: 2 to 5 players per session.
  - Count $< 2$: Session status is `"waiting"` or `"paused"`.
  - Count $\ge 2$: Session status is `"active"`.
  - 6th player attempt returns HTTP 409 `SESSION_FULL`.
- **Grace Period & Input Silence**:
  - Input silence $> 250$ ms resets velocity to zero (prevents ghost walking).
  - Disconnected players retain their entity reservation for 60 seconds.

## 3. Spatial Chunking & 10% Client Cache Limit

The virtual campus is divided into square chunks of 32 meters along the X and Z axes. Coordinates are mapped via:
$$cx = \lfloor x / 32 \rfloor, \quad cz = \lfloor z / 32 \rfloor$$

### Invariant: Strict 10% Budget Limit
To guarantee high performance on resource-constrained student browser devices, client cache usage must strictly satisfy:
$$\text{residentBytes} + \text{reservedBytes} \le B = \left\lfloor \frac{W}{10} \right\rfloor$$

For the campus dataset:
- Total World Weight $W = 22887$ bytes
- Maximum Allowed Client Cache Budget $B = \lfloor 22887 / 10 \rfloor = 2288$ bytes
- Spatial interest sets (`world.interest`) dynamically assemble candidate chunks and GLTF asset descriptors while enforcing $\sum \text{byteSize} \le 2288$.

## 4. Configuration Management & Hot Reload (CAS)

Server world parameters, movement physics, visual configs, and NPC behavior are stored as versioned JSON documents in PostgreSQL `config_revisions`.

### Administrative CAS API
- **Endpoint**: `GET` and `PUT` `/api/v1/admin/worlds/:world_id/config`
- **Concurrency Control**: Enforced using HTTP `ETag` and `If-Match` headers (`"config-{revision}"`).
- **Conflict Handling**: If the submitted `If-Match` does not match the current revision, the server rejects the write with HTTP 412 `CONFIG_CONFLICT`.
- **Hot Reload vs Restart**:
  - Hot reloadable fields (e.g. `character.walkSpeedMps`, ambient lighting) apply immediately to active simulation without dropping clients.
  - Structural modifications (e.g. changing `chunkSizeM` or grid dimensions) return HTTP 409 `RESTART_REQUIRED` when active sessions exist.

## 5. Local Adaptive NPC AI & Knowledge Architecture

Educational NPCs (such as `npc-guide`) guide students through scientific concepts.

### Internal AI Interface & Decoupling
The game server decouples AI execution through the `NpcAiService`:
1. **Keyword Rule Matcher**: Matches player questions against keyword indices stored in `assets/npc/knowledge/discovery-basics.json`.
2. **Adaptive Explanation Level**:
   - `simple`: Introductory dialogue.
   - `advanced`: In-depth scientific terminology.
   - `adaptive`: Dynamically promotes student from simple to advanced once they achieve $\ge 1$ knowledge milestone.
3. **Idempotency & Timeout Handling**:
   - Every interaction carries a unique client `requestId` (UUID).
   - Server caches interaction results in the `interactions` table. Replays with duplicate `requestId` immediately return the identical cached response.
   - If a provider times out, fallback scientific responses are returned.
4. **Dialogue Memory & Progress Commits**:
   - Interaction turns are recorded in `npc_memories` with sequential `turn_index` and roles (`user`, `npc`).
   - Earned knowledge units increment `player_progress.revision` and broadcast `progress.updated` events over WebSocket.

## 6. Competitive Table (`competitionTable`) & Match Simulation

A dedicated authoritative competition table entity (`competition-central`) is located in the central educational campus area with 5 designated player seats (`competition-seat-1` through `5`).

### Seating & Conflict Invariants
- Each seat has a defined 3D coordinate, view direction (`yawRad`), and safe exit position.
- Server validates that players are within interaction range ($\le 3$ m) before seating.
- Players entering a table transition to activity state `seated_competition`.
- A player cannot be seated simultaneously at an examiner station and at the competition table (HTTP/WS error 409 `ACTIVITY_CONFLICT`).
- Once a match begins, new players cannot take seats or join the lobby (error 409 `MATCH_STARTED`).

### Lobby Lifecycle
1. **Creation**: The first participant becomes the table owner, chooses subject (`mathematics`, `informatics`, `history`), and specifies the stake in Aura.
2. **Joining & Confirmation**: Subsequent players take vacant seats (`competition.join`) and confirm readiness (`competition.ready`). Readying reserves the stake.
3. **Configuration & Unready**: Modifying the subject or stake (`competition.configure`) unreadies all participants and atomically returns reserved funds.
4. **Authoritative Launch**: Starting (`competition.start`) requires 2–5 players, all marked ready. Stakes are atomically moved into match pot ($pot = N \times stake$).

### Question Round Mechanics
- Matches are tied to `contentVersion` from local verified educational content packs.
- Default match length: 5 questions, 4 options, 1 correct, 1 point per correct answer, up to 20s per question with server deadline timestamp (`deadlineAt`).
- At most one answer per player per round (`competition.answer`); duplicates return `ANSWER_ALREADY_ACCEPTED`.
- Rounds close when all active participants submit answers or the server deadline expires. `competition.round.closed` reveals correct option and explanation.
- Winner takes entire pot. In case of tie/draw, 100% of stakes are refunded to all participants.
- Disconnected players can recover state via `GET /api/v1/competition/matches/:matchId/me`.

## 7. Virtual Currency "Aura" & Transactional Ledger Guarantees

Aura is the authoritative, integer-only virtual game currency used for educational competition stakes and progression rewards.

### Balance Invariants
- Each account receives an initial grant of 100 units (`wallets` table).
- Balance properties:
  - $\text{availableAura} = \text{balanceAura} - \text{reservedAura}$
  - Database constraint: `CHECK (reserved_aura >= 0 AND reserved_aura <= balance_aura)`
  - An account can never reach a negative available balance or double-spend funds.

### Double-Spend Prevention & Ledger Audit Trail
Every currency modification is committed to the append-only `wallet_ledger` within an ACID transaction:
- **`initial`**: One-time grant of 100 Aura upon registration.
- **`reserve`**: Holds stake during competition lobby readiness.
- **`release`**: Returns held stake if player leaves or lobby is reconfigured before match start.
- **`stake`**: Deducts stake from wallet and reserves it into match pot upon start.
- **`payout`**: Awards pot to winner upon match settlement.
- **`refund`**: Restores stake upon match draw or cancellation.

All operations require an idempotent `transaction_id`. Duplicate requests are detected by unique constraint and safely no-oped. Client never dictates payouts, winners, or final balances.
