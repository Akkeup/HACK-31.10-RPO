// ws.rs: RFC 6455 WebSocket Transport and Application Event Loop

use std::collections::{HashMap, HashSet};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::ai::NpcAiService;
use crate::auth::{AuthService, User, WsTicket};
use crate::competition::CompetitionService;
use crate::config::ConfigService;
use crate::game::{GameManager, Room};
use crate::json::{parse_json, JsonValue};
use crate::models::*;
use crate::sha::{base64_encode, sha1_bytes, sha256_hex};
use crate::spatial::SpatialService;
use crate::wallet::WalletService;

pub struct WsWriter {
    stream: TcpStream,
    pub server_seq: u64,
    pub protocol_version: String,
}

impl WsWriter {
    pub fn new(stream: TcpStream, protocol_version: &str) -> Self {
        Self { stream, server_seq: 1, protocol_version: protocol_version.to_string() }
    }

    pub fn write_frame(&mut self, opcode: u8, payload: &[u8]) -> Result<(), std::io::Error> {
        let len = payload.len();
        let mut header = Vec::with_capacity(4);
        header.push(0x80 | (opcode & 0x0f)); // FIN + opcode

        if len < 126 {
            header.push(len as u8);
        } else if len <= 65535 {
            header.push(126);
            header.extend_from_slice(&(len as u16).to_be_bytes());
        } else {
            header.push(127);
            header.extend_from_slice(&(len as u64).to_be_bytes());
        }

        self.stream.write_all(&header)?;
        self.stream.write_all(payload)?;
        self.stream.flush()?;
        Ok(())
    }

    pub fn write_close(&mut self, code: u16, reason: &str) {
        let mut payload = Vec::from(code.to_be_bytes());
        payload.extend_from_slice(reason.as_bytes());
        let _ = self.write_frame(8, &payload);
    }

    pub fn write_json(&mut self, val: &JsonValue) -> Result<(), std::io::Error> {
        let json_str = val.to_string();
        self.write_frame(1, json_str.as_bytes())
    }

    pub fn next_seq(&mut self) -> u64 {
        let seq = self.server_seq;
        self.server_seq += 1;
        seq
    }

    pub fn send_envelope(&mut self, msg_type: &str, req_id: Option<String>, payload: JsonValue) -> Result<(), std::io::Error> {
        let seq = self.next_seq();
        let env = make_server_envelope(&self.protocol_version, msg_type, req_id, seq, &rfc3339_now(), payload);
        self.write_json(&env)
    }
}

pub struct WsBroadcaster {
    clients: Mutex<HashMap<String, (u64, String, Arc<Mutex<WsWriter>>)>>, // player_id -> (conn_id, user_id, writer)
    admin_subs: Mutex<HashSet<String>>,
}

impl WsBroadcaster {
    pub fn new() -> Self {
        Self {
            clients: Mutex::new(HashMap::new()),
            admin_subs: Mutex::new(HashSet::new()),
        }
    }

    pub fn register(&self, player_id: &str, conn_id: u64, user_id: &str, writer: Arc<Mutex<WsWriter>>) {
        let mut lock = self.clients.lock().unwrap();
        lock.insert(player_id.to_string(), (conn_id, user_id.to_string(), writer));
    }

    pub fn unregister(&self, player_id: &str, conn_id: u64) {
        let mut lock = self.clients.lock().unwrap();
        if let Some((c_id, _, _)) = lock.get(player_id) {
            if *c_id == conn_id || conn_id == 0 {
                lock.remove(player_id);
            }
        }
        let mut subs = self.admin_subs.lock().unwrap();
        subs.remove(player_id);
    }

    pub fn subscribe_admin(&self, player_id: &str) {
        let mut subs = self.admin_subs.lock().unwrap();
        subs.insert(player_id.to_string());
    }

    pub fn unsubscribe_admin(&self, player_id: &str) {
        let mut subs = self.admin_subs.lock().unwrap();
        subs.remove(player_id);
    }

    pub fn broadcast_admin_telemetry(&self, game: &GameManager) {
        let subs = self.admin_subs.lock().unwrap();
        if subs.is_empty() {
            return;
        }
        let server_metrics = game.get_server_telemetry();
        let clients_metrics = game.get_all_client_telemetry();
        let npcs_admin = game.get_all_npcs_admin();
        let payload = JsonValue::Object(vec![
            ("server".to_string(), server_metrics),
            ("clients".to_string(), JsonValue::Array(clients_metrics)),
            ("npcs".to_string(), JsonValue::Array(npcs_admin)),
        ]);
        let lock = self.clients.lock().unwrap();
        for pid in subs.iter() {
            if let Some((_, _, writer)) = lock.get(pid) {
                let mut w = writer.lock().unwrap();
                let _ = w.send_envelope("admin.telemetry.snapshot", None, payload.clone());
            }
        }
    }

    pub fn send_to_player(&self, player_id: &str, msg_type: &str, req_id: Option<String>, payload: JsonValue) {
        let lock = self.clients.lock().unwrap();
        if let Some((_, _, writer)) = lock.get(player_id) {
            let mut w = writer.lock().unwrap();
            let _ = w.send_envelope(msg_type, req_id, payload);
        }
    }

    pub fn send_to_user(&self, user_id: &str, msg_type: &str, req_id: Option<String>, payload: JsonValue) {
        let lock = self.clients.lock().unwrap();
        for (_, (_, u_id, writer)) in lock.iter() {
            if u_id == user_id {
                let mut w = writer.lock().unwrap();
                let _ = w.send_envelope(msg_type, req_id.clone(), payload.clone());
            }
        }
    }

    pub fn broadcast_to_players(&self, player_ids: &[String], msg_type: &str, payload: &JsonValue) {
        let lock = self.clients.lock().unwrap();
        for pid in player_ids {
            if let Some((_, _, writer)) = lock.get(pid) {
                let mut w = writer.lock().unwrap();
                let _ = w.send_envelope(msg_type, None, payload.clone());
            }
        }
    }
}

pub struct WsConnection {
    reader: TcpStream,
    pub writer: Arc<Mutex<WsWriter>>,
}

impl WsConnection {
    pub fn new(stream: TcpStream, protocol_version: &str) -> Result<Self, std::io::Error> {
        let write_stream = stream.try_clone()?;
        let writer = Arc::new(Mutex::new(WsWriter::new(write_stream, protocol_version)));
        Ok(Self { reader: stream, writer })
    }

    pub fn read_frame(&mut self) -> Result<(u8, Vec<u8>), (u16, &'static str)> {
        let mut hdr = [0u8; 2];
        self.reader.read_exact(&mut hdr).map_err(|_| (1001, "Connection closed"))?;
        let opcode = hdr[0] & 0x0f;
        let is_masked = (hdr[1] & 0x80) != 0;
        let mut payload_len = (hdr[1] & 0x7f) as usize;

        if opcode == 2 {
            return Err((1003, "Binary frames not supported"));
        }

        if payload_len == 126 {
            let mut ext = [0u8; 2];
            self.reader.read_exact(&mut ext).map_err(|_| (1001, "Read error"))?;
            payload_len = u16::from_be_bytes(ext) as usize;
        } else if payload_len == 127 {
            return Err((1009, "Frame payload exceeds 64 KiB"));
        }

        if payload_len > 65536 {
            return Err((1009, "Message exceeds 64 KiB"));
        }

        let mut mask_key = [0u8; 4];
        if is_masked {
            self.reader.read_exact(&mut mask_key).map_err(|_| (1001, "Read error"))?;
        }

        let mut payload = vec![0u8; payload_len];
        self.reader.read_exact(&mut payload).map_err(|_| (1001, "Read error"))?;

        if is_masked {
            for (i, b) in payload.iter_mut().enumerate() {
                *b ^= mask_key[i % 4];
            }
        }

        Ok((opcode, payload))
    }

