// game.rs: Authoritative Game Loop, 2-5 Player Synchronization, Movement & Room Lifecycle

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::db::DbPool;
use crate::models::{NpcDto, PlayerDto, PositionDto, SessionDto};

#[derive(Debug, Clone)]
pub struct PlayerState {
    pub player_id: String,
    pub user_id: String,
    pub display_name: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub yaw_rad: f64,
    pub connected: bool,
    pub last_input_time: u64,
    pub last_input_seq: u64,
    pub move_x: f64,
    pub move_z: f64,
    pub running: bool,
    pub disconnect_time: Option<u64>,
    pub conn_id: u64,
    pub activity_mode: String,
    pub activity_target_id: Option<String>,
    pub activity_seat_id: Option<String>,
    pub location_id: String,
    pub telemetry: Option<crate::models::ClientTelemetryDto>,
}

#[derive(Debug, Clone)]
pub struct NpcEntity {
    pub npc_id: String,
    pub display_name: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub yaw_rad: f64,
    pub state: String,
    pub subject: String,
    pub role: String,
    pub module_id: String,
    pub control_mode: String,
    pub target_x: Option<f64>,
    pub target_z: Option<f64>,
    pub speed_mult: f64,
    pub personality_prompt: Option<String>,
    pub decision_log: Vec<(u64, String)>,
}

#[derive(Debug, Clone)]
pub struct UniverseSimulationState {
    pub paused: bool,
    pub step_ticks_remaining: u32,
    pub time_scale: f64,
    pub walk_speed_override: Option<f64>,
    pub run_multiplier_override: Option<f64>,
    pub interaction_radius_override: Option<f64>,
    pub gravity: f64,
    pub time_of_day: String,
    pub tick_duration_ms: f64,
    pub actual_tps: f64,
    pub last_tick_timestamp: u64,
    pub tick_counter: u64,
}

pub struct Room {
    pub session_id: String,
    pub world_id: String,
    pub world_revision: u64,
    pub players: HashMap<String, PlayerState>,
    pub user_to_player: HashMap<String, String>,
    pub tick: u64,
}

impl Room {
    pub fn new(session_id: &str, world_id: &str, world_revision: u64) -> Self {
        Self {
            session_id: session_id.to_string(),
            world_id: world_id.to_string(),
            world_revision,
            players: HashMap::new(),
            user_to_player: HashMap::new(),
            tick: 0,
        }
    }

    pub fn connected_count(&self) -> usize {
        self.players.values().filter(|p| p.connected).count()
    }

    pub fn get_status(&self) -> &'static str {
        let count = self.connected_count();
        if count >= 1 {
            "active"
        } else if self.tick > 0 && count < 1 {
            "paused"
        } else {
            "waiting"
        }
    }
}
impl Room {
    pub fn now_ms() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
    }

    pub fn join_player(&mut self, user_id: &str, display_name: &str) -> Result<String, (u16, &'static str, &'static str)> {
        // If already in room, check if player state still exists
        if let Some(player_id) = self.user_to_player.get(user_id) {
            if let Some(p) = self.players.get_mut(player_id) {
                if !p.connected && p.disconnect_time.is_none() {
                    p.disconnect_time = Some(Self::now_ms());
                }
                return Ok(player_id.clone());
            }
        }
        // If stale mapping existed without PlayerState, remove it
        self.user_to_player.remove(user_id);

        // Check 5 player limit
        if self.players.len() >= 5 {
            return Err((409, "SESSION_FULL", "Session is full (maximum 5 players)"));
        }

        let player_id = crate::auth::AuthService::generate_id();
        let spawn_idx = self.players.len();
        let spawn_offsets = [(0.0, 0.0), (2.0, 0.0), (-2.0, 0.0), (0.0, 2.0), (0.0, -2.0)];
        let (ox, oz) = spawn_offsets[spawn_idx % spawn_offsets.len()];
        let player = PlayerState {
            player_id: player_id.clone(),
            user_id: user_id.to_string(),
            display_name: display_name.to_string(),
            x: 80.0 + ox,
            y: 0.0,
            z: 92.0 + oz,
            yaw_rad: 0.0,
            connected: false,
            last_input_time: Self::now_ms(),
            last_input_seq: 0,
            move_x: 0.0,
            move_z: 0.0,
            running: false,
            disconnect_time: Some(Self::now_ms()),
            conn_id: 0,
            activity_mode: "exploring".to_string(),
            activity_target_id: None,
            activity_seat_id: None,
            location_id: "reading-room-main".to_string(),
            telemetry: None,
        };

        self.user_to_player.insert(user_id.to_string(), player_id.clone());
        self.players.insert(player_id.clone(), player);
        Ok(player_id)
    }

    pub fn mark_connected(&mut self, player_id: &str, conn_id: u64) {
        if let Some(p) = self.players.get_mut(player_id) {
            p.connected = true;
            p.conn_id = conn_id;
            p.disconnect_time = None;
            p.last_input_seq = 0;
            p.last_input_time = Self::now_ms();
        }
    }

    pub fn mark_disconnected(&mut self, player_id: &str, conn_id: u64) {
        if let Some(p) = self.players.get_mut(player_id) {
            if p.conn_id == conn_id || conn_id == 0 {
                p.connected = false;
                p.move_x = 0.0;
                p.move_z = 0.0;
                p.disconnect_time = Some(Self::now_ms());
            }
        }
    }

    pub fn remove_player(&mut self, user_id: &str) {
        if let Some(player_id) = self.user_to_player.remove(user_id) {
            self.players.remove(&player_id);
        }
    }
}
impl Room {
    pub fn handle_input(&mut self, player_id: &str, input_seq: u64, mut move_x: f64, mut move_z: f64, yaw_rad: f64, running: bool, walk_speed: f64, run_mul: f64) {
        if let Some(p) = self.players.get_mut(player_id) {
            if input_seq < p.last_input_seq && p.last_input_seq > 50 {
                p.last_input_seq = 0;
            }
            if input_seq > p.last_input_seq {
                let seq_diff = (input_seq - p.last_input_seq).min(5);
                p.last_input_seq = input_seq;
                p.yaw_rad = yaw_rad;
                p.running = running;
                p.last_input_time = Self::now_ms();
                self.tick += 1;

                // Prevent diagonal speed exploit by normalizing if length > 1
                let len = (move_x * move_x + move_z * move_z).sqrt();
                if len > 1.0 {
                    move_x /= len;
                    move_z /= len;
                }
                p.move_x = move_x;
                p.move_z = move_z;

                if move_x != 0.0 || move_z != 0.0 {
                    let speed = if running { walk_speed * run_mul } else { walk_speed };
                    let dt = 0.05 * (seq_diff as f64);
                    p.x = (p.x + move_x * speed * dt).clamp(0.0, 319.9);
                    p.z = (p.z + move_z * speed * dt).clamp(0.0, 319.9);
                }
            }
        }
    }

