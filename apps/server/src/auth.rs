// auth.rs: Authentication and Session Ticket Management

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::db::DbPool;
use crate::models::{LoginResponse, UserDto};
use crate::sha::{sha256_hex};

#[derive(Debug, Clone)]
pub struct User {
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub role: String,
}

#[derive(Debug, Clone)]
pub struct WsTicket {
    pub ticket: String,
    pub user_id: String,
    pub session_id: String,
    pub origin: String,
    pub protocol_version: String,
    pub expires_at: u64,
}

#[derive(Debug, Clone)]
pub struct TokenInfo {
    pub user: User,
    pub expires_at: u64,
    pub revoked: bool,
}

pub struct AuthService {
    db: DbPool,
    tokens: Mutex<HashMap<String, TokenInfo>>,
    tickets: Mutex<HashMap<String, WsTicket>>,
}

impl AuthService {
    pub fn new(db: DbPool) -> Self {
        Self {
            db,
            tokens: Mutex::new(HashMap::new()),
            tickets: Mutex::new(HashMap::new()),
        }
    }

    pub fn now_sec() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    }

    pub fn generate_id() -> String {
        let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let r: u64 = rand_simple();
        let hex = sha256_hex(format!("{}-{}", t, r).as_bytes());
        format!("{}-{}-{}-{}-{}", &hex[0..8], &hex[8..12], &hex[12..16], &hex[16..20], &hex[20..32])
    }
}

pub fn rand_simple() -> u64 {
    static SEED: Mutex<u64> = Mutex::new(123456789);
    let mut s = SEED.lock().unwrap();
    *s = s.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    *s
}
impl AuthService {
    pub fn login(&self, username: &str, password: &str) -> Result<LoginResponse, (u16, &'static str, &'static str)> {
        let sql = format!("SELECT user_id, display_name, role, password_hash FROM users WHERE username = '{}'", username.replace("'", "''"));
        let rows = self.db.query(&sql).map_err(|_| (500, "INTERNAL_ERROR", "Database error"))?;
        if rows.is_empty() {
            return Err((401, "UNAUTHORIZED", "Invalid username or password"));
        }
        let row = &rows[0];
        let user_id = row.get(0).unwrap().to_string();
        let display_name = row.get(1).unwrap().to_string();
        let role = row.get(2).unwrap().to_string();

        let token = format!("tok_{}_{}", user_id, Self::generate_id());
        let token_hash = sha256_hex(token.as_bytes());
        let expires_at = Self::now_sec() + 3600;

        let insert_sql = format!(
            "INSERT INTO access_tokens (token_hash, user_id, expires_at, revoked, created_at) VALUES ('{}', '{}', to_timestamp({}), false, NOW())",
            token_hash, user_id, expires_at
        );
        let _ = self.db.execute(&insert_sql);

        let user = User {
            user_id: user_id.clone(),
            username: username.to_string(),
            display_name: display_name.clone(),
            role: role.clone(),
        };

        self.tokens.lock().unwrap().insert(token.clone(), TokenInfo {
            user: user.clone(),
            expires_at,
            revoked: false,
        });

        Ok(LoginResponse {
            access_token: token,
            token_type: "Bearer".to_string(),
            expires_in_seconds: 3600,
            user: UserDto { user_id, display_name, role },
        })
    }

    pub fn validate_token(&self, token: &str) -> Result<User, (u16, &'static str, &'static str)> {
        let mut guard = self.tokens.lock().unwrap();
        if let Some(info) = guard.get(token) {
            if info.revoked {
                return Err((401, "UNAUTHORIZED", "Token has been revoked"));
            }
            if Self::now_sec() > info.expires_at {
                return Err((401, "TOKEN_EXPIRED", "Token has expired"));
            }
            return Ok(info.user.clone());
        }
        Err((401, "UNAUTHORIZED", "Authentication required"))
    }
}
impl AuthService {
    pub fn logout(&self, token: &str) -> Result<(), (u16, &'static str, &'static str)> {
        let mut guard = self.tokens.lock().unwrap();
        if let Some(info) = guard.get_mut(token) {
            info.revoked = true;
            let token_hash = sha256_hex(token.as_bytes());
            let _ = self.db.execute(&format!("UPDATE access_tokens SET revoked = true WHERE token_hash = '{}'", token_hash));
        }
        Ok(())
    }

    pub fn create_ws_ticket(
        &self,
        user_id: &str,
        session_id: &str,
        origin: &str,
        protocol_version: &str,
    ) -> Result<String, (u16, &'static str, &'static str)> {
        if protocol_version != "1.0.0" && protocol_version != "1.1.0" && protocol_version != "2.0.0" {
            return Err((409, "VERSION_UNSUPPORTED", "Unsupported protocol version"));
        }
        let ticket_str = format!("tkt_{}", Self::generate_id());
        let expires_at = Self::now_sec() + 30;

        let ticket = WsTicket {
            ticket: ticket_str.clone(),
            user_id: user_id.to_string(),
            session_id: session_id.to_string(),
            origin: origin.to_string(),
            protocol_version: protocol_version.to_string(),
            expires_at,
        };

        self.tickets.lock().unwrap().insert(ticket_str.clone(), ticket);
        Ok(ticket_str)
    }

    pub fn consume_ws_ticket(&self, ticket_str: &str, client_origin: Option<&str>) -> Result<WsTicket, (u16, &'static str, &'static str)> {
        let mut guard = self.tickets.lock().unwrap();
        let ticket = guard.remove(ticket_str).ok_or((401, "UNAUTHORIZED", "Invalid or already used ticket"))?;
        if Self::now_sec() > ticket.expires_at {
            return Err((401, "TOKEN_EXPIRED", "Ticket has expired"));
        }
        if let Some(origin) = client_origin {
            if !origin.is_empty() && !ticket.origin.is_empty() && origin != ticket.origin {
                return Err((403, "FORBIDDEN", "Origin mismatch"));
            }
        }
        Ok(ticket)
    }
}