    pub fn write_frame(&self, opcode: u8, payload: &[u8]) -> Result<(), std::io::Error> {
        self.writer.lock().unwrap().write_frame(opcode, payload)
    }

    pub fn write_close(&self, code: u16, reason: &str) {
        self.writer.lock().unwrap().write_close(code, reason);
    }

    pub fn write_json(&self, val: &JsonValue) -> Result<(), std::io::Error> {
        self.writer.lock().unwrap().write_json(val)
    }

    pub fn next_seq(&self) -> u64 {
        self.writer.lock().unwrap().next_seq()
    }
}


pub fn perform_ws_handshake(mut stream: TcpStream, ws_key: &str, subprotocol: &str, protocol_version: &str) -> Result<WsConnection, std::io::Error> {
    let mut combined = String::from(ws_key);
    combined.push_str("258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    let sha1 = sha1_bytes(combined.as_bytes());
    let accept = base64_encode(&sha1);

    let resp = format!(
        "HTTP/1.1 101 Switching Protocols\r\n\
         Upgrade: websocket\r\n\
         Connection: Upgrade\r\n\
         Sec-WebSocket-Accept: {}\r\n\
         Sec-WebSocket-Protocol: {}\r\n\r\n",
        accept, subprotocol
    );
    stream.write_all(resp.as_bytes())?;
    stream.flush()?;
    WsConnection::new(stream, protocol_version)
}

pub fn rfc3339_now() -> String {
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    format!("{}-{:02}-{:02}T{:02}:{:02}:{:02}Z", 2026, 10, 31, (t / 3600) % 24, (t / 60) % 60, t % 60)
}
static NEXT_CONN_ID: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);