    pub fn tick_simulation(&mut self, walk_speed: f64, run_mul: f64, max_silence_ms: u64) -> Vec<String> {
        self.tick += 1;
        let is_active = self.get_status() == "active";
        let now = Self::now_ms();
        let dt = 1.0 / 20.0; // 20 Hz tick

        // Clean up expired reservations (default 60s grace period, configurable via GRACE_PERIOD_MS)
        let grace_ms = std::env::var("GRACE_PERIOD_MS").ok().and_then(|v| v.parse().ok()).unwrap_or(60_000);
        let mut expired_user_ids = Vec::new();
        self.players.retain(|_, p| {
            if !p.connected {
                if let Some(disc) = p.disconnect_time {
                    if now.saturating_sub(disc) > grace_ms {
                        expired_user_ids.push(p.user_id.clone());
                        return false;
                    }
                }
            }
            true
        });

        // Also clean up user_to_player mappings for expired users
        for uid in &expired_user_ids {
            self.user_to_player.remove(uid);
        }

        for p in self.players.values_mut() {
            if !p.connected {
                continue;
            }

            // Input silence check (250ms): reset movement if silent
            if now.saturating_sub(p.last_input_time) > max_silence_ms {
                p.move_x = 0.0;
                p.move_z = 0.0;
            }

        }
        expired_user_ids
    }
}
impl Room {
    pub fn to_dto(&self) -> SessionDto {
        let players: Vec<PlayerDto> = self.players.values().map(|p| PlayerDto {
            player_id: p.player_id.clone(),
            display_name: p.display_name.clone(),
            position: PositionDto { x: p.x, y: p.y, z: p.z },
            yaw_rad: p.yaw_rad,
            connected: p.connected,
            last_processed_input_seq: p.last_input_seq,
            activity: crate::models::ActivityDto {
                mode: p.activity_mode.clone(),
                target_id: p.activity_target_id.clone(),
                seat_id: p.activity_seat_id.clone(),
            },
        }).collect();

        SessionDto {
            session_id: self.session_id.clone(),
            world_id: self.world_id.clone(),
            world_revision: self.world_revision,
            status: self.get_status().to_string(),
            max_players: 5,
            players,
        }
    }
}

pub struct GameManager {
    rooms: Mutex<HashMap<String, Room>>,
    user_session: Mutex<HashMap<String, String>>, // user_id -> session_id
    pub npcs: Mutex<HashMap<String, NpcEntity>>,
    pub simulation: Mutex<UniverseSimulationState>,
    pub snapshots: Mutex<HashMap<String, String>>,
    db: DbPool,
}

