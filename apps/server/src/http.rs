// http.rs: HTTP 1.1 Router and Handlers for Discovery Protocol OpenAPI

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Arc;
use crate::ai::NpcAiService;
use crate::auth::AuthService;
use crate::competition::CompetitionService;
use crate::config::ConfigService;
use crate::game::GameManager;
use crate::json::{parse_json, JsonValue};
use crate::models::{ErrorResponse, TicketResponse};
use crate::spatial::SpatialService;
use crate::wallet::WalletService;
use crate::ws::{perform_ws_handshake, run_ws_session};

pub struct HttpRequest {
    pub method: String,
    pub path: String,
    pub query: HashMap<String, String>,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

pub struct HttpResponse {
    pub status: u16,
    pub status_text: &'static str,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl HttpResponse {
    pub fn new(status: u16, status_text: &'static str) -> Self {
        Self {
            status,
            status_text,
            headers: vec![("Cache-Control".to_string(), "no-store".to_string())],
            body: Vec::new(),
        }
    }

    pub fn json(status: u16, status_text: &'static str, val: &JsonValue) -> Self {
        let mut resp = Self::new(status, status_text);
        resp.headers.push(("Content-Type".to_string(), "application/json; charset=utf-8".to_string()));
        resp.body = val.to_string().into_bytes();
        resp
    }

    pub fn error(status: u16, code: &str, message: &str, retryable: bool) -> Self {
        let err = ErrorResponse::new(code, message, retryable, None);
        Self::json(status, "Error", &err.to_json())
    }

    pub fn write_to(&self, stream: &mut TcpStream) -> std::io::Result<()> {
        let mut hdr = format!("HTTP/1.1 {} {}\r\nContent-Length: {}\r\n", self.status, self.status_text, self.body.len());
        for (k, v) in &self.headers {
            hdr.push_str(&format!("{}: {}\r\n", k, v));
        }
        hdr.push_str("\r\n");
        stream.write_all(hdr.as_bytes())?;
        if !self.body.is_empty() {
            stream.write_all(&self.body)?;
        }
        stream.flush()
    }
}
pub fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest, String> {
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("EOF".to_string());
    }

    let raw = String::from_utf8_lossy(&buf[..n]);
    let header_end = raw.find("\r\n\r\n").ok_or("Incomplete HTTP headers")?;
    let header_part = &raw[..header_end];
    let mut lines = header_part.lines();

    let req_line = lines.next().ok_or("Missing request line")?;
    let mut parts = req_line.split_whitespace();
    let method = parts.next().ok_or("Missing method")?.to_string();
    let full_path = parts.next().ok_or("Missing path")?.to_string();

    let (path, query_str) = match full_path.find('?') {
        Some(idx) => (&full_path[..idx], &full_path[idx + 1..]),
        None => (full_path.as_str(), ""),
    };