pub fn run_ws_session(
    mut conn: WsConnection,
    ticket: WsTicket,
    player_id: String,
    auth: Arc<AuthService>,
    game: Arc<GameManager>,
    config: Arc<ConfigService>,
    spatial: Arc<SpatialService>,
    ai: Arc<NpcAiService>,
    wallet: Arc<WalletService>,
    competition: Arc<CompetitionService>,
    knowledge: Arc<crate::knowledge::KnowledgeService>,
    broadcaster: Arc<WsBroadcaster>,
    instance_id: String,
) {
    let conn_id = NEXT_CONN_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    broadcaster.register(&player_id, conn_id, &ticket.user_id, conn.writer.clone());
    game.mark_connected(&ticket.session_id, &player_id, conn_id);
    let mut has_received_hello = false;
    let mut is_ready = false;
    let mut last_ping = SystemTime::now();

    loop {
        let (opcode, payload) = match conn.read_frame() {
            Ok(res) => res,
            Err((code, reason)) => {
                conn.write_close(code, reason);
                break;
            }
        };

        if opcode == 8 { // Close frame
            conn.write_close(1000, "Normal closure");
            break;
        } else if opcode == 9 { // Ping
            let _ = conn.write_frame(10, &payload);
            continue;
        } else if opcode == 10 { // Pong
            continue;
        }

        let text = match String::from_utf8(payload) {
            Ok(s) => s,
            Err(_) => {
                conn.write_close(1007, "Invalid UTF-8");
                break;
            }
        };

        let msg = match parse_json(&text) {
            Ok(v) => v,
            Err(_) => {
                let seq = conn.next_seq();
                let err = ErrorResponse::new("INVALID_REQUEST", "Invalid JSON syntax", false, None);
                let _ = conn.write_json(&make_server_envelope(&ticket.protocol_version, "server.error", None, seq, &rfc3339_now(), err.to_json()));
                continue;
            }
        };

        let msg_type = msg.get_str("type").unwrap_or("");
        let req_id = msg.get_str("requestId").map(|s| s.to_string());
        let payload_obj = msg.get("payload");

        if msg_type == "client.hello" {
            if has_received_hello {
                let seq = conn.next_seq();
                let err = ErrorResponse::new("INVALID_REQUEST", "client.hello already received", false, req_id.clone());
                let _ = conn.write_json(&make_server_envelope(&ticket.protocol_version, "server.error", req_id, seq, &rfc3339_now(), err.to_json()));
                continue;
            }
            has_received_hello = true;
            handle_hello(&mut conn, &ticket, &player_id, &instance_id, &game, &config, &spatial, req_id);
        } else if msg_type == "world.ready" {
            is_ready = true;
            send_snapshot(&mut conn, &player_id, &ticket, &game, &config, &competition, &broadcaster);
        } else if msg_type == "player.input" {
            if let Some(p) = payload_obj {
                handle_input(&game, &ticket.session_id, &player_id, p, &config);
                send_snapshot(&mut conn, &player_id, &ticket, &game, &config, &competition, &broadcaster);
            }
        } else if msg_type == "npc.interact" {
            handle_npc_interact(&mut conn, &ticket, &player_id, req_id, payload_obj, &game, &ai, &config);
        } else if msg_type == "npc.cancel" {
            handle_npc_cancel(&conn, req_id, payload_obj);
        } else if msg_type == "library.open" {
            handle_library_open(&conn, req_id, payload_obj, &knowledge, &game, &competition, &ticket.user_id);
        } else if msg_type == "country.describe" {
            handle_country_describe(&conn, req_id, payload_obj, &knowledge);
        } else if msg_type == "lesson.open" {
            handle_lesson_open(&conn, req_id, payload_obj, &knowledge, &game, &competition, &ticket.user_id);
        } else if msg_type == "lesson.close" {
            handle_lesson_close(&conn, req_id, &game, &competition, &ticket.user_id);
        } else if msg_type == "quiz.start" || msg_type == "quiz.resume" {
            handle_quiz_start(&conn, req_id, payload_obj, &knowledge, &game, &competition, &ticket.user_id);
        } else if msg_type == "quiz.answer" {
            handle_quiz_answer(&conn, req_id, payload_obj);
        } else if msg_type == "quiz.next" {
            handle_quiz_next(&conn, req_id, payload_obj);
        } else if msg_type == "quiz.leave" || msg_type == "quiz.abandon" {
            handle_quiz_leave(&conn, req_id, payload_obj, &game, &competition, &ticket.user_id, msg_type == "quiz.abandon");
        } else if msg_type == "competition.join" {
            handle_competition_join(&conn, &ticket, &player_id, req_id, payload_obj, &game, &competition, &broadcaster);
        } else if msg_type == "competition.configure" {
            handle_competition_configure(&conn, &ticket, &player_id, req_id, payload_obj, &competition, &wallet, &broadcaster);
        } else if msg_type == "competition.ready" {
            handle_competition_ready(&conn, &ticket, &player_id, req_id, payload_obj, &competition, &wallet, &broadcaster);
        } else if msg_type == "competition.start" {
            handle_competition_start(&conn, &ticket, &player_id, req_id, payload_obj, &competition, &wallet, &broadcaster);
        } else if msg_type == "competition.answer" {
            handle_competition_answer(&conn, &player_id, req_id, payload_obj, &competition, &wallet, &broadcaster);
        } else if msg_type == "competition.leave" {
            handle_competition_leave(&conn, &ticket, &player_id, req_id, &competition, &wallet, &broadcaster, &game);
        } else if msg_type == "client.ping" {
            last_ping = SystemTime::now();
            let seq = conn.next_seq();
            let nonce = payload_obj.and_then(|p| p.get_str("nonce")).unwrap_or("0");
            let pong = JsonValue::Object(vec![("nonce".to_string(), JsonValue::String(nonce.to_string()))]);
            let _ = conn.write_json(&make_server_envelope(&ticket.protocol_version, "server.pong", req_id, seq, &rfc3339_now(), pong));
        } else if msg_type == "client.telemetry" {
            if let Some(p) = payload_obj {
                let dto = ClientTelemetryDto {
                    fps: p.get_f64("fps").unwrap_or(0.0),
                    fps_low_1pct: p.get_f64("fpsLow1Pct").unwrap_or(0.0),
                    frame_time_ms: p.get_f64("frameTimeMs").unwrap_or(0.0),
                    ping_rtt_ms: p.get_f64("pingRttMs").unwrap_or(0.0),
                    jitter_ms: p.get_f64("jitterMs").unwrap_or(0.0),
                    rendered_entities: p.get_i64("renderedEntities").unwrap_or(0) as u32,
                    active_draw_calls: p.get_i64("activeDrawCalls").unwrap_or(0) as u32,
                    triangles: p.get_i64("triangles").unwrap_or(0) as u32,
                    heap_memory_mb: p.get_f64("heapMemoryMb").unwrap_or(0.0),
                    uptime_sec: p.get_i64("uptimeSec").unwrap_or(0) as u64,
                    rx_bitrate_kbps: p.get_f64("rxBitrateKbps").unwrap_or(0.0),
                    tx_bitrate_kbps: p.get_f64("txBitrateKbps").unwrap_or(0.0),
                    location_id: p.get_str("locationId").unwrap_or("reading-room-main").to_string(),
                };
                game.record_client_telemetry(&ticket.session_id, &player_id, dto);
            }
        } else if msg_type == "admin.telemetry.subscribe" {
            if auth.is_admin_user(&ticket.user_id) {
                broadcaster.subscribe_admin(&player_id);
                broadcaster.broadcast_admin_telemetry(&game);
            }
        } else if msg_type == "admin.universe.control" {
            if auth.is_admin_user(&ticket.user_id) {
                if let Some(p) = payload_obj {
                    let action = p.get_str("action").unwrap_or("");
                    match action {
                        "pause" => game.set_simulation_paused(true),
                        "resume" => game.set_simulation_paused(false),
                        "step" => game.step_simulation_tick(),
                        "setTimeScale" => {
                            if let Some(scale) = p.get_f64("timeScale") {
                                game.set_simulation_time_scale(scale);
                            }
                        }
                        "setEnvironment" => {
                            let ws = p.get_f64("walkSpeedMps");
                            let rm = p.get_f64("runMultiplier");
                            let rad = p.get_f64("interactionRadiusM");
                            let grav = p.get_f64("gravity");
                            let tod = p.get_str("timeOfDay").map(|s| s.to_string());
                            game.set_environment(ws, rm, rad, grav, tod);
                        }
                        "resetUniverse" => game.reset_universe(),
                        _ => {}
                    }
                    broadcaster.broadcast_admin_telemetry(&game);
                }
            }
        } else if msg_type == "admin.agent.override" {
            if auth.is_admin_user(&ticket.user_id) {
                if let Some(p) = payload_obj {
                    let npc_id = p.get_str("npcId").unwrap_or("");
                    let mode = p.get_str("controlMode");
                    let prompt = p.get_str("personalityPrompt");
                    let speed = p.get_f64("speedMultiplier");
                    game.override_npc(npc_id, mode, prompt, speed);
                    broadcaster.broadcast_admin_telemetry(&game);
                    send_snapshot(&mut conn, &player_id, &ticket, &game, &config, &competition, &broadcaster);
                }
            }
        } else if msg_type == "admin.agent.command" {
            if auth.is_admin_user(&ticket.user_id) {
                if let Some(p) = payload_obj {
                    let npc_id = p.get_str("npcId").unwrap_or("");
                    let cmd = p.get_str("command").unwrap_or("");
                    let target = p.get("target");
                    let tx = target.and_then(|t| t.get_f64("x"));
                    let ty = target.and_then(|t| t.get_f64("y"));
                    let tz = target.and_then(|t| t.get_f64("z"));
                    let state = p.get_str("state");
                    if cmd == "delete" {
                        game.delete_npc(npc_id);
                    } else {
                        game.command_npc(npc_id, cmd, tx, ty, tz, state);
                    }
                    broadcaster.broadcast_admin_telemetry(&game);
                    send_snapshot(&mut conn, &player_id, &ticket, &game, &config, &competition, &broadcaster);
                }
            }
        }
    }

    broadcaster.unregister(&player_id, conn_id);
    game.mark_disconnected(&ticket.session_id, &player_id, conn_id);
}
fn handle_hello(
    conn: &mut WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    instance_id: &str,
    game: &Arc<GameManager>,
    config: &Arc<ConfigService>,
    spatial: &Arc<SpatialService>,
    req_id: Option<String>,
) {
    let session = game.get_session_dto(&ticket.session_id).unwrap();
    let manifest = spatial.get_manifest();
    let config_rev = config.get_revision();

    let welcome_payload = JsonValue::Object(vec![
        ("connectionId".to_string(), JsonValue::String(AuthService::generate_id())),
        ("serverInstanceId".to_string(), JsonValue::String(instance_id.to_string())),
        ("session".to_string(), session.to_json()),
        ("playerId".to_string(), JsonValue::String(player_id.to_string())),
        ("configRevision".to_string(), JsonValue::Number(config_rev as f64)),
        ("manifest".to_string(), manifest.to_json()),
        ("heartbeatIntervalMs".to_string(), JsonValue::Number(10000.0)),
        ("heartbeatTimeoutMs".to_string(), JsonValue::Number(30000.0)),
    ]);

    let _ = conn.writer.lock().unwrap().send_envelope("server.welcome", req_id, welcome_payload);

    // Send world.interest
    let (px, _, pz) = game.get_player_pos(&ticket.session_id, player_id).unwrap_or((80.0, 0.0, 92.0));
    let interest = spatial.compute_interest(px, pz, 1);
    let _ = conn.writer.lock().unwrap().send_envelope("world.interest", None, interest.to_json());
}

fn send_snapshot(
    conn: &mut WsConnection,
    player_id: &str,
    ticket: &WsTicket,
    game: &Arc<GameManager>,
    config: &Arc<ConfigService>,
    competition: &Arc<CompetitionService>,
    broadcaster: &Arc<WsBroadcaster>,
) {
    if let Some((tick, status, players)) = game.get_room_snapshot(&ticket.session_id) {
        let npcs = game.get_all_npcs_dto();
        let tables = vec![competition.table_summary_to_json()];
        let snapshot_payload = JsonValue::Object(vec![
            ("tick".to_string(), JsonValue::Number(tick as f64)),
            ("interestRevision".to_string(), JsonValue::Number(1.0)),
            ("configRevision".to_string(), JsonValue::Number(config.get_revision() as f64)),
            ("sessionStatus".to_string(), JsonValue::String(status)),
            ("players".to_string(), JsonValue::Array(players.iter().map(|p| p.to_json()).collect())),
            ("npcs".to_string(), JsonValue::Array(npcs.into_iter().map(|n| n.to_json()).collect())),
            ("tables".to_string(), JsonValue::Array(tables)),
        ]);
        let other_pids: Vec<String> = players
            .iter()
            .filter(|p| p.player_id != player_id)
            .map(|p| p.player_id.clone())
            .collect();
        if !other_pids.is_empty() {
            broadcaster.broadcast_to_players(&other_pids, "world.snapshot", &snapshot_payload);
        }
        let _ = conn.writer.lock().unwrap().send_envelope("world.snapshot", None, snapshot_payload);
    }
}