impl GameManager {
    pub fn new(db: DbPool) -> Self {
        let mut default_npcs = HashMap::new();
        let npcs_def = vec![
            ("npc-guide", "София", 83.0, 0.0, 90.0, "История открытий", "teacher", "history-basics"),
            ("examiner-mathematics", "Экзаменатор", 80.0, 0.0, 87.0, "Выбор темы", "examiner", "math-basics"),
            ("teacher-mathematics", "Преподаватель математики", 70.7, 0.0, 69.0, "Математика", "teacher", "math-basics"),
            ("teacher-informatics", "Преподаватель информатики", 77.7, 0.0, 69.0, "Информатика", "teacher", "informatics-basics"),
            ("teacher-history", "Преподаватель истории", 84.7, 0.0, 69.0, "История", "teacher", "history-basics"),
            ("teacher-flags", "Преподаватель географии", 91.7, 0.0, 69.0, "Флаги мира", "teacher", "flags-demo"),
        ];
        for (id, name, x, y, z, subj, role, module) in npcs_def {
            default_npcs.insert(id.to_string(), NpcEntity {
                npc_id: id.to_string(),
                display_name: name.to_string(),
                x, y, z,
                yaw_rad: 0.0,
                state: "idle".to_string(),
                subject: subj.to_string(),
                role: role.to_string(),
                module_id: module.to_string(),
                control_mode: "autonomous".to_string(),
                target_x: None,
                target_z: None,
                speed_mult: 1.0,
                personality_prompt: None,
                decision_log: vec![(Room::now_ms(), format!("Инициализирован агент {}", name))],
            });
        }
        Self {
            rooms: Mutex::new(HashMap::new()),
            user_session: Mutex::new(HashMap::new()),
            npcs: Mutex::new(default_npcs),
            simulation: Mutex::new(UniverseSimulationState {
                paused: false,
                step_ticks_remaining: 0,
                time_scale: 1.0,
                walk_speed_override: None,
                run_multiplier_override: None,
                interaction_radius_override: None,
                gravity: 9.81,
                time_of_day: "15:00".to_string(),
                tick_duration_ms: 0.0,
                actual_tps: 20.0,
                last_tick_timestamp: Room::now_ms(),
                tick_counter: 0,
            }),
            snapshots: Mutex::new(HashMap::new()),
            db,
        }
    }

    pub fn has_active_sessions(&self) -> bool {
        let guard = self.rooms.lock().unwrap();
        guard.values().any(|r| r.get_status() == "active" || r.connected_count() > 0)
    }

    pub fn get_user_session(&self, user_id: &str) -> Option<String> {
        self.user_session.lock().unwrap().get(user_id).cloned()
    }

    pub fn get_player_id_for_user(&self, user_id: &str) -> Option<String> {
        let rooms = self.rooms.lock().unwrap();
        let user_map = self.user_session.lock().unwrap();
        let sess_id = user_map.get(user_id)?;
        let room = rooms.get(sess_id)?;
        room.user_to_player.get(user_id).cloned()
    }
}
impl GameManager {
    pub fn create_session(&self, user_id: &str, display_name: &str, world_id: &str) -> Result<SessionDto, (u16, &'static str, &'static str)> {
        let checkpoint = self.load_checkpoint(user_id);
        let mut rooms = self.rooms.lock().unwrap();
        let mut user_map = self.user_session.lock().unwrap();

        if let Some(existing_sess_id) = user_map.get(user_id) {
            let is_connected = rooms.get(existing_sess_id)
                .map(|r| {
                    r.user_to_player.get(user_id)
                        .and_then(|pid| r.players.get(pid))
                        .map(|p| p.connected)
                        .unwrap_or(false)
                })
                .unwrap_or(false);
            if is_connected {
                return Err((409, "ALREADY_IN_SESSION", "User already belongs to an active session"));
            }
            let old_sid = existing_sess_id.clone();
            if let Some(old_room) = rooms.get_mut(&old_sid) {
                old_room.remove_player(user_id);
                if old_room.players.is_empty() {
                    rooms.remove(&old_sid);
                }
            }
            user_map.remove(user_id);
        }

        let session_id = crate::auth::AuthService::generate_id();
        let mut room = Room::new(&session_id, world_id, 1);
        let player_id = room.join_player(user_id, display_name)?;
        if let Some((x, y, z, yaw, location_id)) = checkpoint {
            if let Some(player) = room.players.get_mut(&player_id) {
                player.x = x; player.y = y; player.z = z; player.yaw_rad = yaw;
                player.location_id = location_id;
            }
        }

        user_map.insert(user_id.to_string(), session_id.clone());
        let dto = room.to_dto();
        rooms.insert(session_id, room);
        Ok(dto)
    }

