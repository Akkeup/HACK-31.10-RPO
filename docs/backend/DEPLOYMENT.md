# Discovery Server: Offline Deployment & Operations Manual

This guide documents the procedures for deploying the Discovery backend on Windows server machines in an entirely offline local network (LAN) environment.

## 1. Prerequisites & Environment

- **Operating System**: Windows 10/11 or Windows Server (x64)
- **Container Runtime**: Docker Desktop for Windows (WSL 2 backend) or native Windows services
- **Database**: PostgreSQL 18 (Alpine/Debian container or native Windows port 5432)
- **Web Proxy & SSL**: Caddy 2.x
- **Network Mode**: Offline LAN (no internet connection, no external CDN dependencies)

## 2. Architecture & Port Mapping

| Service | Internal Port | External Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Caddy** | 443 | 443 | HTTPS / WSS | Local TLS termination, no-store headers, reverse proxy |
| **Server** | 8080 | 8080 | HTTP 1.1 / WS | Authoritative Discovery game server |
| **PostgreSQL** | 5432 | 5432 | PostgreSQL 18 | Relational persistent store & state migrations |

## 3. Database Initialization & Migrations

Database migrations are located in `infra/migrations/` and execute automatically during container startup:

1. `001_initial_schema.sql`:
   - `users`: Core credentials and roles (`player`, `admin`).
   - `access_tokens`: Token sessions.
   - `config_revisions`: Versioned CAS JSON documents.
   - `player_progress`: Student knowledge achievements and revisions.
   - `player_checkpoints`: World location snapshots.
   - `interactions`: Educational NPC interaction records.
   - `npc_memories`: Multi-turn dialogue history.
   - `audit_logs`: Administrative config change trails.
2. `002_seed_data.sql`:
   - Initial test accounts (`player1` through `player6`, `admin`).
   - Default progress records.
3. `003_seed_config.sql`:
   - Revision 1 of `world-config`, `character-config`, `render-config`, and `npc-behavior-config`.
4. `004_competition_and_aura.sql`:
   - `wallets`: User virtual currency accounts (balance, reserved, available).
   - `wallet_ledger`: Append-only transactional audit trail.
   - `competition_matches`: Match records, stakes, pot, outcome, and settlements.
   - `competition_participants`: Participant state, seat assignments, scores, and payouts.
   - `competition_answers`: Individual question responses and timestamps.
   - `player_activities`: Activity mode (`exploring`, `seated_competition`), target, seat, and revision tracking.
5. `005_seed_config_v110.sql`:
   - Config revision for protocol 1.1.0 including `economy` and `competition.tables`.

## 4. Running via Docker Compose

To start the full stack (PostgreSQL 18, Discovery Server, Caddy Reverse Proxy):

```powershell
# Build and launch all background containers
docker compose -f infra/docker-compose.yml up --build -d

# Check health and status of containers
docker compose -f infra/docker-compose.yml ps

# Follow live server logs
docker compose -f infra/docker-compose.yml logs -f server
```

The services will be reachable at:
- **HTTPS & WSS**: `https://localhost` / `https://discovery.lan`
- **Health Check**: `https://localhost/health/live`
- **World Manifest**: `https://localhost/api/v1/worlds/discovery-campus/manifest`

## 5. Running Standalone on Native Windows

If running without containers on Windows:

```powershell
# 1. Start PostgreSQL 18 Windows service (port 5432)
Start-Service postgresql-x64-18

# 2. Compile standalone binary (offline)
$env:PATH += ";C:\Users\user\.cargo\bin"
rustc --edition 2021 -O apps/server/src/main.rs -o apps/server/discovery-server.exe

# 3. Launch server
& "apps/server/discovery-server.exe"
```

## 6. Verification & Automated Test Suite

To run the automated verification suite against the active deployment:

```powershell
# Validate protocol 1.1.0 schemas and fixtures
node discovery-protocol-1.1.0/tools/validate.cjs

# Run competition table and virtual currency Aura end-to-end test suite
node discovery-protocol-1.1.0/mock/test_competition_e2e.mjs
```

### Verified Scenarios:
1. `join-two-players`: 2 players authenticate, negotiate interest, synchronize movement, and verify room status `active`.
2. `sixth-player`: 5 players join; 6th player rejected with HTTP 409 `SESSION_FULL`.
3. `cache-boundary`: Manifest verified ($W = 22887$, $B = 2288 = \lfloor W / 10 \rfloor$); interest payloads obey cache limit.
4. `reconnect`: Disconnection during movement resets velocity after 250 ms silence; reconnection within 60s preserves identity and resets sequence to 1.
5. `admin-cas`: Concurrent configuration update with ETag `"config-1"` succeeds; stale ETag returns 412 `CONFIG_CONFLICT`.
6. `npc-interact & npc-timeout`: NPC dialogue matching knowledge base, progress updates, and idempotent duplicate handling.
7. `competition & aura`: 2–5 player table seating (`competition-seat-1`..`5`), activity conflict checking, stake reservation, match pot escrow, 5-round Q&A simulation with server deadlines, authoritative scoring, winner pot payout (+20 Aura), and transactional ledger audit trail.
