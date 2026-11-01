// main.rs: Discovery Authoritative Game Server Entry Point

mod ai;
mod auth;
mod competition;
mod config;
mod db;
mod game;
mod http;
mod json;
mod knowledge;
mod models;
mod sha;
mod spatial;
mod wallet;
mod ws;

use std::net::TcpListener;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use crate::ai::NpcAiService;
use crate::auth::AuthService;
use crate::competition::CompetitionService;
use crate::config::ConfigService;
use crate::db::DbPool;
use crate::game::GameManager;
use crate::http::{dispatch_http, read_http_request, HttpResponse};
use crate::knowledge::KnowledgeService;
use crate::spatial::SpatialService;
use crate::wallet::WalletService;
use crate::ws::{perform_ws_handshake, run_ws_session, WsBroadcaster};

fn main() {
    println!("=== Discovery Game Server v1.0.0 ===");

    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let db_host = std::env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let db_port = std::env::var("DB_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(5432);
    let db_user = std::env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string());
    let db_pass = std::env::var("DB_PASSWORD").unwrap_or_else(|_| "postgres".to_string());
    let db_name = std::env::var("DB_NAME").unwrap_or_else(|_| "discovery".to_string());

    let pool = DbPool::new(&db_host, db_port, &db_user, &db_pass, &db_name);
    println!("Connected to PostgreSQL 18 at {}:{}", db_host, db_port);
    let _ = pool.execute("UPDATE player_activities SET mode = 'exploring', target_id = NULL, seat_id = NULL, lesson_id = NULL, attempt_id = NULL, match_id = NULL, lobby_id = NULL WHERE mode != 'exploring'");

    let auth = Arc::new(AuthService::new(pool.clone()));
    let config = Arc::new(ConfigService::new(pool.clone()));
    let spatial = Arc::new(SpatialService::new());
    let ai = Arc::new(NpcAiService::new(pool.clone()));
    let game = Arc::new(GameManager::new(pool.clone()));
    let wallet = Arc::new(WalletService::new(pool.clone()));
    let competition = Arc::new(CompetitionService::new(pool.clone(), Arc::clone(&wallet)));
    let knowledge = Arc::new(KnowledgeService::new(pool.clone()));
    let broadcaster = Arc::new(WsBroadcaster::new());

    let instance_id = AuthService::generate_id();
    println!("Server instance ID: {}", instance_id);
    println!("World W={} bytes, Budget B={} bytes", spatial.get_manifest().total_world_bytes, spatial.get_manifest().cache_budget_bytes);

    // 20 Hz simulation tick thread
    let game_tick = Arc::clone(&game);
    let config_tick = Arc::clone(&config);
    let comp_tick = Arc::clone(&competition);
    let bcast_tick = Arc::clone(&broadcaster);
    let wallet_tick = Arc::clone(&wallet);
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(50));
            let (walk_speed, run_mul, _) = config_tick.get_character_speed();
            game_tick.tick_all(walk_speed, run_mul, 250);

            let (round_closed, settled) = comp_tick.tick_timer();
            if round_closed {
                let participants = comp_tick.get_participant_player_ids();
                if let Some(closed_payload) = comp_tick.take_round_closed_payload() {
                    bcast_tick.broadcast_to_players(&participants, "competition.round.closed", &closed_payload);
                }
                if settled {
                    if let Some(settled_payload) = comp_tick.take_settled_payload() {
                        bcast_tick.broadcast_to_players(&participants, "competition.settled", &settled_payload);
                        for (pid, uid) in comp_tick.get_participant_user_ids() {
                            if let Ok(w) = wallet_tick.get_wallet(&uid) {
                                bcast_tick.send_to_player(&pid, "wallet.updated", None, w.to_json());
                            }
                        }
                    }
                }
                let cur_state = comp_tick.state_to_json();
                bcast_tick.broadcast_to_players(&participants, "competition.state", &cur_state);
            }
        }
    });
    let bind_addr = format!("{}:{}", host, port);
    let listener = TcpListener::bind(&bind_addr).expect("Failed to bind TCP listener");
    let use_https = std::env::var("USE_HTTPS").map(|v| v == "true" || v == "1").unwrap_or(false);
    let proto = if use_https { "https" } else { "http" };
    let ws_proto = if use_https { "wss" } else { "ws" };
    println!("Listening for {}/{} connections on {}://{}", proto.to_uppercase(), ws_proto.to_uppercase(), proto, bind_addr);

    for stream_res in listener.incoming() {
        let mut stream = match stream_res {
            Ok(s) => s,
            Err(_) => continue,
        };

        let auth_c = Arc::clone(&auth);
        let game_c = Arc::clone(&game);
        let config_c = Arc::clone(&config);
        let spatial_c = Arc::clone(&spatial);
        let ai_c = Arc::clone(&ai);
        let wallet_c = Arc::clone(&wallet);
        let comp_c = Arc::clone(&competition);
        let knowledge_c = Arc::clone(&knowledge);
        let bcast_c = Arc::clone(&broadcaster);
        let inst_c = instance_id.clone();

        thread::spawn(move || {
            let req = match read_http_request(&mut stream) {
                Ok(r) => r,
                Err(_) => return,
            };

            // Check WebSocket Upgrade
            let is_upgrade = req.headers.get("upgrade").map(|s| s.to_lowercase() == "websocket").unwrap_or(false);
            if (req.path == "/api/v1/ws" || req.path == "/api/v2/ws") && is_upgrade {
                let ticket_param = req.query.get("ticket").map(|s| s.as_str()).unwrap_or("");
                let origin = req.headers.get("origin").map(|s| s.as_str());

                let ticket = match auth_c.consume_ws_ticket(ticket_param, origin) {
                    Ok(t) => t,
                    Err((status, code, msg)) => {
                        let err_resp = HttpResponse::error(status, code, msg, false);
                        let _ = err_resp.write_to(&mut stream);
                        return;
                    }
                };

                let ws_key = match req.headers.get("sec-websocket-key") {
                    Some(k) => k.clone(),
                    None => {
                        let err_resp = HttpResponse::error(400, "INVALID_REQUEST", "Missing Sec-WebSocket-Key", false);
                        let _ = err_resp.write_to(&mut stream);
                        return;
                    }
                };

                // Get or join player into session
                let player_id = match game_c.join_session(&ticket.user_id, "Player", &ticket.session_id) {
                    Ok((_, pid)) => pid,
                    Err((status, code, msg)) => {
                        let err_resp = HttpResponse::error(status, code, msg, false);
                        let _ = err_resp.write_to(&mut stream);
                        return;
                    }
                };

                let subprotocol = if ticket.protocol_version == "2.0.0" { "discovery.v2" } else { "discovery.v1" };
                let conn = match perform_ws_handshake(stream, &ws_key, subprotocol, &ticket.protocol_version) {
                    Ok(c) => c,
                    Err(_) => return,
                };

                run_ws_session(conn, ticket, player_id, game_c, config_c, spatial_c, ai_c, wallet_c, comp_c, knowledge_c, bcast_c, inst_c);
            } else {
                let mut resp = dispatch_http(&req, &auth_c, &game_c, &config_c, &spatial_c, &ai_c, &wallet_c, &comp_c, &knowledge_c, &inst_c);
                crate::http::apply_cors_headers(&mut resp, &req);
                let _ = resp.write_to(&mut stream);
            }
        });
    }
}