    pub fn join_session(&self, user_id: &str, display_name: &str, session_id: &str) -> Result<(SessionDto, String), (u16, &'static str, &'static str)> {
        let checkpoint = self.load_checkpoint(user_id);
        let mut rooms = self.rooms.lock().unwrap();
        let mut user_map = self.user_session.lock().unwrap();

        if let Some(existing_sess_id) = user_map.get(user_id) {
            if existing_sess_id != session_id {
                let is_connected = rooms.get(existing_sess_id)
                    .map(|r| {
                        r.user_to_player.get(user_id)
                            .and_then(|pid| r.players.get(pid))
                            .map(|p| p.connected)
                            .unwrap_or(false)
                    })
                    .unwrap_or(false);
                if is_connected {
                    return Err((409, "ALREADY_IN_SESSION", "User already belongs to another session"));
                }
                let old_sid = existing_sess_id.clone();
                if let Some(old_room) = rooms.get_mut(&old_sid) {
                    old_room.remove_player(user_id);
                    if old_room.players.is_empty() {
                        rooms.remove(&old_sid);
                    }
                }
                user_map.remove(user_id);
            }
        }

        let room = rooms.get_mut(session_id).ok_or((404, "NOT_FOUND", "Session not found"))?;
        let player_id = room.join_player(user_id, display_name)?;
        if let Some((x, y, z, yaw, location_id)) = checkpoint {
            if let Some(player) = room.players.get_mut(&player_id) {
                player.x = x; player.y = y; player.z = z; player.yaw_rad = yaw;
                player.location_id = location_id;
            }
        }
        user_map.insert(user_id.to_string(), session_id.to_string());
        Ok((room.to_dto(), player_id))
    }

    pub fn leave_session(&self, user_id: &str, session_id: &str) {
        let mut rooms = self.rooms.lock().unwrap();
        let mut user_map = self.user_session.lock().unwrap();
        user_map.remove(user_id);

        if let Some(room) = rooms.get_mut(session_id) {
            room.remove_player(user_id);
            if room.players.is_empty() {
                rooms.remove(session_id);
            }
        }
    }

    pub fn get_session_dto(&self, session_id: &str) -> Option<SessionDto> {
        self.rooms.lock().unwrap().get(session_id).map(|r| r.to_dto())
    }

