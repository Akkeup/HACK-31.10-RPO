// ws.rs: RFC 6455 WebSocket Transport and Application Event Loop

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::ai::NpcAiService;
use crate::auth::{AuthService, User, WsTicket};
use crate::competition::CompetitionService;
use crate::config::ConfigService;
use crate::game::GameManager;
use crate::json::{parse_json, JsonValue};
use crate::models::*;
use crate::sha::{base64_encode, sha1_bytes, sha256_hex};
use crate::spatial::SpatialService;
use crate::wallet::WalletService;

pub struct WsWriter {
    stream: TcpStream,
    pub server_seq: u64,
}

impl WsWriter {
    pub fn new(stream: TcpStream) -> Self {
        Self { stream, server_seq: 1 }
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
        let env = make_server_envelope(msg_type, req_id, seq, &rfc3339_now(), payload);
        self.write_json(&env)
    }
}

pub struct WsBroadcaster {
    clients: Mutex<HashMap<String, (String, Arc<Mutex<WsWriter>>)>>, // player_id -> (user_id, writer)
}

impl WsBroadcaster {
    pub fn new() -> Self {
        Self { clients: Mutex::new(HashMap::new()) }
    }

    pub fn register(&self, player_id: &str, user_id: &str, writer: Arc<Mutex<WsWriter>>) {
        let mut lock = self.clients.lock().unwrap();
        lock.insert(player_id.to_string(), (user_id.to_string(), writer));
    }

    pub fn unregister(&self, player_id: &str) {
        let mut lock = self.clients.lock().unwrap();
        lock.remove(player_id);
    }

    pub fn send_to_player(&self, player_id: &str, msg_type: &str, req_id: Option<String>, payload: JsonValue) {
        let lock = self.clients.lock().unwrap();
        if let Some((_, writer)) = lock.get(player_id) {
            let mut w = writer.lock().unwrap();
            let _ = w.send_envelope(msg_type, req_id, payload);
        }
    }

    pub fn send_to_user(&self, user_id: &str, msg_type: &str, req_id: Option<String>, payload: JsonValue) {
        let lock = self.clients.lock().unwrap();
        for (_, (u_id, writer)) in lock.iter() {
            if u_id == user_id {
                let mut w = writer.lock().unwrap();
                let _ = w.send_envelope(msg_type, req_id.clone(), payload.clone());
            }
        }
    }