fn handle_input(game: &Arc<GameManager>, session_id: &str, player_id: &str, payload: &JsonValue, config: &Arc<ConfigService>) {
    let seq = payload.get_i64("inputSeq").unwrap_or(0) as u64;
    let mx = payload.get_f64("moveX").unwrap_or(0.0);
    let mz = payload.get_f64("moveZ").unwrap_or(0.0);
    let yaw = payload.get_f64("yawRad").unwrap_or(0.0);
    let run = payload.get_bool("running").unwrap_or(false);
    let (walk_speed, run_mul, _) = config.get_character_speed();
    game.handle_input(session_id, player_id, seq, mx, mz, yaw, run, walk_speed, run_mul);
}

fn handle_npc_interact(
    conn: &mut WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    game: &Arc<GameManager>,
    ai: &Arc<NpcAiService>,
    config: &Arc<ConfigService>,
) {
    let req_id_str = req_id.unwrap_or_else(|| AuthService::generate_id());
    let p = match payload {
        Some(v) => v,
        None => return,
    };
    let npc_id = p.get_str("npcId").unwrap_or("");
    let action = p.get_str("action").unwrap_or("");
    let text = p.get_str("text").unwrap_or("");

    // Range check
    let (npc_x, npc_z) = match npc_id {
        "examiner-mathematics" | "examiner-informatics" | "examiner-history" | "examiner-flags" => (80.0, 87.0),
        "teacher-mathematics" => (70.7, 69.0),
        "teacher-informatics" => (77.7, 69.0),
        "teacher-history" => (84.7, 69.0),
        "teacher-flags" => (91.7, 69.0),
        _ => (83.0, 90.0), // Sofia
    };
    let (px, _, pz) = game.get_player_pos(&ticket.session_id, player_id).unwrap_or((80.0, 0.0, 92.0));
    let dist = ((px - npc_x).powi(2) + (pz - npc_z).powi(2)).sqrt();
    let (_, _, max_dist) = config.get_character_speed();

    if dist > max_dist {
        let err = ErrorResponse::new("OUT_OF_RANGE", "Player is out of range to interact with NPC", true, Some(req_id_str.clone()));
        let _ = conn.writer.lock().unwrap().send_envelope("server.error", Some(req_id_str), err.to_json());
        return;
    }

    // 1. Send npc.accepted (pending)
    let pending_dto = InteractionDto {
        request_id: req_id_str.clone(),
        npc_id: npc_id.to_string(),
        status: "pending".to_string(),
        text: "".to_string(),
        source: "none".to_string(),
        knowledge_ids: Vec::new(),
        progress_revision: 1,
        error: None,
    };
    let acc_payload = JsonValue::Object(vec![("interaction".to_string(), pending_dto.to_json())]);
    let _ = conn.writer.lock().unwrap().send_envelope("npc.accepted", Some(req_id_str.clone()), acc_payload);

    // 2. Process interaction
    {
        let mut npcs = game.npcs.lock().unwrap();
        if let Some(n) = npcs.get_mut(npc_id) {
            n.decision_log.push((Room::now_ms(), format!("Вопрос от {}: \"{}\"", player_id, text)));
        }
    }
    let cur_prog = ai.get_progress(&ticket.user_id);
    let result = ai.process_interaction(&ticket.user_id, &ticket.session_id, &req_id_str, npc_id, action, text, &cur_prog, "adaptive", "Давай начнём с наблюдения за окружающим миром.");
    {
        let mut npcs = game.npcs.lock().unwrap();
        if let Some(n) = npcs.get_mut(npc_id) {
            n.decision_log.push((Room::now_ms(), format!("Ответ ({}): \"{}\"", result.source, result.text)));
        }
    }
    for k in &result.knowledge_ids {
        ai.update_progress(&ticket.user_id, result.progress_revision, k);
    }
    ai.save_interaction(&ticket.user_id, &ticket.session_id, &req_id_str, "hash", npc_id, action, text, &result);

    // 3. Send npc.result
    let res_payload = JsonValue::Object(vec![("interaction".to_string(), result.to_json())]);
    let _ = conn.writer.lock().unwrap().send_envelope("npc.result", Some(req_id_str), res_payload);

    // 4. Send progress.updated
    let updated_prog = ai.get_progress(&ticket.user_id);
    let prog_dto = ProgressDto {
        player_id: player_id.to_string(),
        revision: result.progress_revision,
        completed_knowledge_ids: if updated_prog.completed_knowledge_ids.is_empty() && !result.knowledge_ids.is_empty() {
            result.knowledge_ids.clone()
        } else {
            updated_prog.completed_knowledge_ids
        },
        updated_at: rfc3339_now(),
    };
    let _ = conn.writer.lock().unwrap().send_envelope("progress.updated", None, prog_dto.to_json());
}

fn handle_competition_join(
    conn: &WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    game: &Arc<GameManager>,
    competition: &Arc<CompetitionService>,
    broadcaster: &Arc<WsBroadcaster>,
) {
    let p = match payload {
        Some(v) => v,
        None => return,
    };
    let table_id = p.get_str("tableId").unwrap_or("competition-central");
    let (px, _, pz) = game.get_player_pos(&ticket.session_id, player_id).unwrap_or((16.0, 0.0, 16.0));

    match competition.join_table(&ticket.user_id, player_id, &ticket.user_id, px, pz) {
        Ok((state_val, seat_id, lobby_id)) => {
            if let Some((pos, yaw, _)) = competition.get_seat_info(&seat_id) {
                game.set_player_pos(&ticket.session_id, player_id, pos.0, pos.1, pos.2, yaw);
            }
            game.update_player_activity(&ticket.user_id, "seated_competition", Some(table_id.to_string()), Some(seat_id.clone()));
            let participants = competition.get_participant_player_ids();
            broadcaster.broadcast_to_players(&participants, "competition.state", &state_val);

            let act_payload = JsonValue::Object(vec![
                ("activity".to_string(), JsonValue::Object(vec![
                    ("mode".to_string(), JsonValue::String("seated_competition".to_string())),
                    ("targetId".to_string(), JsonValue::String(table_id.to_string())),
                    ("seatId".to_string(), JsonValue::String(seat_id)),
                ])),
                ("lessonId".to_string(), JsonValue::Null),
                ("attemptId".to_string(), JsonValue::Null),
                ("matchId".to_string(), JsonValue::Null),
                ("lobbyId".to_string(), JsonValue::String(lobby_id)),
                ("revision".to_string(), JsonValue::Number(1.0)),
            ]);
            let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", req_id, act_payload);
        }
        Err((_, code, msg)) => {
            let err = ErrorResponse::new(code, msg, false, req_id.clone());
            let _ = conn.writer.lock().unwrap().send_envelope("server.error", req_id, err.to_json());
        }
    }
}




fn handle_competition_configure(
    conn: &WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    competition: &Arc<CompetitionService>,
    wallet: &Arc<WalletService>,
    broadcaster: &Arc<WsBroadcaster>,
) {
    let p = match payload {
        Some(v) => v,
        None => return,
    };
    let table_id = p.get_str("tableId").unwrap_or("");
    let lobby_id = p.get_str("lobbyId").unwrap_or("");
    let exp_rev = p.get_i64("expectedRevision").unwrap_or(0) as u64;
    let subject = p.get_str("subject").unwrap_or("");
    let stake = p.get_i64("stakeAura").unwrap_or(10) as i64;

    match competition.configure_lobby(player_id, subject, stake, exp_rev) {
        Ok(state_val) => {
            let _ = conn.writer.lock().unwrap().send_envelope("competition.state", req_id, state_val.clone());
            let participants = competition.get_participant_player_ids();
            broadcaster.broadcast_to_players(&participants, "competition.state", &state_val);
            for (pid, uid) in competition.get_participant_user_ids() {
                if let Ok(w) = wallet.get_wallet(&uid) {
                    broadcaster.send_to_player(&pid, "wallet.updated", None, w.to_json());
                }
            }
        }
        Err((_, code, msg)) => {
            let err = ErrorResponse::new(code, msg, false, req_id.clone());
            let _ = conn.writer.lock().unwrap().send_envelope("server.error", req_id, err.to_json());
        }
    }
}

