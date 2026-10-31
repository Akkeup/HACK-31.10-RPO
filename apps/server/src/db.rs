// db.rs: PostgreSQL 18 Frontend/Backend Protocol v3.0 Native Client

use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use crate::sha::md5_hex;

#[derive(Debug)]
pub struct PgRow {
    pub columns: Vec<String>,
}

impl PgRow {
    pub fn get(&self, idx: usize) -> Option<&str> {
        self.columns.get(idx).map(|s| s.as_str())
    }
}

pub struct PgClient {
    stream: TcpStream,
}

impl PgClient {
    pub fn connect(host: &str, port: u16, user: &str, password: &str, database: &str) -> Result<Self, String> {
        let addr = format!("{}:{}", host, port);
        let mut stream = TcpStream::connect(&addr).map_err(|e| format!("TCP connect error to {}: {}", addr, e))?;

        // 1. Send StartupMessage
        let mut body = Vec::new();
        body.extend_from_slice(&196608u32.to_be_bytes()); // Protocol 3.0
        body.extend_from_slice(b"user\0");
        body.extend_from_slice(user.as_bytes());
        body.push(0);
        body.extend_from_slice(b"database\0");
        body.extend_from_slice(database.as_bytes());
        body.push(0);
        body.push(0); // terminating zero

        let len = (body.len() as u32) + 4;
        stream.write_all(&len.to_be_bytes()).map_err(|e| e.to_string())?;
        stream.write_all(&body).map_err(|e| e.to_string())?;

        // 2. Auth loop
        loop {
            let mut msg_type = [0u8; 1];
            stream.read_exact(&mut msg_type).map_err(|e| e.to_string())?;
            let mut len_buf = [0u8; 4];
            stream.read_exact(&mut len_buf).map_err(|e| e.to_string())?;
            let msg_len = u32::from_be_bytes(len_buf) as usize - 4;
            let mut payload = vec![0u8; msg_len];
            stream.read_exact(&mut payload).map_err(|e| e.to_string())?;

            match msg_type[0] {
                b'R' => { // Authentication request
                    let auth_type = u32::from_be_bytes(payload[0..4].try_into().unwrap());
                    if auth_type == 0 {
                        // AuthOk
                    } else if auth_type == 3 {
                        // Cleartext
                        let mut resp = Vec::from(password.as_bytes());
                        resp.push(0);
                        let p_len = (resp.len() as u32) + 4;
                        stream.write_all(b"p").map_err(|e| e.to_string())?;
                        stream.write_all(&p_len.to_be_bytes()).map_err(|e| e.to_string())?;
                        stream.write_all(&resp).map_err(|e| e.to_string())?;
                    } else if auth_type == 5 {
                        // MD5
                        let salt = &payload[4..8];
                        let pass_hash = md5_hex(format!("{}{}", password, user).as_bytes());
                        let mut combined = Vec::from(pass_hash.as_bytes());
                        combined.extend_from_slice(salt);
                        let final_hash = format!("md5{}", md5_hex(&combined));
                        let mut resp = Vec::from(final_hash.as_bytes());
                        resp.push(0);
                        let p_len = (resp.len() as u32) + 4;
                        stream.write_all(b"p").map_err(|e| e.to_string())?;
                        stream.write_all(&p_len.to_be_bytes()).map_err(|e| e.to_string())?;
                        stream.write_all(&resp).map_err(|e| e.to_string())?;
                    } else {
                        return Err(format!("Unsupported auth type: {}", auth_type));
                    }
                }
                b'Z' => { // ReadyForQuery
                    break;
                }
                b'E' => { // ErrorResponse
                    let err = String::from_utf8_lossy(&payload);
                    return Err(format!("Postgres error: {}", err));
                }
                _ => {} // ParameterStatus, BackendKeyData, etc.
            }
        }

        Ok(Self { stream })
    }
}
impl PgClient {
    pub fn query(&mut self, sql: &str) -> Result<Vec<PgRow>, String> {
        let mut msg = Vec::from(sql.as_bytes());
        msg.push(0);
        let len = (msg.len() as u32) + 4;
        self.stream.write_all(b"Q").map_err(|e| e.to_string())?;
        self.stream.write_all(&len.to_be_bytes()).map_err(|e| e.to_string())?;
        self.stream.write_all(&msg).map_err(|e| e.to_string())?;

        let mut rows = Vec::new();
        loop {
            let mut msg_type = [0u8; 1];
            self.stream.read_exact(&mut msg_type).map_err(|e| e.to_string())?;
            let mut len_buf = [0u8; 4];
            self.stream.read_exact(&mut len_buf).map_err(|e| e.to_string())?;
            let msg_len = u32::from_be_bytes(len_buf) as usize - 4;
            let mut payload = vec![0u8; msg_len];
            self.stream.read_exact(&mut payload).map_err(|e| e.to_string())?;

            match msg_type[0] {
                b'D' => { // DataRow
                    let num_cols = u16::from_be_bytes(payload[0..2].try_into().unwrap()) as usize;
                    let mut cols = Vec::with_capacity(num_cols);
                    let mut offset = 2;
                    for _ in 0..num_cols {
                        let col_len = i32::from_be_bytes(payload[offset..offset + 4].try_into().unwrap());
                        offset += 4;
                        if col_len < 0 {
                            cols.push("".to_string());
                        } else {
                            let len = col_len as usize;
                            let val_str = String::from_utf8_lossy(&payload[offset..offset + len]).to_string();
                            cols.push(val_str);
                            offset += len;
                        }
                    }
                    rows.push(PgRow { columns: cols });
                }
                b'C' => {} // CommandComplete
                b'Z' => break, // ReadyForQuery
                b'E' => {
                    let err = String::from_utf8_lossy(&payload);
                    return Err(format!("Query error: {}", err));
                }
                _ => {}
            }
        }
        Ok(rows)
    }