    pub fn broadcast_to_players(&self, player_ids: &[String], msg_type: &str, payload: &JsonValue) {
        let lock = self.clients.lock().unwrap();
        for pid in player_ids {
            if let Some((_, writer)) = lock.get(pid) {
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
    pub fn new(stream: TcpStream) -> Result<Self, std::io::Error> {
        let write_stream = stream.try_clone()?;
        let writer = Arc::new(Mutex::new(WsWriter::new(write_stream)));
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


pub fn perform_ws_handshake(mut stream: TcpStream, ws_key: &str) -> Result<WsConnection, std::io::Error> {
    let mut combined = String::from(ws_key);
    combined.push_str("258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    let sha1 = sha1_bytes(combined.as_bytes());
    let accept = base64_encode(&sha1);

    let resp = format!(
        "HTTP/1.1 101 Switching Protocols\r\n\
         Upgrade: websocket\r\n\
         Connection: Upgrade\r\n\
         Sec-WebSocket-Accept: {}\r\n\
         Sec-WebSocket-Protocol: discovery.v1\r\n\r\n",
        accept
    );
    stream.write_all(resp.as_bytes())?;
    stream.flush()?;
    WsConnection::new(stream)
}

pub fn rfc3339_now() -> String {
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    format!("{}-{:02}-{:02}T{:02}:{:02}:{:02}Z", 2026, 10, 31, (t / 3600) % 24, (t / 60) % 60, t % 60)
}
pub fn run_ws_session(
    mut conn: WsConnection,
    ticket: WsTicket,
    player_id: String,
    game: Arc<GameManager>,
    config: Arc<ConfigService>,
    spatial: Arc<SpatialService>,
    ai: Arc<NpcAiService>,
    wallet: Arc<WalletService>,
    competition: Arc<CompetitionService>,
    broadcaster: Arc<WsBroadcaster>,
    instance_id: String,
) {
    broadcaster.register(&player_id, &ticket.user_id, conn.writer.clone());
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
                let _ = conn.write_json(&make_server_envelope("server.error", None, seq, &rfc3339_now(), err.to_json()));
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
                let _ = conn.write_json(&make_server_envelope("server.error", req_id, seq, &rfc3339_now(), err.to_json()));
                continue;
            }
            has_received_hello = true;
            handle_hello(&mut conn, &ticket, &player_id, &instance_id, &game, &config, &spatial, req_id);
        } else if msg_type == "world.ready" {
            is_ready = true;
            send_snapshot(&mut conn, &ticket, &game, &config, &competition);
        } else if msg_type == "player.input" {
            if let Some(p) = payload_obj {
                handle_input(&game, &ticket.session_id, &player_id, p);
                send_snapshot(&mut conn, &ticket, &game, &config, &competition);
            }
        } else if msg_type == "npc.interact" {
            handle_npc_interact(&mut conn, &ticket, &player_id, req_id, payload_obj, &game, &ai, &config);
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
            let _ = conn.write_json(&make_server_envelope("server.pong", req_id, seq, &rfc3339_now(), pong));
        }
    }

    broadcaster.unregister(&player_id);
    game.mark_disconnected(&ticket.session_id, &player_id);
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

    let seq = conn.next_seq();
    let _ = conn.write_json(&make_server_envelope("server.welcome", req_id, seq, &rfc3339_now(), welcome_payload));

    // Send world.interest
    let (px, _, pz) = game.get_player_pos(&ticket.session_id, player_id).unwrap_or((1.0, 0.0, 1.0));
    let interest = spatial.compute_interest(px, pz, 1);
    let int_seq = conn.next_seq();
    let _ = conn.write_json(&make_server_envelope("world.interest", None, int_seq, &rfc3339_now(), interest.to_json()));
}

fn send_snapshot(
    conn: &mut WsConnection,
    ticket: &WsTicket,
    game: &Arc<GameManager>,
    config: &Arc<ConfigService>,
    competition: &Arc<CompetitionService>,
) {
    if let Some((tick, status, players)) = game.get_room_snapshot(&ticket.session_id) {
        let npcs = vec![
            NpcDto {
                npc_id: "npc-guide".to_string(),
                display_name: "Проводник".to_string(),
                position: PositionDto { x: 2.0, y: 0.0, z: 1.0 },
                yaw_rad: 0.0,
                state: "idle".to_string(),
                subject: "История открытий".to_string(),
                role: "teacher".to_string(),
                module_id: "history-basics".to_string(),
            }
        ];
        let tables = vec![competition.table_summary_to_json()];
        let snapshot_payload = JsonValue::Object(vec![
            ("tick".to_string(), JsonValue::Number(tick as f64)),
            ("interestRevision".to_string(), JsonValue::Number(1.0)),
            ("configRevision".to_string(), JsonValue::Number(config.get_revision() as f64)),
            ("sessionStatus".to_string(), JsonValue::String(status)),
            ("players".to_string(), JsonValue::Array(players.into_iter().map(|p| p.to_json()).collect())),
            ("npcs".to_string(), JsonValue::Array(npcs.into_iter().map(|n| n.to_json()).collect())),
            ("tables".to_string(), JsonValue::Array(tables)),
        ]);
        let seq = conn.next_seq();
        let _ = conn.write_json(&make_server_envelope("world.snapshot", None, seq, &rfc3339_now(), snapshot_payload));
    }
}


fn handle_input(game: &Arc<GameManager>, session_id: &str, player_id: &str, payload: &JsonValue) {
    let seq = payload.get_i64("inputSeq").unwrap_or(0) as u64;
    let mx = payload.get_f64("moveX").unwrap_or(0.0);
    let mz = payload.get_f64("moveZ").unwrap_or(0.0);
    let yaw = payload.get_f64("yawRad").unwrap_or(0.0);
    let run = payload.get_bool("running").unwrap_or(false);
    game.handle_input(session_id, player_id, seq, mx, mz, yaw, run);
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

    // Range check: NPC position is (1, 0, 2)
    let (px, _, pz) = game.get_player_pos(&ticket.session_id, player_id).unwrap_or((1.0, 0.0, 1.0));
    let dist = ((px - 1.0).powi(2) + (pz - 2.0).powi(2)).sqrt();
    let (_, _, max_dist) = config.get_character_speed();

    if dist > max_dist {
        let seq = conn.next_seq();
        let err = ErrorResponse::new("OUT_OF_RANGE", "Player is out of range to interact with NPC", true, Some(req_id_str.clone()));
        let _ = conn.write_json(&make_server_envelope("server.error", Some(req_id_str), seq, &rfc3339_now(), err.to_json()));
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
    let acc_seq = conn.next_seq();
    let _ = conn.write_json(&make_server_envelope("npc.accepted", Some(req_id_str.clone()), acc_seq, &rfc3339_now(), acc_payload));

    // 2. Process interaction
    let cur_prog = ai.get_progress(&ticket.user_id);
    let result = ai.process_interaction(&ticket.user_id, &ticket.session_id, &req_id_str, npc_id, action, text, &cur_prog, "adaptive", "Давай начнём с наблюдения за окружающим миром.");
    for k in &result.knowledge_ids {
        ai.update_progress(&ticket.user_id, result.progress_revision, k);
    }
    ai.save_interaction(&ticket.user_id, &ticket.session_id, &req_id_str, "hash", npc_id, action, text, &result);

    // 3. Send npc.result
    let res_payload = JsonValue::Object(vec![("interaction".to_string(), result.to_json())]);
    let res_seq = conn.next_seq();
    let _ = conn.write_json(&make_server_envelope("npc.result", Some(req_id_str), res_seq, &rfc3339_now(), res_payload));

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
    let prog_seq = conn.next_seq();
    let _ = conn.write_json(&make_server_envelope("progress.updated", None, prog_seq, &rfc3339_now(), prog_dto.to_json()));
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
    let option_id = p.get_str("optionId").unwrap_or("");

    match competition.submit_answer(player_id, match_id, question_id, option_id) {
        Ok(round_closed) => {
            let acc_payload = JsonValue::Object(vec![
                ("matchId".to_string(), JsonValue::String(match_id.to_string())),
                ("questionId".to_string(), JsonValue::String(question_id.to_string())),
                ("optionId".to_string(), JsonValue::String(option_id.to_string())),
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