fn handle_competition_ready(
    conn: &WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    competition: &Arc<CompetitionService>,
    wallet: &Arc<WalletService>,
    broadcaster: &Arc<WsBroadcaster>,
) {
    let p = match payload {
        Some(v) => v,
        None => return,
    };
    let table_id = p.get_str("tableId").unwrap_or("");
    let lobby_id = p.get_str("lobbyId").unwrap_or("");
    let exp_rev = p.get_i64("expectedRevision").unwrap_or(0) as u64;
    let ready = p.get_bool("ready").unwrap_or(false);

    match competition.set_ready(&ticket.user_id, player_id, ready, exp_rev) {
        Ok((state_val, wallet_dto)) => {
            let _ = conn.writer.lock().unwrap().send_envelope("competition.state", req_id, state_val.clone());
            let participants = competition.get_participant_player_ids();
            broadcaster.broadcast_to_players(&participants, "competition.state", &state_val);
            let _ = conn.writer.lock().unwrap().send_envelope("wallet.updated", None, wallet_dto.to_json());
        }
        Err((_, code, msg)) => {
            let err = ErrorResponse::new(code, msg, false, req_id.clone());
            let _ = conn.writer.lock().unwrap().send_envelope("server.error", req_id, err.to_json());
        }
    }
}




fn handle_competition_start(
    conn: &WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    competition: &Arc<CompetitionService>,
    wallet: &Arc<WalletService>,
    broadcaster: &Arc<WsBroadcaster>,
) {
    let p = match payload {
        Some(v) => v,
        None => return,
    };
    let table_id = p.get_str("tableId").unwrap_or("");
    let lobby_id = p.get_str("lobbyId").unwrap_or("");
    let exp_rev = p.get_i64("expectedRevision").unwrap_or(0) as u64;

    match competition.start_match(player_id, exp_rev) {
        Ok(state_val) => {
            let _ = conn.writer.lock().unwrap().send_envelope("competition.state", req_id, state_val.clone());
            let participants = competition.get_participant_player_ids();
            broadcaster.broadcast_to_players(&participants, "competition.state", &state_val);
            for (pid, uid) in competition.get_participant_user_ids() {
                if let Ok(w) = wallet.get_wallet(&uid) {
                    broadcaster.send_to_player(&pid, "wallet.updated", None, w.to_json());
                }
            }
        }
        Err((_, code, msg)) => {
            let err = ErrorResponse::new(code, msg, false, req_id.clone());
            let _ = conn.writer.lock().unwrap().send_envelope("server.error", req_id, err.to_json());
        }
    }
}

fn handle_competition_answer(
    conn: &WsConnection,
    player_id: &str,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    competition: &Arc<CompetitionService>,
    wallet: &Arc<WalletService>,
    broadcaster: &Arc<WsBroadcaster>,
) {
    let p = match payload {
        Some(v) => v,
        None => return,
    };
    let match_id = p.get_str("matchId").unwrap_or("");
    let question_id = p.get_str("questionId").unwrap_or("");
    let answer_val = if let Some(ans_obj) = p.get("answer") {
        ans_obj.get_str("value").unwrap_or("")
    } else {
        p.get_str("optionId").unwrap_or("")
    };

    let ans_dto = if let Some(a) = p.get("answer") {
        a.clone()
    } else {
        JsonValue::Object(vec![
            ("kind".to_string(), JsonValue::String("single_choice".to_string())),
            ("value".to_string(), JsonValue::String(answer_val.to_string())),
        ])
    };

    match competition.submit_answer(player_id, match_id, question_id, answer_val) {
        Ok(round_closed) => {
            let acc_payload = JsonValue::Object(vec![
                ("matchId".to_string(), JsonValue::String(match_id.to_string())),
                ("questionId".to_string(), JsonValue::String(question_id.to_string())),
                ("answer".to_string(), ans_dto),
                ("acceptedAt".to_string(), JsonValue::String(rfc3339_now())),
            ]);
            let _ = conn.writer.lock().unwrap().send_envelope("competition.answer.accepted", req_id, acc_payload);

            let participants = competition.get_participant_player_ids();
            if round_closed {
                if let Some(closed_payload) = competition.take_round_closed_payload() {
                    broadcaster.broadcast_to_players(&participants, "competition.round.closed", &closed_payload);
                }
                if let Some(settled_payload) = competition.take_settled_payload() {
                    broadcaster.broadcast_to_players(&participants, "competition.settled", &settled_payload);
                    for (pid, uid) in competition.get_participant_user_ids() {
                        if let Ok(w) = wallet.get_wallet(&uid) {
                            broadcaster.send_to_player(&pid, "wallet.updated", None, w.to_json());
                        }
                    }
                }
            }
            let cur_state = competition.state_to_json();
            broadcaster.broadcast_to_players(&participants, "competition.state", &cur_state);
        }
        Err((_, code, msg)) => {
            let err = ErrorResponse::new(code, msg, false, req_id.clone());
            let _ = conn.writer.lock().unwrap().send_envelope("server.error", req_id, err.to_json());
        }
    }
}

fn handle_competition_leave(
    conn: &WsConnection,
    ticket: &WsTicket,
    player_id: &str,
    req_id: Option<String>,
    competition: &Arc<CompetitionService>,
    wallet: &Arc<WalletService>,
    broadcaster: &Arc<WsBroadcaster>,
    game: &Arc<GameManager>,
) {
    // Move the player to the configured clear exit point before releasing the
    // seat. The next authoritative world snapshot then restores walking and
    // prevents the avatar from remaining wedged in the chair/table footprint.
    let activity = competition.get_activity(&ticket.user_id);
    if let Some(seat_id) = activity
        .get("activity")
        .and_then(|value| value.get_str("seatId"))
    {
        if let Some((_, yaw, exit)) = competition.get_seat_info(seat_id) {
            game.set_player_pos(&ticket.session_id, player_id, exit.0, exit.1, exit.2, yaw);
        }
    }
    let state_val = competition.leave_table(&ticket.user_id, player_id);
    game.update_player_activity(&ticket.user_id, "exploring", None, None);

    let act_payload = JsonValue::Object(vec![
        ("activity".to_string(), JsonValue::Object(vec![
            ("mode".to_string(), JsonValue::String("exploring".to_string())),
            ("targetId".to_string(), JsonValue::Null),
            ("seatId".to_string(), JsonValue::Null),
        ])),
        ("lessonId".to_string(), JsonValue::Null),
        ("attemptId".to_string(), JsonValue::Null),
        ("matchId".to_string(), JsonValue::Null),
        ("lobbyId".to_string(), JsonValue::Null),
        ("revision".to_string(), JsonValue::Number(1.0)),
    ]);
    let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", req_id, act_payload);

    if let Ok(w) = wallet.get_wallet(&ticket.user_id) {
        let _ = conn.writer.lock().unwrap().send_envelope("wallet.updated", None, w.to_json());
    }

    let remaining = competition.get_participant_player_ids();
    if !remaining.is_empty() {
        broadcaster.broadcast_to_players(&remaining, "competition.state", &state_val);
    }
}

