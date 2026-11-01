// auth.rs: Authentication and Session Ticket Management

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::db::DbPool;
use crate::models::{LoginResponse, UserDto};
use crate::sha::{sha256_bytes, sha256_hex};

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
        let mut bytes = [0u8; 32];
        // macOS/Linux production builds use the operating-system CSPRNG.  The
        // deterministic fallback only keeps isolated test environments alive.
        if let Ok(mut source) = std::fs::File::open("/dev/urandom") {
            use std::io::Read;
            let _ = source.read_exact(&mut bytes);
        }
        if bytes.iter().all(|b| *b == 0) {
            let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
            bytes.copy_from_slice(&sha256_bytes(format!("{}-{}", t, rand_simple()).as_bytes()));
        }
        let hex: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
        format!("{}-{}-{}-{}-{}", &hex[0..8], &hex[8..12], &hex[12..16], &hex[16..20], &hex[20..32])
    }
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() { return false; }
    let mut diff = 0u8;
    for (a, b) in left.iter().zip(right.iter()) { diff |= a ^ b; }
    diff == 0
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn hex_decode(value: &str) -> Option<Vec<u8>> {
    if value.len() % 2 != 0 { return None; }
    (0..value.len()).step_by(2)
        .map(|i| u8::from_str_radix(&value[i..i + 2], 16).ok())
        .collect()
}

fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; 32] {
    let mut block = [0u8; 64];
    if key.len() > block.len() { block[..32].copy_from_slice(&sha256_bytes(key)); }
    else { block[..key.len()].copy_from_slice(key); }
    let mut inner = Vec::with_capacity(64 + message.len());
    let mut outer = Vec::with_capacity(64 + 32);
    for byte in block { inner.push(byte ^ 0x36); outer.push(byte ^ 0x5c); }
    inner.extend_from_slice(message);
    outer.extend_from_slice(&sha256_bytes(&inner));
    sha256_bytes(&outer)
}

fn pbkdf2_sha256(password: &str, salt: &[u8], iterations: u32) -> [u8; 32] {
    let mut first = Vec::with_capacity(salt.len() + 4);
    first.extend_from_slice(salt);
    first.extend_from_slice(&1u32.to_be_bytes());
    let mut state = hmac_sha256(password.as_bytes(), &first);
    let mut output = state;
    for _ in 1..iterations {
        state = hmac_sha256(password.as_bytes(), &state);
        for i in 0..output.len() { output[i] ^= state[i]; }
    }
    output
}

fn password_hash(password: &str, salt: &[u8]) -> String {
    const ITERATIONS: u32 = 210_000;
    format!("pbkdf2-sha256${}${}${}", ITERATIONS, hex_encode(salt), hex_encode(&pbkdf2_sha256(password, salt, ITERATIONS)))
}

fn verify_password(stored: &str, password: &str) -> bool {
    let parts: Vec<&str> = stored.split('$').collect();
    if parts.len() != 4 || parts[0] != "pbkdf2-sha256" { return false; }
    let iterations = match parts[1].parse::<u32>() { Ok(value) if (100_000..=1_000_000).contains(&value) => value, _ => return false };
    let salt = match hex_decode(parts[2]) { Some(value) if value.len() >= 16 => value, _ => return false };
    let expected = match hex_decode(parts[3]) { Some(value) if value.len() == 32 => value, _ => return false };
    constant_time_eq(&pbkdf2_sha256(password, &salt, iterations), &expected)
}

pub fn rand_simple() -> u64 {
    static SEED: Mutex<u64> = Mutex::new(123456789);
    let mut s = SEED.lock().unwrap();
    *s = s.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    *s
}
impl AuthService {
    pub fn login(&self, username: &str, password: &str) -> Result<LoginResponse, (u16, &'static str, &'static str)> {
        let canonical_username = username.trim().to_lowercase();
        if canonical_username.len() < 3 || canonical_username.len() > 80
            || !canonical_username.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_' || b == b'-')
            || password.len() < 8 || password.len() > 128 {
            return Err((401, "UNAUTHORIZED", "Invalid username or password"));
        }
        // Username is constrained above; no arbitrary client value reaches the
        // SQL literal. The native PostgreSQL client has no prepared-statement
        // support yet, so this boundary validation is mandatory.
        let sql = format!("SELECT user_id, display_name, role, password_hash FROM users WHERE username = '{}'", canonical_username);
        let rows = self.db.query(&sql).map_err(|_| (500, "INTERNAL_ERROR", "Database error"))?;
        if rows.is_empty() {
            return Err((401, "UNAUTHORIZED", "Invalid username or password"));
        }
        let row = &rows[0];
        let user_id = row.get(0).unwrap().to_string();
        let display_name = row.get(1).unwrap().to_string();
        let role = row.get(2).unwrap().to_string();
        let stored_password_hash = row.get(3).unwrap_or("");

        let password_is_valid = verify_password(stored_password_hash, password);
        // The historical seed used a placeholder which looked like Argon2 but
        // was not a usable verifier. Permit its documented development secret
        // exactly once, immediately replace it with a PBKDF2-HMAC-SHA256
        // record, and never accept arbitrary passwords for that account.
        let legacy_seed = stored_password_hash == "$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$q8W7gN7Lqg";
        if !password_is_valid && !(legacy_seed && password == std::env::var("DISCOVERY_SEED_PASSWORD").unwrap_or_else(|_| "password".to_string())) {
            return Err((401, "UNAUTHORIZED", "Invalid username or password"));
        }
        if legacy_seed {
            let mut salt = [0u8; 16];
            let generated = Self::generate_id();
            salt.copy_from_slice(&sha256_bytes(generated.as_bytes())[..16]);
            let upgraded = password_hash(password, &salt);
            let _ = self.db.execute(&format!(
                "UPDATE users SET password_hash = '{}' WHERE user_id = '{}' AND password_hash = '{}'",
                upgraded, user_id, stored_password_hash
            ));
        }

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
            username: canonical_username,
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
        drop(guard);
        if token.len() > 256 || token.is_empty() {
            return Err((401, "UNAUTHORIZED", "Authentication required"));
        }
        let token_hash = sha256_hex(token.as_bytes());
        let sql = format!(
            "SELECT u.user_id, u.username, u.display_name, u.role, EXTRACT(EPOCH FROM t.expires_at)::BIGINT, t.revoked \
             FROM access_tokens t JOIN users u ON u.user_id = t.user_id WHERE t.token_hash = '{}'",
            token_hash,
        );
        let rows = self.db.query(&sql).map_err(|_| (401, "UNAUTHORIZED", "Authentication required"))?;
        let row = rows.first().ok_or((401, "UNAUTHORIZED", "Authentication required"))?;
        let expires_at = row.get(4).and_then(|value| value.parse::<u64>().ok()).unwrap_or(0);
        let revoked = row.get(5).map(|value| value == "t" || value == "true").unwrap_or(true);
        if revoked || Self::now_sec() > expires_at {
            return Err((401, "UNAUTHORIZED", "Authentication required"));
        }
        let user = User {
            user_id: row.get(0).unwrap_or("").to_string(),
            username: row.get(1).unwrap_or("").to_string(),
            display_name: row.get(2).unwrap_or("").to_string(),
            role: row.get(3).unwrap_or("player").to_string(),
        };
        self.tokens.lock().unwrap().insert(token.to_string(), TokenInfo {
            user: user.clone(), expires_at, revoked: false,
        });
        Ok(user)
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