    pub fn execute(&mut self, sql: &str) -> Result<u64, String> {
        self.query(sql)?;
        Ok(1)
    }
}

#[derive(Clone)]
pub struct DbPool {
    host: String,
    port: u16,
    user: String,
    pass: String,
    db: String,
    conn: Arc<Mutex<Option<PgClient>>>,
}
impl DbPool {
    pub fn new(host: &str, port: u16, user: &str, pass: &str, db: &str) -> Self {
        let pool = Self {
            host: host.to_string(),
            port,
            user: user.to_string(),
            pass: pass.to_string(),
            db: db.to_string(),
            conn: Arc::new(Mutex::new(None)),
        };
        // Initial attempt
        let _ = pool.get_client();
        pool
    }

    pub fn get_client(&self) -> Result<PgClient, String> {
        PgClient::connect(&self.host, self.port, &self.user, &self.pass, &self.db)
    }

    pub fn query(&self, sql: &str) -> Result<Vec<PgRow>, String> {
        let mut guard = self.conn.lock().unwrap();
        if guard.is_none() {
            *guard = Some(self.get_client()?);
        }
        let client = guard.as_mut().unwrap();
        match client.query(sql) {
            Ok(res) => Ok(res),
            Err(_) => {
                // Reconnect once on error
                *guard = Some(self.get_client()?);
                guard.as_mut().unwrap().query(sql)
            }
        }
    }

    pub fn execute(&self, sql: &str) -> Result<u64, String> {
        let mut guard = self.conn.lock().unwrap();
        if guard.is_none() {
            *guard = Some(self.get_client()?);
        }
        let client = guard.as_mut().unwrap();
        match client.execute(sql) {
            Ok(res) => Ok(res),
            Err(_) => {
                *guard = Some(self.get_client()?);
                guard.as_mut().unwrap().execute(sql)
            }
        }
    }
}