fn handle_library_open(
    conn: &WsConnection,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    knowledge: &Arc<crate::knowledge::KnowledgeService>,
    game: &Arc<GameManager>,
    competition: &Arc<CompetitionService>,
    user_id: &str,
) {
    let book_id = payload.and_then(|p| p.get_str("bookId")).unwrap_or("");
    let module_id = match book_id {
        "book-info" | "book-informatics-basics" => "informatics-basics",
        "book-hist" | "book-history-basics" => "history-basics",
        "book-flags" | "book-flags-demo" => "flags-basics",
        _ => "math-basics",
    };
    let material = knowledge.get_module_material(module_id, "v1").unwrap_or(JsonValue::Null);
    let lesson_id = AuthService::generate_id();
    game.update_player_activity(user_id, "learning", Some(book_id.to_string()), None);
    competition.set_activity(user_id, "learning", Some(book_id), None, Some(&lesson_id), None, None, None);
    let resp_payload = JsonValue::Object(vec![
        ("lessonId".to_string(), JsonValue::String(lesson_id.clone())),
        ("material".to_string(), material),
    ]);
    let _ = conn.writer.lock().unwrap().send_envelope("library.opened", req_id, resp_payload);

    let act_payload = competition.get_activity(user_id);
    let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", None, act_payload);
}

fn handle_country_describe(
    conn: &WsConnection,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    knowledge: &Arc<crate::knowledge::KnowledgeService>,
) {
    let country_id = payload.and_then(|p| p.get_str("countryId")).unwrap_or("");
    if let Some(card) = knowledge.get_country_description(country_id) {
        let _ = conn.writer.lock().unwrap().send_envelope("country.description", req_id, card);
    } else {
        let err = ErrorResponse::new("NOT_FOUND", "Country card not found", false, req_id.clone());
        let _ = conn.writer.lock().unwrap().send_envelope("server.error", req_id, err.to_json());
    }
}

fn handle_lesson_open(
    conn: &WsConnection,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    knowledge: &Arc<crate::knowledge::KnowledgeService>,
    game: &Arc<GameManager>,
    competition: &Arc<CompetitionService>,
    user_id: &str,
) {
    let npc_id = payload.and_then(|p| p.get_str("npcId")).unwrap_or("");
    let module_id = match npc_id {
        "examiner-informatics" | "teacher-informatics" => "informatics-basics",
        "examiner-history" | "teacher-history" => "history-basics",
        "examiner-flags" | "teacher-flags" => "flags-basics",
        _ => "math-basics",
    };
    let material = knowledge.get_module_material(module_id, "v1").unwrap_or(JsonValue::Null);
    let lesson_id = AuthService::generate_id();
    game.update_player_activity(user_id, "learning", Some(npc_id.to_string()), None);
    competition.set_activity(user_id, "learning", Some(npc_id), None, Some(&lesson_id), None, None, None);
    let resp_payload = JsonValue::Object(vec![
        ("lessonId".to_string(), JsonValue::String(lesson_id.clone())),
        ("material".to_string(), material),
    ]);
    let _ = conn.writer.lock().unwrap().send_envelope("lesson.opened", req_id, resp_payload);

    let act_payload = competition.get_activity(user_id);
    let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", None, act_payload);
}

fn handle_lesson_close(
    conn: &WsConnection,
    req_id: Option<String>,
    game: &Arc<GameManager>,
    competition: &Arc<CompetitionService>,
    user_id: &str,
) {
    game.update_player_activity(user_id, "exploring", None, None);
    competition.set_activity(user_id, "exploring", None, None, None, None, None, None);
    let act_payload = competition.get_activity(user_id);
    let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", req_id, act_payload);
}

fn handle_npc_cancel(
    conn: &WsConnection,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
) {
    let req_id_str = req_id.unwrap_or_else(|| AuthService::generate_id());
    let npc_id = payload.and_then(|p| p.get_str("npcId")).unwrap_or("npc-guide");
    let cancel_dto = InteractionDto {
        request_id: req_id_str.clone(),
        npc_id: npc_id.to_string(),
        status: "cancelled".to_string(),
        text: "".to_string(),
        source: "none".to_string(),
        knowledge_ids: Vec::new(),
        progress_revision: 1,
        error: None,
    };
    let cancel_payload = JsonValue::Object(vec![("interaction".to_string(), cancel_dto.to_json())]);
    let _ = conn.writer.lock().unwrap().send_envelope("npc.cancelled", Some(req_id_str), cancel_payload);
}

#[derive(Clone)]
pub struct QuizAttemptState {
    pub attempt_id: String,
    pub module_id: String,
    pub npc_id: String,
    pub seat_id: String,
    pub status: String,
    pub revision: u64,
    pub ordinal: usize,
    pub question_count: usize,
    pub pass_score: usize,
    pub score: usize,
    pub questions: Vec<JsonValue>,
}

static QUIZ_ATTEMPTS: Mutex<Option<HashMap<String, QuizAttemptState>>> = Mutex::new(None);

pub fn with_quiz_attempts<F, R>(f: F) -> R
where
    F: FnOnce(&mut HashMap<String, QuizAttemptState>) -> R,
{
    let mut guard = QUIZ_ATTEMPTS.lock().unwrap();
    if guard.is_none() {
        *guard = Some(HashMap::new());
    }
    f(guard.as_mut().unwrap())
}

pub fn get_quiz_attempt_dto(attempt_id: &str) -> JsonValue {
    let st = with_quiz_attempts(|map| map.get(attempt_id).cloned());
    let state = st.unwrap_or_else(|| {
        let mod_id = "history-basics";
        let path = format!("assets/content/{}.json", mod_id);
        let content_val = std::fs::read_to_string(&path).ok().and_then(|c| parse_json(&c).ok()).unwrap_or(JsonValue::Null);
        let q_arr = content_val.get("questions").and_then(|q| q.as_array().map(|arr| arr.to_vec())).unwrap_or_default();
        QuizAttemptState {
            attempt_id: attempt_id.to_string(),
            module_id: mod_id.to_string(),
            npc_id: "examiner-history".to_string(),
            seat_id: format!("seat-{}", mod_id),
            status: "active".to_string(),
            revision: 1,
            ordinal: 1,
            question_count: 5,
            pass_score: 4,
            score: 0,
            questions: q_arr,
        }
    });

    let cur_q = state.questions.get(state.ordinal.saturating_sub(1))
        .and_then(|q| q.get("question").cloned())
        .unwrap_or(JsonValue::Null);

    JsonValue::Object(vec![
        ("attemptId".to_string(), JsonValue::String(state.attempt_id)),
        ("moduleId".to_string(), JsonValue::String(state.module_id)),
        ("contentVersion".to_string(), JsonValue::String("v1".to_string())),
        ("npcId".to_string(), JsonValue::String(state.npc_id)),
        ("seatId".to_string(), JsonValue::String(state.seat_id)),
        ("status".to_string(), JsonValue::String(state.status)),
        ("revision".to_string(), JsonValue::Number(state.revision as f64)),
        ("ordinal".to_string(), JsonValue::Number(state.ordinal as f64)),
        ("questionCount".to_string(), JsonValue::Number(state.question_count as f64)),
        ("passScore".to_string(), JsonValue::Number(state.pass_score as f64)),
        ("score".to_string(), JsonValue::Number(state.score as f64)),
        ("question".to_string(), cur_q),
        ("feedback".to_string(), JsonValue::Null),
        ("result".to_string(), JsonValue::Null),
        ("interruptionReason".to_string(), JsonValue::Null),
        ("scoredQuestionCount".to_string(), JsonValue::Number(state.question_count as f64)),
        ("suspendedAt".to_string(), JsonValue::Null),
        ("resumeState".to_string(), JsonValue::Null),
    ])
}