    let mut query = HashMap::new();
    if !query_str.is_empty() {
        for pair in query_str.split('&') {
            let mut kv = pair.split('=');
            if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                query.insert(k.to_string(), v.to_string());
            }
        }
    }

    let mut headers = HashMap::new();
    for line in lines {
        if let Some(idx) = line.find(':') {
            let k = line[..idx].trim().to_lowercase();
            let v = line[idx + 1..].trim().to_string();
            headers.insert(k, v);
        }
    }

    let body_start = header_end + 4;
    let mut body = buf[body_start..n].to_vec();
    if let Some(len_str) = headers.get("content-length") {
        if let Ok(content_len) = len_str.parse::<usize>() {
            while body.len() < content_len {
                let mut more = [0u8; 4096];
                let read_bytes = stream.read(&mut more).map_err(|e| e.to_string())?;
                if read_bytes == 0 { break; }
                body.extend_from_slice(&more[..read_bytes]);
            }
        }
    }

    Ok(HttpRequest {
        method,
        path: path.to_string(),
        query,
        headers,
        body,
    })
}
pub fn dispatch_http(
    req: &HttpRequest,
    auth: &Arc<AuthService>,
    game: &Arc<GameManager>,
    config: &Arc<ConfigService>,
    spatial: &Arc<SpatialService>,
    ai: &Arc<NpcAiService>,
    wallet: &Arc<WalletService>,
    competition: &Arc<CompetitionService>,
    instance_id: &str,
) -> HttpResponse {
    let method = req.method.as_str();
    let path = req.path.as_str();

    // Health
    if path == "/health/live" || path == "/health/ready" {
        let val = JsonValue::Object(vec![
            ("status".to_string(), JsonValue::String("pass".to_string())),
            ("version".to_string(), JsonValue::String("1.0.0".to_string())),
        ]);
        return HttpResponse::json(200, "OK", &val);
    }

    // Bootstrap
    if path == "/api/v1/bootstrap" && method == "GET" {
        let val = JsonValue::Object(vec![
            ("protocolVersions".to_string(), JsonValue::Array(vec![JsonValue::String("1.0.0".to_string()), JsonValue::String("1.1.0".to_string())])),
            ("serverInstanceId".to_string(), JsonValue::String(instance_id.to_string())),
            ("worldIds".to_string(), JsonValue::Array(vec![JsonValue::String("discovery-campus".to_string())])),
            ("offline".to_string(), JsonValue::Bool(true)),
        ]);
        return HttpResponse::json(200, "OK", &val);
    }

    // Auth Login
    if path == "/api/v1/auth/login" && method == "POST" {
        let body_str = String::from_utf8_lossy(&req.body);
        let json = match parse_json(&body_str) {
            Ok(v) => v,
            Err(_) => return HttpResponse::error(400, "INVALID_REQUEST", "Invalid JSON", false),
        };
        let user = json.get_str("username").unwrap_or("");
        let pass = json.get_str("password").unwrap_or("");
        match auth.login(user, pass) {
            Ok(resp) => return HttpResponse::json(200, "OK", &resp.to_json()),
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        }
    }

    // Auth Logout
    if path == "/api/v1/auth/logout" && method == "POST" {
        let token = extract_bearer(req);
        let _ = auth.logout(&token);
        return HttpResponse::new(204, "No Content");
    }

    // Auth Me
    if path == "/api/v1/auth/me" && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let val = JsonValue::Object(vec![
            ("userId".to_string(), JsonValue::String(user.user_id)),
            ("displayName".to_string(), JsonValue::String(user.display_name)),
            ("role".to_string(), JsonValue::String(user.role)),
        ]);
        return HttpResponse::json(200, "OK", &val);
    }
    // Sessions (List / Create)
    if path == "/api/v1/sessions" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };

        if method == "GET" {
            let list = game.list_sessions();
            let arr = JsonValue::Array(list.iter().map(|s| s.to_json()).collect());
            return HttpResponse::json(200, "OK", &arr);
        } else if method == "POST" {
            let body_str = String::from_utf8_lossy(&req.body);
            let json = parse_json(&body_str).unwrap_or(JsonValue::Null);
            let world_id = json.get_str("worldId").unwrap_or("discovery-campus");
            match game.create_session(&user.user_id, &user.display_name, world_id) {
                Ok(session) => return HttpResponse::json(201, "Created", &session.to_json()),
                Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
            }
        }
    }

    // Session Detail / Membership / Ticket
    if path.starts_with("/api/v1/sessions/") {
        let subpath = &path["/api/v1/sessions/".len()..];
        let mut segments = subpath.split('/');
        let session_id = segments.next().unwrap_or("");
        let action = segments.next();

        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };

        if action.is_none() && method == "GET" {
            if let Some(session) = game.get_session_dto(session_id) {
                return HttpResponse::json(200, "OK", &session.to_json());
            }
            return HttpResponse::error(404, "NOT_FOUND", "Session not found", false);
        }

        if action == Some("members") && segments.next() == Some("me") {
            if method == "PUT" {
                match game.join_session(&user.user_id, &user.display_name, session_id) {
                    Ok((sess, _)) => return HttpResponse::json(200, "OK", &sess.to_json()),
                    Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
                }
            } else if method == "DELETE" {
                game.leave_session(&user.user_id, session_id);
                return HttpResponse::new(204, "No Content");
            }
        }

        if action == Some("ws-ticket") && method == "POST" {
            let origin = req.headers.get("origin").map(|s| s.as_str()).unwrap_or("");
            let body_str = String::from_utf8_lossy(&req.body);
            let json = parse_json(&body_str).unwrap_or(JsonValue::Null);
            let proto_ver = json.get_str("protocolVersion").unwrap_or("1.0.0");

            match auth.create_ws_ticket(&user.user_id, session_id, origin, proto_ver) {
                Ok(ticket_str) => {
                    let resp = TicketResponse {
                        ticket: ticket_str,
                        expires_in_seconds: 30,
                        ws_path: "/api/v1/ws".to_string(),
                        subprotocol: "discovery.v1".to_string(),
                    };
                    return HttpResponse::json(200, "OK", &resp.to_json());
                }
                Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
            }
        }
    }
    // Interactions
    if path.contains("/interactions/") && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let parts: Vec<&str> = path.split('/').collect();
        let session_id = parts[4];
        let req_id = parts[6];
        if let Some(interaction) = ai.get_interaction(&user.user_id, session_id, req_id) {
            return HttpResponse::json(200, "OK", &interaction.to_json());
        }
        return HttpResponse::error(404, "NOT_FOUND", "Interaction not found", false);
    }

    // World Manifest
    if path.starts_with("/api/v1/worlds/") && path.ends_with("/manifest") && method == "GET" {
        let manifest = spatial.get_manifest();
        return HttpResponse::json(200, "OK", &manifest.to_json());
    }

    // World Public Config
    if path.starts_with("/api/v1/worlds/") && path.ends_with("/config") && !path.contains("/admin/") && method == "GET" {
        let (cfg, etag) = config.get_public_config();
        let mut resp = HttpResponse::json(200, "OK", &cfg);
        resp.headers.push(("ETag".to_string(), format!("\"{}\"", etag)));
        return resp;
    }

    // World Progress
    if path.starts_with("/api/v1/worlds/") && path.ends_with("/progress/me") && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let val = JsonValue::Object(vec![
            ("playerId".to_string(), JsonValue::String(user.user_id)),
            ("revision".to_string(), JsonValue::Number(1.0)),
            ("completedKnowledgeIds".to_string(), JsonValue::Array(vec![JsonValue::String("campus-history".to_string())])),
            ("updatedAt".to_string(), JsonValue::String(crate::ws::rfc3339_now())),
        ]);
        return HttpResponse::json(200, "OK", &val);
    }

    // Admin Config
    if path.starts_with("/api/v1/admin/worlds/") && path.ends_with("/config") {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };

        if method == "GET" {
            match config.get_admin_config(&user.role) {
                Ok((cfg, etag)) => {
                    let mut resp = HttpResponse::json(200, "OK", &cfg);
                    resp.headers.push(("ETag".to_string(), format!("\"{}\"", etag)));
                    return resp;
                }
                Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
            }
        } else if method == "PUT" {
            let if_match = req.headers.get("if-match").map(|s| s.as_str());
            let body_str = String::from_utf8_lossy(&req.body);
            let json = match parse_json(&body_str) {
                Ok(v) => v,
                Err(_) => return HttpResponse::error(400, "INVALID_REQUEST", "Invalid JSON", false),
            };
            let has_active = game.has_active_sessions();
            match config.update_admin_config(&user.role, if_match, json, has_active) {
                Ok((new_cfg, new_etag)) => {
                    let mut resp = HttpResponse::json(200, "OK", &new_cfg);
                    resp.headers.push(("ETag".to_string(), format!("\"{}\"", new_etag)));
                    return resp;
                }
                Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
            }
        }
    }

    // Wallet (Balance & Ledger)
    if path == "/api/v1/wallet/me" && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        match wallet.get_wallet(&user.user_id) {
            Ok(w) => return HttpResponse::json(200, "OK", &w.to_json()),
            Err(_) => return HttpResponse::error(500, "DB_ERROR", "Failed to get wallet", false),
        }
    }

    if path == "/api/v1/wallet/me/ledger" && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        match wallet.get_ledger(&user.user_id, 50) {
            Ok(entries) => {
                let arr: Vec<JsonValue> = entries.iter().map(|e| e.to_json()).collect();
                let val = JsonValue::Object(vec![
                    ("entries".to_string(), JsonValue::Array(arr)),
                    ("nextCursor".to_string(), JsonValue::Null),
                ]);
                return HttpResponse::json(200, "OK", &val);
            }
            Err(_) => return HttpResponse::error(500, "DB_ERROR", "Failed to get ledger", false),
        }
    }

    // Activity
    if path == "/api/v1/activity/me" && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let act = competition.get_activity(&user.user_id);
        return HttpResponse::json(200, "OK", &act);
    }

    // Competition Table, Lobby & Match Recovery
    if path.contains("/competition/tables/") && method == "GET" {
        let token = extract_bearer(req);
        let _ = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let tbl = competition.get_table_json();
        return HttpResponse::json(200, "OK", &tbl);
    }

    if path.starts_with("/api/v1/competition/lobbies/") && method == "GET" {
        let token = extract_bearer(req);
        let _ = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let st = competition.get_state_json();
        return HttpResponse::json(200, "OK", &st);
    }

    if path.starts_with("/api/v1/competition/matches/") && path.ends_with("/me") && method == "GET" {
        let token = extract_bearer(req);
        let user = match auth.validate_token(&token) {
            Ok(u) => u,
            Err((status, code, msg)) => return HttpResponse::error(status, code, msg, false),
        };
        let player_id = game.get_player_id_for_user(&user.user_id).unwrap_or(user.user_id.clone());
        if let Some(rec) = competition.get_recovery(&user.user_id, &player_id) {
            return HttpResponse::json(200, "OK", &rec);
        }
        return HttpResponse::error(404, "NOT_FOUND", "Match recovery not found", false);
    }

    // Education Modules
    if path.ends_with("/education/modules") && method == "GET" {
        let content = std::fs::read_to_string("assets/education/modules.json")
            .or_else(|_| std::fs::read_to_string("discovery-protocol-1.1.0/fixtures/v1.1.0/http/modules.json"))
            .unwrap_or_else(|_| "{\"modules\":[]}".to_string());
        let val = parse_json(&content).unwrap_or(JsonValue::Null);
        return HttpResponse::json(200, "OK", &val);
    }

    // World Chunks
    if path.contains("/chunks/") && method == "GET" {
        let parts: Vec<&str> = path.split('/').collect();
        let chunk_id = parts[5];
        let sha256 = parts[6];
        if let Some(bytes) = spatial.get_chunk_file(chunk_id, sha256) {
            let mut resp = HttpResponse::new(200, "OK");
            resp.headers.push(("Content-Type".to_string(), "application/json; charset=utf-8".to_string()));
            resp.body = bytes.to_vec();
            return resp;
        }
        return HttpResponse::error(404, "NOT_FOUND", "Chunk not found", false);
    }

    // World Assets
    if path.contains("/assets/") && method == "GET" {
        let parts: Vec<&str> = path.split('/').collect();
        let sha256 = parts[5];
        if let Some((bytes, media_type)) = spatial.get_asset_file(sha256) {
            let mut resp = HttpResponse::new(200, "OK");
            resp.headers.push(("Content-Type".to_string(), media_type.to_string()));
            resp.body = bytes.to_vec();
            return resp;
        }
        return HttpResponse::error(404, "NOT_FOUND", "Asset not found", false);
    }

    HttpResponse::error(404, "NOT_FOUND", "Endpoint not found", false)
}

fn extract_bearer(req: &HttpRequest) -> String {
    if let Some(auth_hdr) = req.headers.get("authorization") {
        if auth_hdr.to_lowercase().starts_with("bearer ") {
            return auth_hdr["bearer ".len()..].trim().to_string();
        }
    }
    "".to_string()
}
