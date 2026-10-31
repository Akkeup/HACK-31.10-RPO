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
    pub activity_mode: String,
    pub activity_target_id: Option<String>,
    pub activity_seat_id: Option<String>,
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
        if count >= 2 {
            "active"
        } else if self.tick > 0 && count < 2 {
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
        // If already in room, return existing playerId
        if let Some(player_id) = self.user_to_player.get(user_id) {
            if let Some(p) = self.players.get_mut(player_id) {
                p.connected = true;
                p.disconnect_time = None;
            }
            return Ok(player_id.clone());
        }

        // Check 5 player limit
        if self.players.len() >= 5 {
            return Err((409, "SESSION_FULL", "Session is full (maximum 5 players)"));
        }

        let player_id = crate::auth::AuthService::generate_id();
        let player = PlayerState {
            player_id: player_id.clone(),
            user_id: user_id.to_string(),
            display_name: display_name.to_string(),
            x: 15.0,
            y: 0.0,
            z: 15.0,
            yaw_rad: 0.0,
            connected: true,
            last_input_time: Self::now_ms(),
            last_input_seq: 0,
            move_x: 0.0,
            move_z: 0.0,
            running: false,
            disconnect_time: None,
            activity_mode: "exploring".to_string(),
            activity_target_id: None,
            activity_seat_id: None,
        };

        self.user_to_player.insert(user_id.to_string(), player_id.clone());
        self.players.insert(player_id.clone(), player);
        Ok(player_id)
    }

    pub fn mark_disconnected(&mut self, player_id: &str) {
        if let Some(p) = self.players.get_mut(player_id) {
            p.connected = false;
            p.move_x = 0.0;
            p.move_z = 0.0;
            p.disconnect_time = Some(Self::now_ms());
        }
    }

    pub fn remove_player(&mut self, user_id: &str) {
        if let Some(player_id) = self.user_to_player.remove(user_id) {
            self.players.remove(&player_id);
        }
    }
}
impl Room {
    pub fn handle_input(&mut self, player_id: &str, input_seq: u64, mut move_x: f64, mut move_z: f64, yaw_rad: f64, running: bool) {
        if let Some(p) = self.players.get_mut(player_id) {
            if input_seq > p.last_input_seq {
                p.last_input_seq = input_seq;
                p.yaw_rad = yaw_rad;
                p.running = running;
                p.last_input_time = Self::now_ms();

                // Prevent diagonal speed exploit by normalizing if length > 1
                let len = (move_x * move_x + move_z * move_z).sqrt();
                if len > 1.0 {
                    move_x /= len;
                    move_z /= len;
                }
                p.move_x = move_x;
                p.move_z = move_z;
            }
        }
    }

    pub fn tick_simulation(&mut self, walk_speed: f64, run_mul: f64, max_silence_ms: u64) {
        self.tick += 1;
        let is_active = self.get_status() == "active";
        let now = Self::now_ms();
        let dt = 1.0 / 20.0; // 20 Hz tick

        // Clean up expired reservations (60s grace period)
        self.players.retain(|_, p| {
            if !p.connected {
                if let Some(disc) = p.disconnect_time {
                    if now.saturating_sub(disc) > 60_000 {
                        return false;
                    }
                }
            }
            true
        });

        for p in self.players.values_mut() {
            if !p.connected {
                continue;
            }

            // Input silence check (250ms): reset movement if silent
            if now.saturating_sub(p.last_input_time) > max_silence_ms {
                p.move_x = 0.0;
                p.move_z = 0.0;
            }

            // In active session, simulate movement
            if is_active && (p.move_x != 0.0 || p.move_z != 0.0) {
                let speed = if p.running { walk_speed * run_mul } else { walk_speed };
                let mut new_x = p.x + p.move_x * speed * dt;
                let mut new_z = p.z + p.move_z * speed * dt;

                // World boundary clamp: 0 to 320 meters (10 chunks of 32m)
                new_x = new_x.clamp(0.0, 319.9);
                new_z = new_z.clamp(0.0, 319.9);

                p.x = new_x;
                p.z = new_z;
            }
        }
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
    db: DbPool,
}

impl GameManager {
    pub fn new(db: DbPool) -> Self {
        Self {
            rooms: Mutex::new(HashMap::new()),
            user_session: Mutex::new(HashMap::new()),
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
        let user_map = self.user_session.lock().unwrap();
        let sess_id = user_map.get(user_id)?;
        let rooms = self.rooms.lock().unwrap();
        let room = rooms.get(sess_id)?;
        room.user_to_player.get(user_id).cloned()
    }
}
impl GameManager {
    pub fn create_session(&self, user_id: &str, display_name: &str, world_id: &str) -> Result<SessionDto, (u16, &'static str, &'static str)> {
        let mut user_map = self.user_session.lock().unwrap();
        if let Some(existing_sess_id) = user_map.get(user_id) {
            return Err((409, "ALREADY_IN_SESSION", "User already belongs to an active session"));
        }

        let session_id = crate::auth::AuthService::generate_id();
        let mut room = Room::new(&session_id, world_id, 1);
        room.join_player(user_id, display_name)?;

        user_map.insert(user_id.to_string(), session_id.clone());
        let dto = room.to_dto();
        self.rooms.lock().unwrap().insert(session_id, room);
        Ok(dto)
    }

    pub fn join_session(&self, user_id: &str, display_name: &str, session_id: &str) -> Result<(SessionDto, String), (u16, &'static str, &'static str)> {
        let mut user_map = self.user_session.lock().unwrap();
        if let Some(existing_sess_id) = user_map.get(user_id) {
            if existing_sess_id != session_id {
                return Err((409, "ALREADY_IN_SESSION", "User already belongs to another session"));
            }
        }

        let mut rooms = self.rooms.lock().unwrap();
        let room = rooms.get_mut(session_id).ok_or((404, "NOT_FOUND", "Session not found"))?;
        let player_id = room.join_player(user_id, display_name)?;
        user_map.insert(user_id.to_string(), session_id.to_string());
        Ok((room.to_dto(), player_id))
    }

    pub fn leave_session(&self, user_id: &str, session_id: &str) {
        let mut user_map = self.user_session.lock().unwrap();
        user_map.remove(user_id);

        let mut rooms = self.rooms.lock().unwrap();
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
    pub fn handle_input(&self, session_id: &str, player_id: &str, input_seq: u64, move_x: f64, move_z: f64, yaw_rad: f64, running: bool) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            room.handle_input(player_id, input_seq, move_x, move_z, yaw_rad, running);
        }
    }

    pub fn mark_disconnected(&self, session_id: &str, player_id: &str) {
        let mut rooms = self.rooms.lock().unwrap();
        if let Some(room) = rooms.get_mut(session_id) {
            room.mark_disconnected(player_id);
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

    pub fn tick_all(&self, walk_speed: f64, run_mul: f64, max_silence_ms: u64) {
        let mut rooms = self.rooms.lock().unwrap();
        for room in rooms.values_mut() {
            room.tick_simulation(walk_speed, run_mul, max_silence_ms);
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
        let user_map = self.user_session.lock().unwrap();
        if let Some(sess_id) = user_map.get(user_id) {
            let mut rooms = self.rooms.lock().unwrap();
            if let Some(room) = rooms.get_mut(sess_id) {
                if let Some(player_id) = room.user_to_player.get(user_id) {
                    if let Some(p) = room.players.get_mut(player_id) {
                        p.activity_mode = mode.to_string();
                        p.activity_target_id = target_id;
                        p.activity_seat_id = seat_id;
                    }
                }
            }
        }
    }
}