fn sanitize_question(mut q: JsonValue) -> JsonValue {
    if let JsonValue::Object(ref mut fields) = q {
        let is_single = fields.iter().any(|(k, v)| k == "kind" && v.as_str() == Some("single_choice"));
        if !is_single {
            fields.retain(|(k, _)| k != "options");
        }
    }
    q
}

fn handle_quiz_start(
    conn: &WsConnection,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    _knowledge: &Arc<crate::knowledge::KnowledgeService>,
    game: &Arc<GameManager>,
    competition: &Arc<CompetitionService>,
    user_id: &str,
) {
    let npc_id = payload.and_then(|p| p.get_str("npcId")).unwrap_or("examiner-mathematics");
    let module_id = match npc_id {
        "examiner-informatics" | "teacher-informatics" => "informatics-basics",
        "examiner-history" | "teacher-history" => "history-basics",
        "examiner-flags" | "teacher-flags" => "flags-basics",
        _ => "math-basics",
    };
    let seat_id = format!("seat-{}", module_id);
    let attempt_id = payload.and_then(|p| p.get_str("attemptId"))
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| AuthService::generate_id());

    let candidates = [
        format!("assets/content/{}.json", module_id),
        format!("../assets/content/{}.json", module_id),
        format!("../../assets/content/{}.json", module_id),
    ];
    let mut content_val = JsonValue::Null;
    for path in &candidates {
        if let Ok(c) = std::fs::read_to_string(path) {
            if let Ok(val) = parse_json(&c) {
                content_val = val;
                break;
            }
        }
    }
    let mut questions_arr = content_val.get("questions").and_then(|q| q.as_array().map(|arr| arr.to_vec())).unwrap_or_default();
    if questions_arr.len() > 5 {
        for i in 0..questions_arr.len() {
            let j = (crate::auth::rand_simple() as usize) % questions_arr.len();
            questions_arr.swap(i, j);
        }
    }
    let first_q = sanitize_question(questions_arr.first().and_then(|q| q.get("question").cloned()).unwrap_or(JsonValue::Null));

    let state = QuizAttemptState {
        attempt_id: attempt_id.clone(),
        module_id: module_id.to_string(),
        npc_id: npc_id.to_string(),
        seat_id: seat_id.clone(),
        status: "active".to_string(),
        revision: 1,
        ordinal: 1,
        question_count: 5,
        pass_score: 4,
        score: 0,
        questions: questions_arr,
    };
    with_quiz_attempts(|map| {
        map.insert(attempt_id.clone(), state);
    });

    game.update_player_activity(user_id, "seated_quiz", Some(npc_id.to_string()), Some(seat_id.clone()));
    competition.set_activity(user_id, "seated_quiz", Some(npc_id), Some(&seat_id), None, Some(&attempt_id), None, None);

    let attempt_dto = JsonValue::Object(vec![
        ("attemptId".to_string(), JsonValue::String(attempt_id.clone())),
        ("moduleId".to_string(), JsonValue::String(module_id.to_string())),
        ("contentVersion".to_string(), JsonValue::String("v1".to_string())),
        ("npcId".to_string(), JsonValue::String(npc_id.to_string())),
        ("seatId".to_string(), JsonValue::String(seat_id.clone())),
        ("status".to_string(), JsonValue::String("active".to_string())),
        ("revision".to_string(), JsonValue::Number(1.0)),
        ("ordinal".to_string(), JsonValue::Number(1.0)),
        ("questionCount".to_string(), JsonValue::Number(5.0)),
        ("passScore".to_string(), JsonValue::Number(4.0)),
        ("score".to_string(), JsonValue::Number(0.0)),
        ("question".to_string(), first_q),
        ("feedback".to_string(), JsonValue::Null),
        ("result".to_string(), JsonValue::Null),
        ("interruptionReason".to_string(), JsonValue::Null),
        ("scoredQuestionCount".to_string(), JsonValue::Number(5.0)),
        ("suspendedAt".to_string(), JsonValue::Null),
        ("resumeState".to_string(), JsonValue::Null),
    ]);
    let _ = conn.writer.lock().unwrap().send_envelope("quiz.state", req_id, attempt_dto);

    let act_payload = competition.get_activity(user_id);
    let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", None, act_payload);
}

fn handle_quiz_answer(conn: &WsConnection, req_id: Option<String>, payload: Option<&JsonValue>) {
    let attempt_id = payload.and_then(|p| p.get_str("attemptId")).unwrap_or("");
    let question_id = payload.and_then(|p| p.get_str("questionId")).unwrap_or("");
    let answer = payload.and_then(|p| p.get("answer")).cloned().unwrap_or(JsonValue::Null);
    let val_str = answer.get_str("value").unwrap_or("").to_string();
    let val_trimmed = val_str.trim().to_lowercase();

    let st = with_quiz_attempts(|map| map.get(attempt_id).cloned());
    let mut state = st.unwrap_or_else(|| {
        let mod_id = if question_id.starts_with("hist") {
            "history-basics"
        } else if question_id.starts_with("info") {
            "informatics-basics"
        } else if question_id.starts_with("flag") {
            "flags-basics"
        } else {
            "math-basics"
        };
        let n_id = match mod_id {
            "history-basics" => "examiner-history",
            "informatics-basics" => "examiner-informatics",
            "flags-basics" => "examiner-flags",
            _ => "examiner-mathematics",
        };
        let path = format!("assets/content/{}.json", mod_id);
        let content_val = std::fs::read_to_string(&path).ok().and_then(|c| parse_json(&c).ok()).unwrap_or(JsonValue::Null);
        let q_arr = content_val.get("questions").and_then(|q| q.as_array().map(|arr| arr.to_vec())).unwrap_or_default();
        QuizAttemptState {
            attempt_id: attempt_id.to_string(),
            module_id: mod_id.to_string(),
            npc_id: n_id.to_string(),
            seat_id: format!("seat-{}", mod_id),
            status: "active".to_string(),
            revision: 1,
            ordinal: 1,
            question_count: 5,
            pass_score: 4,
            score: 0,
            questions: q_arr,
        }
    });

    let q_item = state.questions.get(state.ordinal.saturating_sub(1)).cloned().unwrap_or(JsonValue::Null);
    let mut expected = val_str.clone();
    let mut is_corr = true;
    let mut explanation = "Ответ принят.".to_string();

    if let Some(exp) = q_item.get_str("explanation") {
        explanation = exp.to_string();
    }
    if let Some(corr_opt) = q_item.get_str("correctOptionId") {
        if let Some(opts) = q_item.get("question").and_then(|q| q.get("options")).and_then(|o| o.as_array()) {
            for opt in opts {
                if opt.get_str("optionId") == Some(corr_opt) {
                    if let Some(t) = opt.get_str("text") {
                        expected = t.to_string();
                        is_corr = val_trimmed == corr_opt.to_lowercase() || val_trimmed == t.trim().to_lowercase();
                    }
                }
            }
        }
    } else if let Some(accepted) = q_item.get("answerKey").and_then(|k| k.get("acceptedValues")).and_then(|a| a.as_array()) {
        if let Some(first_acc) = accepted.first().and_then(|v| v.as_str()) {
            expected = first_acc.to_string();
            is_corr = accepted.iter().any(|v| v.as_str().map(|s| s.trim().to_lowercase()) == Some(val_trimmed.clone()));
        }
    }

    if is_corr {
        state.score += 1;
    }
    state.status = "feedback".to_string();
    state.revision += 1;

    let eval_status = if is_corr { "correct" } else { "incorrect" };
    let feedback = JsonValue::Object(vec![
        ("questionId".to_string(), JsonValue::String(question_id.to_string())),
        ("submittedAnswer".to_string(), answer),
        ("correct".to_string(), JsonValue::Bool(is_corr)),
        ("expectedAnswer".to_string(), JsonValue::String(expected)),
        ("explanation".to_string(), JsonValue::String(explanation)),
        ("evaluationStatus".to_string(), JsonValue::String(eval_status.to_string())),
    ]);

    let attempt_dto = JsonValue::Object(vec![
        ("attemptId".to_string(), JsonValue::String(state.attempt_id.clone())),
        ("moduleId".to_string(), JsonValue::String(state.module_id.clone())),
        ("contentVersion".to_string(), JsonValue::String("v1".to_string())),
        ("npcId".to_string(), JsonValue::String(state.npc_id.clone())),
        ("seatId".to_string(), JsonValue::String(state.seat_id.clone())),
        ("status".to_string(), JsonValue::String(state.status.clone())),
        ("revision".to_string(), JsonValue::Number(state.revision as f64)),
        ("ordinal".to_string(), JsonValue::Number(state.ordinal as f64)),
        ("questionCount".to_string(), JsonValue::Number(state.question_count as f64)),
        ("passScore".to_string(), JsonValue::Number(state.pass_score as f64)),
        ("score".to_string(), JsonValue::Number(state.score as f64)),
        ("question".to_string(), JsonValue::Null),
        ("feedback".to_string(), feedback),
        ("result".to_string(), JsonValue::Null),
        ("interruptionReason".to_string(), JsonValue::Null),
        ("scoredQuestionCount".to_string(), JsonValue::Number(state.question_count as f64)),
        ("suspendedAt".to_string(), JsonValue::Null),
        ("resumeState".to_string(), JsonValue::Null),
    ]);

    with_quiz_attempts(|map| {
        map.insert(attempt_id.to_string(), state);
    });

    let _ = conn.writer.lock().unwrap().send_envelope("quiz.state", req_id, attempt_dto);
}