    pub fn list_sessions(&self) -> Vec<SessionDto> {
        self.rooms.lock().unwrap().values().map(|r| r.to_dto()).collect()
    }
}
impl GameManager {
    pub fn handle_input(&self, session_id: &str, player_id: &str, input_seq: u64, move_x: f64, move_z: f64, yaw_rad: f64, running: bool, walk_speed: f64, run_mul: f64) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            room.handle_input(player_id, input_seq, move_x, move_z, yaw_rad, running, walk_speed, run_mul);
        }
    }

    pub fn mark_connected(&self, session_id: &str, player_id: &str, conn_id: u64) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            room.mark_connected(player_id, conn_id);
        }
    }

    pub fn mark_disconnected(&self, session_id: &str, player_id: &str, conn_id: u64) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            room.mark_disconnected(player_id, conn_id);
        }
    }

    pub fn get_player_pos(&self, session_id: &str, player_id: &str) -> Option<(f64, f64, f64)> {
        let rooms = self.rooms.lock().unwrap();
        let room = rooms.get(session_id)?;
        let p = room.players.get(player_id)?;
        Some((p.x, p.y, p.z))
    }

    pub fn set_player_pos(&self, session_id: &str, player_id: &str, x: f64, y: f64, z: f64, yaw_rad: f64) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            if let Some(p) = room.players.get_mut(player_id) {
                p.x = x;
                p.y = y;
                p.z = z;
                p.yaw_rad = yaw_rad;
                p.move_x = 0.0;
                p.move_z = 0.0;
            }
        }
    }

    // Room transitions are authoritative: a browser can request a destination,
    // but the server only accepts a door-to-room or room-to-hub transition from
    // the correct interaction area.  This keeps the single Three.js scene in
    // sync with multiplayer coordinates without introducing an undeclared WS
    // message type.
    pub fn transition_location(
        &self,
        session_id: &str,
        user_id: &str,
        requested_room_id: &str,
    ) -> Result<(String, PositionDto), (u16, &'static str, &'static str)> {
        const HUB: &str = "reading-room-main";
        const DOOR_Z: f64 = 65.5;
        const ROOMS: [(&str, f64); 4] = [
            ("room-mathematics", 69.0),
            ("room-informatics", 76.0),
            ("room-history", 83.0),
            ("room-geography", 90.0),
        ];

        let mut rooms = self.rooms.lock().unwrap();
        let room = rooms.get_mut(session_id).ok_or((404, "NOT_FOUND", "Session not found"))?;
        let player_id = room.user_to_player.get(user_id)
            .cloned().ok_or((403, "FORBIDDEN", "Session membership required"))?;
        let player = room.players.get_mut(&player_id)
            .ok_or((403, "FORBIDDEN", "Session membership required"))?;

        let target = ROOMS.iter().find(|(id, _)| *id == requested_room_id);
        let next_location = if requested_room_id == HUB {
            if player.location_id == HUB {
                return Ok((HUB.to_string(), PositionDto { x: player.x, y: player.y, z: player.z }));
            }
            let current = ROOMS.iter().find(|(id, _)| *id == player.location_id)
                .ok_or((409, "ACTIVITY_CONFLICT", "Unknown current location"))?;
            let &(_, door_x) = current;
            if (player.x - door_x).hypot(player.z - DOOR_Z) > 2.25 {
                return Err((403, "FORBIDDEN", "Move to the classroom exit first"));
            }
            HUB.to_string()
        } else if let Some(&(id, door_x)) = target {
            if player.location_id != HUB {
                return Err((409, "ACTIVITY_CONFLICT", "Leave the current classroom first"));
            }
            if (player.x - door_x).hypot(player.z - DOOR_Z) > 2.25 {
                return Err((403, "FORBIDDEN", "Move to the classroom door first"));
            }
            id.to_string()
        } else {
            return Err((422, "INVALID_REQUEST", "Unknown roomId"));
        };

        // Membership changes at the doorway; world coordinates and camera heading
        // remain continuous so clients can walk through without a teleport.
        player.location_id = next_location.clone();
        let _ = self.db.execute(&format!(
            "INSERT INTO player_checkpoints (user_id, world_id, x, y, z, yaw_rad, location_id, updated_at) \
             VALUES ('{}', 'discovery-campus', {}, {}, {}, {}, '{}', NOW()) \
             ON CONFLICT (user_id, world_id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, yaw_rad = EXCLUDED.yaw_rad, location_id = EXCLUDED.location_id, updated_at = NOW()",
            user_id, player.x, player.y, player.z, player.yaw_rad, next_location
        ));
        Ok((next_location, PositionDto { x: player.x, y: player.y, z: player.z }))
    }

    fn load_checkpoint(&self, user_id: &str) -> Option<(f64, f64, f64, f64, String)> {
        let row = self.db.query(&format!(
            "SELECT x, y, z, yaw_rad, location_id FROM player_checkpoints WHERE user_id = '{}' AND world_id = 'discovery-campus'",
            user_id,
        )).ok()?.into_iter().next()?;
        let x = row.get(0)?.parse().ok()?;
        let y = row.get(1)?.parse().ok()?;
        let z = row.get(2)?.parse().ok()?;
        let yaw = row.get(3)?.parse().ok()?;
        let location_id = row.get(4).unwrap_or("reading-room-main");
        // Ignore checkpoints from old builds or admin-edited spawns that are
        // outside the current academy. Otherwise the client opens at scenery
        // coordinates while still claiming to be in the reading room.
        let in_location = match location_id {
            "reading-room-main" => (65.5..=94.5).contains(&x) && (65.5..=94.5).contains(&z),
            "room-mathematics" => (65.95..=72.05).contains(&x) && (52.1..=65.55).contains(&z),
            "room-informatics" => (72.95..=79.05).contains(&x) && (52.1..=65.55).contains(&z),
            "room-history" => (79.95..=86.05).contains(&x) && (52.1..=65.55).contains(&z),
            "room-geography" => (86.95..=93.05).contains(&x) && (52.1..=65.55).contains(&z),
            _ => false,
        };
        in_location.then(|| (x, y, z, yaw, location_id.to_string()))
    }

    pub fn tick_all(&self, default_walk_speed: f64, default_run_mul: f64, max_silence_ms: u64) {
        let t_start = std::time::Instant::now();
        let (_paused, time_scale, walk_speed, run_mul) = {
            let mut sim = self.simulation.lock().unwrap();
            let should_run = !sim.paused || sim.step_ticks_remaining > 0;
            if sim.step_ticks_remaining > 0 {
                sim.step_ticks_remaining -= 1;
            }
            if !should_run {
                return;
            }
            let w = sim.walk_speed_override.unwrap_or(default_walk_speed);
            let r = sim.run_multiplier_override.unwrap_or(default_run_mul);
            (sim.paused, sim.time_scale, w, r)
        };

        // Tick dynamic NPCs
        let dt = 0.05 * time_scale;
        let mut npcs = self.npcs.lock().unwrap();
        for n in npcs.values_mut() {
            if n.control_mode == "frozen" {
                continue;
            }
            if let (Some(tx), Some(tz)) = (n.target_x, n.target_z) {
                let dx = tx - n.x;
                let dz = tz - n.z;
                let dist = (dx * dx + dz * dz).sqrt();
                if dist < 0.25 {
                    n.x = tx;
                    n.z = tz;
                    n.target_x = None;
                    n.target_z = None;
                    n.state = "idle".to_string();
                    n.decision_log.push((Room::now_ms(), "Достигнута целевая точка".to_string()));
                } else {
                    let step = walk_speed * n.speed_mult * dt;
                    let factor = (step / dist).min(1.0);
                    n.x += dx * factor;
                    n.z += dz * factor;
                    n.yaw_rad = dx.atan2(dz);
                }
            }
        }
        drop(npcs);

        let mut rooms = self.rooms.lock().unwrap();
        let mut all_expired_users = Vec::new();
        for room in rooms.values_mut() {
            let expired = room.tick_simulation(walk_speed, run_mul, max_silence_ms);
            all_expired_users.extend(expired);
        }

        // Clean empty rooms
        rooms.retain(|_, room| !room.players.is_empty());

        if !all_expired_users.is_empty() {
            let mut user_map = self.user_session.lock().unwrap();
            for uid in all_expired_users {
                user_map.remove(&uid);
            }
        }
        drop(rooms);

        // Update server simulation metrics
        let elapsed_ms = t_start.elapsed().as_secs_f64() * 1000.0;
        let mut sim = self.simulation.lock().unwrap();
        sim.tick_duration_ms = sim.tick_duration_ms * 0.9 + elapsed_ms * 0.1;
        sim.tick_counter += 1;
        let now_ms = Room::now_ms();
        if now_ms.saturating_sub(sim.last_tick_timestamp) >= 1000 {
            let delta_sec = (now_ms - sim.last_tick_timestamp) as f64 / 1000.0;
            sim.actual_tps = (sim.tick_counter as f64 / delta_sec).round();
            sim.tick_counter = 0;
            sim.last_tick_timestamp = now_ms;
        }
    }

    pub fn get_room_snapshot(&self, session_id: &str) -> Option<(u64, String, Vec<PlayerDto>)> {
        let rooms = self.rooms.lock().unwrap();
        let room = rooms.get(session_id)?;
        let tick = room.tick;
        let status = room.get_status().to_string();
        let players: Vec<PlayerDto> = room.players.values().map(|p| PlayerDto {
            player_id: p.player_id.clone(),
            display_name: p.display_name.clone(),
            position: PositionDto { x: p.x, y: p.y, z: p.z },
            yaw_rad: p.yaw_rad,
            connected: p.connected,
            last_processed_input_seq: p.last_input_seq,
            activity: crate::models::ActivityDto {
                mode: p.activity_mode.clone(),
                target_id: p.activity_target_id.clone(),
                seat_id: p.activity_seat_id.clone(),
            },
        }).collect();
        Some((tick, status, players))
    }

    pub fn update_player_activity(&self, user_id: &str, mode: &str, target_id: Option<String>, seat_id: Option<String>) {
        let valid_mode = match mode {
            "reading" => "learning",
            "exploring" | "learning" | "seated_quiz" | "seated_competition" => mode,
            _ => "exploring",
        };
        let mut rooms = self.rooms.lock().unwrap();
        let user_map = self.user_session.lock().unwrap();
        if let Some(sess_id) = user_map.get(user_id) {
            if let Some(room) = rooms.get_mut(sess_id) {
                if let Some(player_id) = room.user_to_player.get(user_id) {
                    if let Some(p) = room.players.get_mut(player_id) {
                        p.activity_mode = valid_mode.to_string();
                        p.activity_target_id = target_id;
                        p.activity_seat_id = seat_id;
                    }
                }
            }
        }
    }

    pub fn record_client_telemetry(&self, session_id: &str, player_id: &str, telemetry: crate::models::ClientTelemetryDto) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            if let Some(player) = room.players.get_mut(player_id) {
                player.telemetry = Some(telemetry);
            }
        }
    }

    pub fn get_all_client_telemetry(&self) -> Vec<crate::json::JsonValue> {
        let rooms = self.rooms.lock().unwrap();
        let mut result = Vec::new();
        for room in rooms.values() {
            for player in room.players.values() {
                if let Some(t) = &player.telemetry {
                    let mut obj = vec![
                        ("playerId".to_string(), crate::json::JsonValue::String(player.player_id.clone())),
                        ("userId".to_string(), crate::json::JsonValue::String(player.user_id.clone())),
                        ("displayName".to_string(), crate::json::JsonValue::String(player.display_name.clone())),
                        ("connected".to_string(), crate::json::JsonValue::Bool(player.connected)),
                        ("sessionId".to_string(), crate::json::JsonValue::String(room.session_id.clone())),
                    ];
                    if let crate::json::JsonValue::Object(t_entries) = t.to_json() {
                        obj.extend(t_entries);
                    }
                    result.push(crate::json::JsonValue::Object(obj));
                }
            }
        }
        result
    }

    pub fn get_server_telemetry(&self) -> crate::json::JsonValue {
        let sim = self.simulation.lock().unwrap();
        let rooms = self.rooms.lock().unwrap();
        let npcs = self.npcs.lock().unwrap();
        let total_players: usize = rooms.values().map(|r| r.players.len()).sum();
        let connected_players: usize = rooms.values().map(|r| r.connected_count()).sum();
        
        crate::json::JsonValue::Object(vec![
            ("targetTps".to_string(), crate::json::JsonValue::Number(20.0)),
            ("actualTps".to_string(), crate::json::JsonValue::Number(sim.actual_tps)),
            ("tickDurationMs".to_string(), crate::json::JsonValue::Number(sim.tick_duration_ms)),
            ("aiComputeLatencyMs".to_string(), crate::json::JsonValue::Number(0.0)),
            ("memoryRssMb".to_string(), crate::json::JsonValue::Number(78.4)),
            ("activeSessions".to_string(), crate::json::JsonValue::Number(rooms.len() as f64)),
            ("totalPlayers".to_string(), crate::json::JsonValue::Number(total_players as f64)),
            ("connectedPlayers".to_string(), crate::json::JsonValue::Number(connected_players as f64)),
            ("totalNpcs".to_string(), crate::json::JsonValue::Number(npcs.len() as f64)),
            ("totalDynamicEntities".to_string(), crate::json::JsonValue::Number((total_players + npcs.len()) as f64)),
            ("timeScale".to_string(), crate::json::JsonValue::Number(sim.time_scale)),
            ("paused".to_string(), crate::json::JsonValue::Bool(sim.paused)),
            ("gravity".to_string(), crate::json::JsonValue::Number(sim.gravity)),
            ("timeOfDay".to_string(), crate::json::JsonValue::String(sim.time_of_day.clone())),
        ])
    }

    pub fn set_simulation_paused(&self, paused: bool) {
        let mut sim = self.simulation.lock().unwrap();
        sim.paused = paused;
    }

    pub fn step_simulation_tick(&self) {
        let mut sim = self.simulation.lock().unwrap();
        sim.step_ticks_remaining += 1;
    }

    pub fn set_simulation_time_scale(&self, scale: f64) {
        let mut sim = self.simulation.lock().unwrap();
        sim.time_scale = scale.clamp(0.1, 10.0);
    }

    pub fn set_environment(&self, walk_speed: Option<f64>, run_mul: Option<f64>, radius: Option<f64>, gravity: Option<f64>, time_of_day: Option<String>) {
        let mut sim = self.simulation.lock().unwrap();
        if let Some(s) = walk_speed { sim.walk_speed_override = Some(s); }
        if let Some(r) = run_mul { sim.run_multiplier_override = Some(r); }
        if let Some(rad) = radius { sim.interaction_radius_override = Some(rad); }
        if let Some(g) = gravity { sim.gravity = g; }
        if let Some(t) = time_of_day { sim.time_of_day = t; }
    }

    pub fn get_all_npcs_dto(&self) -> Vec<crate::models::NpcDto> {
        let npcs = self.npcs.lock().unwrap();
        let mut list: Vec<crate::models::NpcDto> = npcs.values().map(|n| {
            let safe_state = match n.state.as_str() {
                "walking" => "walking",
                "talking" => "talking",
                _ => "idle",
            };
            let safe_role = match n.role.as_str() {
                "examiner" => "examiner",
                _ => "teacher",
            };
            let safe_yaw = n.yaw_rad.clamp(-3.141592, 3.141592);
            crate::models::NpcDto {
                npc_id: n.npc_id.clone(),
                display_name: n.display_name.clone(),
                position: crate::models::PositionDto { x: n.x, y: n.y, z: n.z },
                yaw_rad: safe_yaw,
                state: safe_state.to_string(),
                subject: n.subject.clone(),
                role: safe_role.to_string(),
                module_id: n.module_id.clone(),
            }
        }).collect();
        list.sort_by(|a, b| a.npc_id.cmp(&b.npc_id));
        list
    }

    pub fn get_all_npcs_admin(&self) -> Vec<crate::json::JsonValue> {
        let npcs = self.npcs.lock().unwrap();
        let mut list = Vec::new();
        for n in npcs.values() {
            let logs: Vec<crate::json::JsonValue> = n.decision_log.iter().map(|(t, msg)| {
                crate::json::JsonValue::Object(vec![
                    ("time".to_string(), crate::json::JsonValue::Number(*t as f64)),
                    ("message".to_string(), crate::json::JsonValue::String(msg.clone())),
                ])
            }).collect();
            list.push(crate::json::JsonValue::Object(vec![
                ("npcId".to_string(), crate::json::JsonValue::String(n.npc_id.clone())),
                ("displayName".to_string(), crate::json::JsonValue::String(n.display_name.clone())),
                ("role".to_string(), crate::json::JsonValue::String(n.role.clone())),
                ("subject".to_string(), crate::json::JsonValue::String(n.subject.clone())),
                ("state".to_string(), crate::json::JsonValue::String(n.state.clone())),
                ("controlMode".to_string(), crate::json::JsonValue::String(n.control_mode.clone())),
                ("x".to_string(), crate::json::JsonValue::Number(n.x)),
                ("y".to_string(), crate::json::JsonValue::Number(n.y)),
                ("z".to_string(), crate::json::JsonValue::Number(n.z)),
                ("speedMult".to_string(), crate::json::JsonValue::Number(n.speed_mult)),
                ("personalityPrompt".to_string(), match &n.personality_prompt {
                    Some(p) => crate::json::JsonValue::String(p.clone()),
                    None => crate::json::JsonValue::Null,
                }),
                ("decisionLog".to_string(), crate::json::JsonValue::Array(logs)),
            ]));
        }
        list.sort_by(|a, b| a.get_str("npcId").unwrap_or("").cmp(b.get_str("npcId").unwrap_or("")));
        list
    }

    pub fn override_npc(&self, npc_id: &str, mode: Option<&str>, prompt: Option<&str>, speed_mult: Option<f64>) -> bool {
        let mut npcs = self.npcs.lock().unwrap();
        if let Some(n) = npcs.get_mut(npc_id) {
            let now = Room::now_ms();
            if let Some(m) = mode {
                n.control_mode = m.to_string();
                if m == "frozen" {
                    n.state = "idle".to_string();
                    n.target_x = None;
                    n.target_z = None;
                } else if n.state == "frozen" {
                    n.state = "idle".to_string();
                }
                n.decision_log.push((now, format!("Режим контроля изменен на {}", m)));
            }
            if let Some(p) = prompt {
                n.personality_prompt = Some(p.to_string());
                n.decision_log.push((now, "Системный промпт ИИ обновлен администратором".to_string()));
            }
            if let Some(s) = speed_mult {
                n.speed_mult = s;
            }
            true
        } else {
            false
        }
    }

    pub fn command_npc(&self, npc_id: &str, action: &str, tx: Option<f64>, ty: Option<f64>, tz: Option<f64>, state: Option<&str>) -> bool {
        let mut npcs = self.npcs.lock().unwrap();
        if let Some(n) = npcs.get_mut(npc_id) {
            let now = Room::now_ms();
            match action {
                "teleport" => {
                    if let (Some(x), Some(z)) = (tx, tz) {
                        n.x = x;
                        if let Some(y) = ty { n.y = y; }
                        n.z = z;
                        n.target_x = None;
                        n.target_z = None;
                        n.decision_log.push((now, format!("Телепортирован администратором в ({:.1}, {:.1})", x, z)));
                    }
                }
                "moveTo" => {
                    if let (Some(x), Some(z)) = (tx, tz) {
                        n.target_x = Some(x);
                        n.target_z = Some(z);
                        n.state = "walking".to_string();
                        n.decision_log.push((now, format!("Получена команда идти в точку ({:.1}, {:.1})", x, z)));
                    }
                }
                "setState" => {
                    if let Some(s) = state {
                        let safe_s = match s {
                            "walking" => "walking",
                            "talking" => "talking",
                            _ => "idle",
                        };
                        n.state = safe_s.to_string();
                        n.decision_log.push((now, format!("Принудительно установлено состояние: {}", safe_s)));
                    }
                }
                _ => return false,
            }
            true
        } else {
            false
        }
    }

    pub fn spawn_npc(&self, npc: NpcEntity) -> bool {
        let mut npcs = self.npcs.lock().unwrap();
        let id = npc.npc_id.clone();
        npcs.insert(id, npc);
        true
    }

    pub fn delete_npc(&self, npc_id: &str) -> bool {
        let mut npcs = self.npcs.lock().unwrap();
        npcs.remove(npc_id).is_some()
    }

    pub fn reset_universe(&self) {
        let mut sim = self.simulation.lock().unwrap();
        sim.paused = false;
        sim.time_scale = 1.0;
        sim.walk_speed_override = None;
        sim.run_multiplier_override = None;
        sim.interaction_radius_override = None;
        sim.gravity = 9.81;
        sim.time_of_day = "15:00".to_string();
    }
}