fn handle_quiz_next(conn: &WsConnection, req_id: Option<String>, payload: Option<&JsonValue>) {
    let attempt_id = payload.and_then(|p| p.get_str("attemptId")).unwrap_or("");
    let st = with_quiz_attempts(|map| map.get(attempt_id).cloned());
    if let Some(mut state) = st {
        state.revision += 1;
        let is_completed = state.ordinal >= state.question_count;
        let mut next_q = JsonValue::Null;
        let mut result = JsonValue::Null;

        if is_completed {
            state.status = "completed".to_string();
            let passed = state.score >= state.pass_score;
            result = JsonValue::Object(vec![
                ("score".to_string(), JsonValue::Number(state.score as f64)),
                ("maximumScore".to_string(), JsonValue::Number(state.question_count as f64)),
                ("passed".to_string(), JsonValue::Bool(passed)),
                ("reviewTopics".to_string(), JsonValue::Array(Vec::new())),
            ]);
        } else {
            state.ordinal += 1;
            state.status = "active".to_string();
            next_q = sanitize_question(state.questions.get(state.ordinal.saturating_sub(1))
                .and_then(|q| q.get("question").cloned())
                .unwrap_or(JsonValue::Null));
        }

        let attempt_dto = JsonValue::Object(vec![
            ("attemptId".to_string(), JsonValue::String(state.attempt_id.clone())),
            ("moduleId".to_string(), JsonValue::String(state.module_id.clone())),
            ("contentVersion".to_string(), JsonValue::String("v1".to_string())),
            ("npcId".to_string(), JsonValue::String(state.npc_id.clone())),
            ("seatId".to_string(), JsonValue::String(state.seat_id.clone())),
            ("status".to_string(), JsonValue::String(state.status.clone())),
            ("revision".to_string(), JsonValue::Number(state.revision as f64)),
            ("ordinal".to_string(), JsonValue::Number(state.ordinal as f64)),
            ("questionCount".to_string(), JsonValue::Number(state.question_count as f64)),
            ("passScore".to_string(), JsonValue::Number(state.pass_score as f64)),
            ("score".to_string(), JsonValue::Number(state.score as f64)),
            ("question".to_string(), next_q),
            ("feedback".to_string(), JsonValue::Null),
            ("result".to_string(), result),
            ("interruptionReason".to_string(), JsonValue::Null),
            ("scoredQuestionCount".to_string(), JsonValue::Number(state.question_count as f64)),
            ("suspendedAt".to_string(), JsonValue::Null),
            ("resumeState".to_string(), JsonValue::Null),
        ]);

        with_quiz_attempts(|map| {
            map.insert(attempt_id.to_string(), state);
        });

        let _ = conn.writer.lock().unwrap().send_envelope("quiz.state", req_id, attempt_dto);
    }
}

fn handle_quiz_leave(
    conn: &WsConnection,
    req_id: Option<String>,
    payload: Option<&JsonValue>,
    game: &Arc<GameManager>,
    competition: &Arc<CompetitionService>,
    user_id: &str,
    abandon: bool,
) {
    let attempt_id = payload.and_then(|p| p.get_str("attemptId")).unwrap_or("");
    game.update_player_activity(user_id, "exploring", None, None);
    competition.set_activity(user_id, "exploring", None, None, None, None, None, None);
    let status_str = if abandon { "interrupted" } else { "suspended" };

    let st = with_quiz_attempts(|map| map.get(attempt_id).cloned());
    let (mod_id, npc_id, seat_id, rev, ord, score) = if let Some(state) = st {
        (state.module_id, state.npc_id, state.seat_id, state.revision + 1, state.ordinal, state.score)
    } else {
        ("math-basics".to_string(), "examiner-mathematics".to_string(), "seat-math-basics".to_string(), 2, 1, 0)
    };

    let attempt_dto = JsonValue::Object(vec![
        ("attemptId".to_string(), JsonValue::String(attempt_id.to_string())),
        ("moduleId".to_string(), JsonValue::String(mod_id)),
        ("contentVersion".to_string(), JsonValue::String("v1".to_string())),
        ("npcId".to_string(), JsonValue::String(npc_id)),
        ("seatId".to_string(), JsonValue::String(seat_id)),
        ("status".to_string(), JsonValue::String(status_str.to_string())),
        ("revision".to_string(), JsonValue::Number(rev as f64)),
        ("ordinal".to_string(), JsonValue::Number(ord as f64)),
        ("questionCount".to_string(), JsonValue::Number(5.0)),
        ("passScore".to_string(), JsonValue::Number(4.0)),
        ("score".to_string(), JsonValue::Number(score as f64)),
        ("question".to_string(), JsonValue::Null),
        ("feedback".to_string(), JsonValue::Null),
        ("result".to_string(), JsonValue::Null),
        ("interruptionReason".to_string(), if abandon { JsonValue::String("left".to_string()) } else { JsonValue::Null }),
        ("scoredQuestionCount".to_string(), JsonValue::Number(5.0)),
        ("suspendedAt".to_string(), if !abandon { JsonValue::String(rfc3339_now()) } else { JsonValue::Null }),
        ("resumeState".to_string(), if !abandon { JsonValue::String("active".to_string()) } else { JsonValue::Null }),
    ]);
    let _ = conn.writer.lock().unwrap().send_envelope("quiz.state", req_id.clone(), attempt_dto);
    let act_payload = competition.get_activity(user_id);
    let _ = conn.writer.lock().unwrap().send_envelope("activity.changed", req_id, act_payload);
}



