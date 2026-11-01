// competition.rs: Authoritative Competition Table & Aura Wager Match Engine
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::db::DbPool;
use crate::json::{parse_json, JsonValue};
use crate::models::{PositionDto, SessionDto};
use crate::wallet::{WalletDto, WalletService};

#[derive(Debug, Clone)]
pub struct QuestionOption {
    pub option_id: String,
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct Question {
    pub question_id: String,
    pub prompt: String,
    pub kind: String,
    pub image: Option<JsonValue>,
    pub options: Vec<QuestionOption>,
    pub correct_option_id: String,
    pub accepted_values: Vec<String>,
    pub explanation: String,
}

#[derive(Debug, Clone)]
pub struct ContentPack {
    pub module_id: String,
    pub subject: String,
    pub content_version: String,
    pub questions: Vec<Question>,
}

#[derive(Debug, Clone)]
pub struct Seat {
    pub seat_id: String,
    pub position: (f64, f64, f64),
    pub yaw_rad: f64,
    pub exit_position: (f64, f64, f64),
}

#[derive(Debug, Clone)]
pub struct Participant {
    pub player_id: String,
    pub user_id: String,
    pub display_name: String,
    pub seat_id: String,
    pub ready: bool,
    pub connected: bool,
    pub left: bool,
    pub score: i64,
    pub current_option_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ActiveRound {
    pub ordinal: i64,
    pub question_id: String,
    pub prompt: String,
    pub kind: String,
    pub image: Option<JsonValue>,
    pub options: Vec<QuestionOption>,
    pub correct_option_id: String,
    pub accepted_values: Vec<String>,
    pub explanation: String,
    pub deadline_at: String,
    pub deadline_ms: u64,
    pub answered_player_ids: HashSet<String>,
}

#[derive(Debug, Clone)]
pub struct SettlementPayout {
    pub player_id: String,
    pub amount_aura: i64,
}

#[derive(Debug, Clone)]
pub struct Settlement {
    pub settlement_id: String,
    pub match_id: String,
    pub outcome: String, // "winner", "draw", "cancelled"
    pub winner_player_id: Option<String>,
    pub pot_aura: i64,
    pub payouts: Vec<SettlementPayout>,
    pub reason: Option<String>,
}

impl Settlement {
    pub fn to_json(&self) -> JsonValue {
        let payouts: Vec<JsonValue> = self.payouts.iter().map(|p| {
            JsonValue::Object(vec![
                ("playerId".to_string(), JsonValue::String(p.player_id.clone())),
                ("amountAura".to_string(), JsonValue::Number(p.amount_aura as f64)),
            ])
        }).collect();
        JsonValue::Object(vec![
            ("settlementId".to_string(), JsonValue::String(self.settlement_id.clone())),
            ("matchId".to_string(), JsonValue::String(self.match_id.clone())),
            ("outcome".to_string(), JsonValue::String(self.outcome.clone())),
            ("winnerPlayerId".to_string(), match &self.winner_player_id { Some(w) => JsonValue::String(w.clone()), None => JsonValue::Null }),
            ("potAura".to_string(), JsonValue::Number(self.pot_aura as f64)),
            ("payouts".to_string(), JsonValue::Array(payouts)),
            ("reason".to_string(), match &self.reason { Some(r) => JsonValue::String(r.clone()), None => JsonValue::Null }),
        ])
    }
}

pub struct CompetitionTable {
    pub table_id: String,
    pub position: (f64, f64, f64),
    pub interaction_radius_m: f64,
    pub seats: Vec<Seat>,
    pub status: String, // "available", "lobby", "running", "finished", "cancelled"
    pub lobby_id: Option<String>,
    pub match_id: Option<String>,
    pub owner_player_id: Option<String>,
    pub revision: u64,
    pub subject: String,
    pub module_id: String,
    pub content_version: String,
    pub stake_aura: i64,
    pub pot_aura: i64,
    pub question_count: i64,
    pub round_seconds: i64,
    pub participants: Vec<Participant>,
    pub current_round: Option<ActiveRound>,
    pub settlement: Option<Settlement>,
    pub round_closed_info: Option<(i64, String, String, String, Vec<(String, i64, bool)>)>, // ordinal, q_id, opt_id, exp, scores
}

impl CompetitionTable {
    pub fn now_ms() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
    }

    pub fn rfc3339_at(ms: u64) -> String {
        let t = ms / 1000;
        format!("{}-{:02}-{:02}T{:02}:{:02}:{:02}Z", 2026, 10, 31, (t / 3600) % 24, (t / 60) % 60, t % 60)
    }
}

impl CompetitionTable {
    pub fn table_to_json(&self) -> JsonValue {
        let occ: Vec<JsonValue> = self.participants.iter().map(|p| {
            JsonValue::Object(vec![
                ("seatId".to_string(), JsonValue::String(p.seat_id.clone())),
                ("playerId".to_string(), JsonValue::String(p.player_id.clone())),
            ])
        }).collect();

        JsonValue::Object(vec![
            ("tableId".to_string(), JsonValue::String(self.table_id.clone())),
            ("status".to_string(), JsonValue::String(self.status.clone())),
            ("lobbyId".to_string(), match &self.lobby_id { Some(l) => JsonValue::String(l.clone()), None => JsonValue::Null }),
            ("matchId".to_string(), match &self.match_id { Some(m) => JsonValue::String(m.clone()), None => JsonValue::Null }),
            ("subject".to_string(), if self.status == "available" { JsonValue::Null } else { JsonValue::String(self.subject.clone()) }),
            ("stakeAura".to_string(), if self.status == "available" { JsonValue::Null } else { JsonValue::Number(self.stake_aura as f64) }),
            ("occupiedSeats".to_string(), JsonValue::Array(occ)),
        ])
    }

    pub fn state_to_json(&self) -> JsonValue {
        let parts: Vec<JsonValue> = if self.participants.is_empty() {
            vec![JsonValue::Object(vec![
                ("playerId".to_string(), JsonValue::String("00000000-0000-4000-8000-000000000001".to_string())),
                ("displayName".to_string(), JsonValue::String("Host".to_string())),
                ("seatId".to_string(), JsonValue::String("competition-seat-1".to_string())),
                ("ready".to_string(), JsonValue::Bool(false)),
                ("connected".to_string(), JsonValue::Bool(true)),
                ("left".to_string(), JsonValue::Bool(false)),
                ("score".to_string(), JsonValue::Number(0.0)),
            ])]
        } else {
            self.participants.iter().map(|p| {
                JsonValue::Object(vec![
                    ("playerId".to_string(), JsonValue::String(p.player_id.clone())),
                    ("displayName".to_string(), JsonValue::String(p.display_name.clone())),
                    ("seatId".to_string(), JsonValue::String(p.seat_id.clone())),
                    ("ready".to_string(), JsonValue::Bool(p.ready)),
                    ("connected".to_string(), JsonValue::Bool(p.connected)),
                    ("left".to_string(), JsonValue::Bool(p.left)),
                    ("score".to_string(), JsonValue::Number(p.score as f64)),
                ])
            }).collect()
        };

        let round_json = match &self.current_round {
            Some(r) => {
                let opts: Vec<JsonValue> = r.options.iter().map(|o| {
                    JsonValue::Object(vec![
                        ("optionId".to_string(), JsonValue::String(o.option_id.clone())),
                        ("text".to_string(), JsonValue::String(o.text.clone())),
                    ])
                }).collect();
                let mut q_fields = vec![
                    ("questionId".to_string(), JsonValue::String(r.question_id.clone())),
                    ("prompt".to_string(), JsonValue::String(r.prompt.clone())),
                    ("kind".to_string(), JsonValue::String(r.kind.clone())),
                ];
                if r.kind == "single_choice" {
                    q_fields.push(("options".to_string(), JsonValue::Array(opts)));
                }
                if let Some(img) = &r.image {
                    q_fields.push(("image".to_string(), img.clone()));
                }
                let q_obj = JsonValue::Object(q_fields);
                let answered: Vec<JsonValue> = r.answered_player_ids.iter().map(|p| JsonValue::String(p.clone())).collect();
                JsonValue::Object(vec![
                    ("ordinal".to_string(), JsonValue::Number(r.ordinal as f64)),
                    ("question".to_string(), q_obj),
                    ("deadlineAt".to_string(), JsonValue::String(r.deadline_at.clone())),
                    ("answeredPlayerIds".to_string(), JsonValue::Array(answered)),
                ])
            }
            None => JsonValue::Null,
        };

        let sett_json = match &self.settlement {
            Some(s) => s.to_json(),
            None => JsonValue::Null,
        };

        let status_str = match self.status.as_str() {
            "available" => "lobby",
            "round" | "countdown" => "running",
            s => s,
        };
        let fallback_uuid = "00000000-0000-4000-8000-000000000001".to_string();

        JsonValue::Object(vec![
            ("tableId".to_string(), JsonValue::String(self.table_id.clone())),
            ("lobbyId".to_string(), JsonValue::String(self.lobby_id.clone().unwrap_or_else(|| fallback_uuid.clone()))),
            ("matchId".to_string(), match &self.match_id { Some(m) => JsonValue::String(m.clone()), None => JsonValue::Null }),
            ("ownerPlayerId".to_string(), JsonValue::String(self.owner_player_id.clone().unwrap_or(fallback_uuid))),
            ("revision".to_string(), JsonValue::Number(self.revision as f64)),
            ("status".to_string(), JsonValue::String(status_str.to_string())),
            ("subject".to_string(), JsonValue::String(self.subject.clone())),
            ("moduleId".to_string(), JsonValue::String(self.module_id.clone())),
            ("contentVersion".to_string(), JsonValue::String(self.content_version.clone())),
            ("stakeAura".to_string(), JsonValue::Number(self.stake_aura as f64)),
            ("potAura".to_string(), JsonValue::Number(self.pot_aura as f64)),
            ("questionCount".to_string(), JsonValue::Number(self.question_count as f64)),
            ("roundSeconds".to_string(), JsonValue::Number(self.round_seconds as f64)),
            ("participants".to_string(), JsonValue::Array(parts)),
            ("round".to_string(), round_json),
            ("settlement".to_string(), sett_json),
        ])
    }
}

pub struct CompetitionService {
    db: DbPool,
    wallet: Arc<WalletService>,
    table: Mutex<CompetitionTable>,
    packs: HashMap<String, ContentPack>, // moduleId -> pack
}

impl CompetitionService {
    pub fn new(db: DbPool, wallet: Arc<WalletService>) -> Self {
        let mut packs = HashMap::new();
        for id in &["math-basics", "informatics-basics", "history-basics", "flags-basics"] {
            let path_primary = format!("assets/content/{}.json", id);
            let path_fallback_v2 = format!("discovery-protocol-2.0.0/fixtures/v2.0.0/content-server-only/{}.json", id);
            let path_fallback_v1 = format!("discovery-protocol-1.1.0/fixtures/v1.1.0/content-server-only/{}.json", id);
            let content_res = std::fs::read_to_string(&path_primary)
                .or_else(|_| std::fs::read_to_string(&path_fallback_v2))
                .or_else(|_| std::fs::read_to_string(&path_fallback_v1));
            if let Ok(content) = content_res {
                if let Ok(json) = parse_json(&content) {
                    let m = json.get("module").unwrap();
                    let module_id = m.get_str("moduleId").unwrap().to_string();
                    let subject = m.get_str("subject").unwrap().to_string();
                    let content_version = m.get_str("contentVersion").unwrap().to_string();
                    let mut questions = Vec::new();
                    if let Some(q_arr) = json.get("questions").and_then(|q| q.as_array()) {
                        for q_item in q_arr {
                            let q_inner = match q_item.get("question") { Some(q) => q, None => continue };
                            let q_id = q_inner.get_str("questionId").unwrap_or("").to_string();
                            let prompt = q_inner.get_str("prompt").unwrap_or("").to_string();
                            let kind = q_inner.get_str("kind").unwrap_or("single_choice").to_string();
                            let image = q_inner.get("image").cloned();
                            let mut options = Vec::new();
                            if let Some(opt_arr) = q_inner.get("options").and_then(|o| o.as_array()) {
                                for opt in opt_arr {
                                    options.push(QuestionOption {
                                        option_id: opt.get_str("optionId").unwrap_or("").to_string(),
                                        text: opt.get_str("text").unwrap_or("").to_string(),
                                    });
                                }
                            }
                            let mut accepted_values = Vec::new();
                            if let Some(ak) = q_item.get("answerKey") {
                                if let Some(av) = ak.get("acceptedValues").and_then(|v| v.as_array()) {
                                    for val in av {
                                        if let Some(s) = val.as_str() {
                                            accepted_values.push(s.to_string());
                                        }
                                    }
                                }
                            }
                            let correct = q_item.get_str("correctOptionId")
                                .map(|s| s.to_string())
                                .or_else(|| accepted_values.first().cloned())
                                .unwrap_or_default();
                            let exp = q_item.get_str("explanation").unwrap_or("").to_string();
                            questions.push(Question {
                                question_id: q_id,
                                prompt,
                                kind,
                                image,
                                options,
                                correct_option_id: correct,
                                accepted_values,
                                explanation: exp,
                            });
                        }
                    }
                    packs.insert(module_id.clone(), ContentPack {
                        module_id, subject, content_version, questions,
                    });
                }
            }
        }

        let seats = vec![
            Seat { seat_id: "competition-seat-1".to_string(), position: (80.0, 0.0, 85.3), yaw_rad: 0.0, exit_position: (80.0, 0.0, 86.4) },
            Seat { seat_id: "competition-seat-2".to_string(), position: (82.187, 0.0, 83.711), yaw_rad: 1.2566, exit_position: (83.234, 0.0, 84.051) },
            Seat { seat_id: "competition-seat-3".to_string(), position: (81.352, 0.0, 81.139), yaw_rad: 2.5133, exit_position: (81.998, 0.0, 80.249) },
            Seat { seat_id: "competition-seat-4".to_string(), position: (78.648, 0.0, 81.139), yaw_rad: -2.5133, exit_position: (78.002, 0.0, 80.249) },
            Seat { seat_id: "competition-seat-5".to_string(), position: (77.813, 0.0, 83.711), yaw_rad: -1.2567, exit_position: (76.766, 0.0, 84.051) },
        ];

        let table = CompetitionTable {
            table_id: "competition-central".to_string(),
            position: (80.0, 0.0, 83.0),
            interaction_radius_m: 3.5,
            seats,
            status: "available".to_string(),
            lobby_id: None,
            match_id: None,
            owner_player_id: None,
            revision: 1,
            subject: "mathematics".to_string(),
            module_id: "math-basics".to_string(),
            content_version: "v1".to_string(),
            stake_aura: 10,
            pot_aura: 0,
            question_count: 5,
            round_seconds: 20,
            participants: Vec::new(),
            current_round: None,
            settlement: None,
            round_closed_info: None,
        };

        Self { db, wallet, table: Mutex::new(table), packs }
    }
}

impl CompetitionService {
    pub fn table_summary_to_json(&self) -> JsonValue {
        self.table.lock().unwrap().table_to_json()
    }

    pub fn get_seat_info(&self, seat_id: &str) -> Option<((f64, f64, f64), f64, (f64, f64, f64))> {
        let t = self.table.lock().unwrap();
        let s = t.seats.iter().find(|s| s.seat_id == seat_id)?;
        Some((s.position, s.yaw_rad, s.exit_position))
    }

    pub fn get_activity(&self, user_id: &str) -> JsonValue {
        let sql = format!("SELECT mode, target_id, seat_id, lesson_id, attempt_id, match_id, lobby_id, revision FROM player_activities WHERE user_id = '{}'", user_id);
        if let Ok(rows) = self.db.query(&sql) {
            if let Some(r) = rows.get(0) {
                let raw_mode = r.get(0).unwrap_or("exploring");
                let mode = match raw_mode {
                    "reading" => "learning",
                    m if ["exploring", "learning", "seated_quiz", "seated_competition"].contains(&m) => m,
                    _ => "exploring",
                };
                let target = r.get(1).filter(|s| !s.is_empty());
                let seat = r.get(2).filter(|s| !s.is_empty());
                let lesson = r.get(3).filter(|s| !s.is_empty());
                let attempt = r.get(4).filter(|s| !s.is_empty());
                let match_id = r.get(5).filter(|s| !s.is_empty());
                let lobby = r.get(6).filter(|s| !s.is_empty());
                let rev = r.get(7).and_then(|v| v.parse::<u64>().ok()).unwrap_or(1);

                return JsonValue::Object(vec![
                    ("activity".to_string(), JsonValue::Object(vec![
                        ("mode".to_string(), JsonValue::String(mode.to_string())),
                        ("targetId".to_string(), match target { Some(t) => JsonValue::String(t.to_string()), None => JsonValue::Null }),
                        ("seatId".to_string(), match seat { Some(s) => JsonValue::String(s.to_string()), None => JsonValue::Null }),
                    ])),
                    ("lessonId".to_string(), match lesson { Some(l) => JsonValue::String(l.to_string()), None => JsonValue::Null }),
                    ("attemptId".to_string(), match attempt { Some(a) => JsonValue::String(a.to_string()), None => JsonValue::Null }),
                    ("matchId".to_string(), match match_id { Some(m) => JsonValue::String(m.to_string()), None => JsonValue::Null }),
                    ("lobbyId".to_string(), match lobby { Some(lb) => JsonValue::String(lb.to_string()), None => JsonValue::Null }),
                    ("revision".to_string(), JsonValue::Number(rev as f64)),
                ]);
            }
        }
        JsonValue::Object(vec![
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
        ])
    }

    pub fn set_activity(
        &self,
        user_id: &str,
        mode: &str,
        target_id: Option<&str>,
        seat_id: Option<&str>,
        lesson_id: Option<&str>,
        attempt_id: Option<&str>,
        lobby_id: Option<&str>,
        match_id: Option<&str>,
    ) {
        let t_sql = match target_id { Some(t) => format!("'{}'", t), None => "NULL".to_string() };
        let s_sql = match seat_id { Some(s) => format!("'{}'", s), None => "NULL".to_string() };
        let les_sql = match lesson_id { Some(l) => format!("'{}'", l), None => "NULL".to_string() };
        let att_sql = match attempt_id { Some(a) => format!("'{}'", a), None => "NULL".to_string() };
        let l_sql = match lobby_id { Some(l) => format!("'{}'", l), None => "NULL".to_string() };
        let m_sql = match match_id { Some(m) => format!("'{}'", m), None => "NULL".to_string() };
        let sql = format!(
            "INSERT INTO player_activities (user_id, mode, target_id, seat_id, lesson_id, attempt_id, lobby_id, match_id, revision, updated_at) \
             VALUES ('{}', '{}', {}, {}, {}, {}, {}, {}, 1, NOW()) \
             ON CONFLICT (user_id) DO UPDATE \
             SET mode = EXCLUDED.mode, target_id = EXCLUDED.target_id, seat_id = EXCLUDED.seat_id, \
                 lesson_id = EXCLUDED.lesson_id, attempt_id = EXCLUDED.attempt_id, \
                 lobby_id = EXCLUDED.lobby_id, match_id = EXCLUDED.match_id, \
                 revision = player_activities.revision + 1, updated_at = NOW()",
            user_id, mode, t_sql, s_sql, les_sql, att_sql, l_sql, m_sql
        );
        let _ = self.db.execute(&sql);
    }

    pub fn get_table_json(&self) -> JsonValue {
        self.table.lock().unwrap().table_to_json()
    }

    pub fn get_state_json(&self) -> JsonValue {
        self.table.lock().unwrap().state_to_json()
    }

    pub fn get_lobby_state_json(&self, lobby_id: &str) -> Option<JsonValue> {
        let t = self.table.lock().unwrap();
        if t.lobby_id.as_deref() == Some(lobby_id) && !t.participants.is_empty() {
            Some(t.state_to_json())
        } else {
            None
        }
    }
}

impl CompetitionService {
    pub fn join_table(&self, user_id: &str, player_id: &str, display_name: &str, px: f64, pz: f64) -> Result<(JsonValue, String, String), (u16, &'static str, &'static str)> {
        let mut t = self.table.lock().unwrap();
        // 1. Distance check
        let dist = ((px - t.position.0).powi(2) + (pz - t.position.2).powi(2)).sqrt();
        if dist > t.interaction_radius_m + 3.0 {
            return Err((400, "OUT_OF_RANGE", "Player is too far from competition table"));
        }

        // 2. Activity conflict check
        let act = self.get_activity(user_id);
        let mode = act.get("activity").and_then(|a| a.get_str("mode")).unwrap_or("exploring");
        let already_in_table = t.participants.iter().any(|p| p.player_id == player_id);
        if !already_in_table && mode != "exploring" {
            return Err((409, "ACTIVITY_CONFLICT", "Player is currently engaged in another activity"));
        }

        if t.status == "running" && !already_in_table {
            return Err((409, "MATCH_STARTED", "Competition match is already in progress"));
        }

        // 3. If already in table, return state
        if let Some(p) = t.participants.iter_mut().find(|p| p.player_id == player_id) {
            p.connected = true;
            let seat_id = p.seat_id.clone();
            let lobby_id = t.lobby_id.clone().unwrap_or_default();
            let state_val = t.state_to_json();
            return Ok((state_val, seat_id, lobby_id));
        }

        // 4. Find free seat
        let occupied_seats: HashSet<String> = t.participants.iter().map(|p| p.seat_id.clone()).collect();
        let seat = t.seats.iter().find(|s| !occupied_seats.contains(&s.seat_id))
            .ok_or((409, "SEAT_OCCUPIED", "All table seats are currently occupied"))?;
        let assigned_seat_id = seat.seat_id.clone();

        // 5. Check wallet balance
        let w = self.wallet.get_wallet(user_id).map_err(|_| (500, "DB_ERROR", "Failed to check wallet"))?;
        if w.available_aura < t.stake_aura {
            return Err((409, "INSUFFICIENT_AURA", "Not enough Aura balance to join competition"));
        }

        // 6. Join table
        let is_first = t.participants.is_empty();
        if is_first {
            t.status = "lobby".to_string();
            t.lobby_id = Some(crate::auth::AuthService::generate_id());
            t.owner_player_id = Some(player_id.to_string());
        }

        t.participants.push(Participant {
            player_id: player_id.to_string(),
            user_id: user_id.to_string(),
            display_name: display_name.to_string(),
            seat_id: assigned_seat_id.clone(),
            ready: false,
            connected: true,
            left: false,
            score: 0,
            current_option_id: None,
        });
        t.revision += 1;

        self.set_activity(user_id, "seated_competition", Some(&t.table_id), Some(&assigned_seat_id), None, None, t.lobby_id.as_deref(), t.match_id.as_deref());
        let lobby_id = t.lobby_id.clone().unwrap_or_default();
        let state_val = t.state_to_json();
        Ok((state_val, assigned_seat_id, lobby_id))
    }

    pub fn configure_lobby(&self, player_id: &str, subject: &str, stake: i64, expected_rev: u64) -> Result<JsonValue, (u16, &'static str, &'static str)> {
        let mut t = self.table.lock().unwrap();
        if t.owner_player_id.as_deref() != Some(player_id) {
            return Err((403, "NOT_OWNER", "Only lobby owner can configure competition"));
        }
        if t.status != "lobby" {
            return Err((409, "INVALID_STATE", "Competition is not in lobby state"));
        }
        if t.revision != expected_rev {
            return Err((409, "LOBBY_CHANGED", "Lobby revision mismatch"));
        }

        // Reset readiness and release reserved aura
        let old_stake = t.stake_aura;
        let old_lobby = t.lobby_id.clone();
        for p in &mut t.participants {
            if p.ready {
                p.ready = false;
                let _ = self.wallet.release_aura(&p.user_id, &crate::auth::AuthService::generate_id(), old_stake, old_lobby.as_deref());
            }
        }

        t.subject = subject.to_string();
        t.module_id = match subject {
            "informatics" => "informatics-basics".to_string(),
            "history" => "history-basics".to_string(),
            "geography_flags" => "flags-basics".to_string(),
            _ => "math-basics".to_string(),
        };
        t.stake_aura = stake;
        t.revision += 1;
        Ok(t.state_to_json())
    }
}

impl CompetitionService {
    pub fn set_ready(&self, user_id: &str, player_id: &str, is_ready: bool, expected_rev: u64) -> Result<(JsonValue, WalletDto), (u16, &'static str, &'static str)> {
        let mut t = self.table.lock().unwrap();
        if t.status != "lobby" {
            return Err((409, "INVALID_STATE", "Competition is not in lobby state"));
        }
        if t.revision != expected_rev {
            return Err((409, "LOBBY_CHANGED", "Lobby revision mismatch"));
        }

        let stake = t.stake_aura;
        let lobby_id = t.lobby_id.clone();
        let p = t.participants.iter_mut().find(|p| p.player_id == player_id)
            .ok_or((404, "NOT_FOUND", "Player not at table"))?;

        let wallet_res = if is_ready {
            if !p.ready {
                let w = self.wallet.reserve_aura(user_id, &crate::auth::AuthService::generate_id(), stake, lobby_id.as_deref())?;
                p.ready = true;
                w
            } else {
                self.wallet.get_wallet(user_id).unwrap()
            }
        } else {
            if p.ready {
                let w = self.wallet.release_aura(user_id, &crate::auth::AuthService::generate_id(), stake, lobby_id.as_deref())?;
                p.ready = false;
                w
            } else {
                self.wallet.get_wallet(user_id).unwrap()
            }
        };

        t.revision += 1;
        Ok((t.state_to_json(), wallet_res))
    }

    pub fn start_match(&self, player_id: &str, expected_rev: u64) -> Result<JsonValue, (u16, &'static str, &'static str)> {
        let mut t = self.table.lock().unwrap();
        if t.owner_player_id.as_deref() != Some(player_id) {
            return Err((403, "NOT_OWNER", "Only lobby owner can start competition"));
        }
        if t.status != "lobby" {
            return Err((409, "INVALID_STATE", "Competition is not in lobby state"));
        }
        if t.revision != expected_rev {
            return Err((409, "LOBBY_CHANGED", "Lobby revision mismatch"));
        }
        if t.participants.len() < 2 {
            return Err((400, "INSUFFICIENT_PLAYERS", "Need at least 2 players to start competition"));
        }
        if !t.participants.iter().all(|p| p.ready) {
            return Err((409, "NOT_READY", "All participants must be ready to start match"));
        }

        let match_id = crate::auth::AuthService::generate_id();
        let stake = t.stake_aura;
        let lobby_id = t.lobby_id.clone();

        // Transfer stakes to escrow
        for p in &t.participants {
            let _ = self.wallet.stake_aura(&p.user_id, &crate::auth::AuthService::generate_id(), stake, lobby_id.as_deref(), Some(&match_id));
        }

        t.match_id = Some(match_id.clone());
        t.status = "running".to_string();
        t.pot_aura = (t.participants.len() as i64) * stake;

        // Select first question
        let pack = self.packs.get(&t.module_id).unwrap();
        let rnd = crate::auth::rand_simple() as usize;
        let q = &pack.questions[rnd % pack.questions.len()];
        let now_ms = CompetitionTable::now_ms();
        let deadline_ms = now_ms + (t.round_seconds as u64) * 1000;
        let deadline_at = CompetitionTable::rfc3339_at(deadline_ms);

        t.current_round = Some(ActiveRound {
            ordinal: 1,
            question_id: q.question_id.clone(),
            prompt: q.prompt.clone(),
            kind: q.kind.clone(),
            image: q.image.clone(),
            options: q.options.clone(),
            correct_option_id: q.correct_option_id.clone(),
            accepted_values: q.accepted_values.clone(),
            explanation: q.explanation.clone(),
            deadline_at,
            deadline_ms,
            answered_player_ids: HashSet::new(),
        });
        t.revision += 1;

        for p in &t.participants {
            self.set_activity(&p.user_id, "seated_competition", Some(&t.table_id), Some(&p.seat_id), None, None, lobby_id.as_deref(), Some(&match_id));
        }

        Ok(t.state_to_json())
    }
}

impl CompetitionService {
    pub fn submit_answer(&self, player_id: &str, match_id: &str, question_id: &str, option_id: &str) -> Result<bool, (u16, &'static str, &'static str)> {
        let mut t = self.table.lock().unwrap();
        if t.status != "running" || t.match_id.as_deref() != Some(match_id) {
            return Err((409, "INVALID_STATE", "Competition match is not running"));
        }

        {
            let round = t.current_round.as_mut().ok_or((409, "NO_ROUND", "No active round"))?;
            if round.question_id != question_id {
                return Err((400, "INVALID_QUESTION", "Question ID does not match current round"));
            }
            if round.answered_player_ids.contains(player_id) {
                return Err((409, "ANSWER_ALREADY_ACCEPTED", "Answer has already been submitted for this round"));
            }
            if CompetitionTable::now_ms() > round.deadline_ms {
                return Err((409, "QUESTION_CLOSED", "Round deadline has expired"));
            }
            round.answered_player_ids.insert(player_id.to_string());
        }

        if let Some(p) = t.participants.iter_mut().find(|p| p.player_id == player_id) {
            p.current_option_id = Some(option_id.to_string());
        }

        // Check if all connected active participants have answered
        let all_answered = {
            let round = t.current_round.as_ref().unwrap();
            t.participants.iter()
                .filter(|p| p.connected && !p.left)
                .all(|p| round.answered_player_ids.contains(&p.player_id))
        };

        if all_answered {
            self.internal_close_round(&mut t);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn tick_timer(&self) -> (bool, bool) { // (round_closed, match_settled)
        let mut t = self.table.lock().unwrap();
        if t.status != "running" {
            return (false, false);
        }
        let now = CompetitionTable::now_ms();
        if let Some(round) = &t.current_round {
            if now > round.deadline_ms {
                let was_running = t.status == "running";
                self.internal_close_round(&mut t);
                let is_finished = t.status == "finished";
                return (true, was_running && is_finished);
            }
        }
        (false, false)
    }

    fn internal_close_round(&self, t: &mut CompetitionTable) {
        let round = match t.current_round.take() {
            Some(r) => r,
            None => return,
        };

        let mut scores_summary = Vec::new();
        for p in &mut t.participants {
            let is_corr = if let Some(sub) = &p.current_option_id {
                let sub_trimmed = sub.trim().to_lowercase();
                let corr_trimmed = round.correct_option_id.trim().to_lowercase();
                sub_trimmed == corr_trimmed 
                    || round.options.iter().any(|o| o.option_id == round.correct_option_id && o.text.trim().to_lowercase() == sub_trimmed)
                    || round.accepted_values.iter().any(|av| av.trim().to_lowercase() == sub_trimmed)
            } else {
                false
            };
            if is_corr {
                p.score += 1;
            }
            scores_summary.push((p.player_id.clone(), p.score, is_corr));
            p.current_option_id = None;
        }

        t.round_closed_info = Some((
            round.ordinal,
            round.question_id.clone(),
            round.correct_option_id.clone(),
            round.explanation.clone(),
            scores_summary,
        ));

        if round.ordinal < t.question_count {
            let next_ord = round.ordinal + 1;
            let pack = self.packs.get(&t.module_id).unwrap();
            let rnd = crate::auth::rand_simple() as usize;
            let q = &pack.questions[rnd % pack.questions.len()];
            let now_ms = CompetitionTable::now_ms();
            let deadline_ms = now_ms + (t.round_seconds as u64) * 1000;
            let deadline_at = CompetitionTable::rfc3339_at(deadline_ms);

            t.current_round = Some(ActiveRound {
                ordinal: next_ord,
                question_id: q.question_id.clone(),
                prompt: q.prompt.clone(),
                kind: q.kind.clone(),
                image: q.image.clone(),
                options: q.options.clone(),
                correct_option_id: q.correct_option_id.clone(),
                accepted_values: q.accepted_values.clone(),
                explanation: q.explanation.clone(),
                deadline_at,
                deadline_ms,
                answered_player_ids: HashSet::new(),
            });
            t.revision += 1;
        } else {
            self.internal_settle_match(t);
        }
    }
}

impl CompetitionService {
    fn internal_settle_match(&self, t: &mut CompetitionTable) {
        let max_score = t.participants.iter().map(|p| p.score).max().unwrap_or(0);
        let winners: Vec<Participant> = t.participants.iter().filter(|p| p.score == max_score).cloned().collect();

        let settlement_id = crate::auth::AuthService::generate_id();
        let match_id = t.match_id.clone().unwrap_or_default();
        let mut payouts = Vec::new();

        if winners.len() == 1 {
            let winner = &winners[0];
            let _ = self.wallet.payout_aura(&winner.user_id, &settlement_id, t.pot_aura, Some(&match_id));
            for p in &t.participants {
                payouts.push(SettlementPayout {
                    player_id: p.player_id.clone(),
                    amount_aura: if p.player_id == winner.player_id { t.pot_aura } else { 0 },
                });
            }
            t.settlement = Some(Settlement {
                settlement_id: settlement_id.clone(),
                match_id: match_id.clone(),
                outcome: "winner".to_string(),
                winner_player_id: Some(winner.player_id.clone()),
                pot_aura: t.pot_aura,
                payouts,
                reason: None,
            });
        } else {
            // Draw / Tie: refund all
            for p in &t.participants {
                let _ = self.wallet.refund_aura(&p.user_id, &settlement_id, t.stake_aura, Some(&match_id));
                payouts.push(SettlementPayout {
                    player_id: p.player_id.clone(),
                    amount_aura: t.stake_aura,
                });
            }
            t.settlement = Some(Settlement {
                settlement_id: settlement_id.clone(),
                match_id: match_id.clone(),
                outcome: "draw".to_string(),
                winner_player_id: None,
                pot_aura: t.pot_aura,
                payouts,
                reason: None,
            });
        }

        t.status = "finished".to_string();
        t.revision += 1;

        // Persist settlement and match
        let win_sql = match &t.settlement.as_ref().unwrap().winner_player_id {
            Some(w) => format!("'{}'", w),
            None => "NULL".to_string(),
        };
        let out = &t.settlement.as_ref().unwrap().outcome;
        let ins_match = format!(
            "INSERT INTO competition_matches (match_id, table_id, lobby_id, subject, module_id, content_version, stake_aura, pot_aura, question_count, round_seconds, status, settlement_id, outcome, winner_player_id, created_at, settled_at) \
             VALUES ('{}', '{}', '{}', '{}', '{}', '{}', {}, {}, {}, {}, 'finished', '{}', '{}', {}, NOW(), NOW()) ON CONFLICT DO NOTHING",
            match_id, t.table_id, t.lobby_id.as_deref().unwrap_or(""), t.subject, t.module_id, t.content_version, t.stake_aura, t.pot_aura, t.question_count, t.round_seconds, settlement_id, out, win_sql
        );
        let _ = self.db.execute(&ins_match);

        for p in &t.participants {
            let ins_p = format!(
                "INSERT INTO competition_participants (match_id, user_id, player_id, display_name, seat_id, score, left_match, payout_aura) \
                 VALUES ('{}', '{}', '{}', '{}', '{}', {}, {}, {}) ON CONFLICT DO NOTHING",
                match_id, p.user_id, p.player_id, p.display_name.replace("'", "''"), p.seat_id, p.score, p.left,
                if Some(&p.player_id) == t.settlement.as_ref().unwrap().winner_player_id.as_ref() { t.pot_aura } else if out == "draw" { t.stake_aura } else { 0 }
            );
            let _ = self.db.execute(&ins_p);
        }
    }

    pub fn leave_table(&self, user_id: &str, player_id: &str) -> JsonValue {
        let mut t = self.table.lock().unwrap();
        if t.status == "lobby" {
            if let Some(pos) = t.participants.iter().position(|p| p.player_id == player_id) {
                let p = t.participants.remove(pos);
                if p.ready {
                    let _ = self.wallet.release_aura(user_id, &crate::auth::AuthService::generate_id(), t.stake_aura, t.lobby_id.as_deref());
                }
            }
            if t.participants.is_empty() {
                t.status = "available".to_string();
                t.lobby_id = None;
                t.owner_player_id = None;
            } else if t.owner_player_id.as_deref() == Some(player_id) {
                t.owner_player_id = Some(t.participants[0].player_id.clone());
            }
            t.revision += 1;
        } else if t.status == "running" {
            if let Some(p) = t.participants.iter_mut().find(|p| p.player_id == player_id) {
                p.left = true;
            }
            t.revision += 1;
        } else if t.status == "finished" {
            if let Some(pos) = t.participants.iter().position(|p| p.player_id == player_id) {
                t.participants.remove(pos);
            }
            if t.participants.is_empty() {
                t.status = "available".to_string();
                t.lobby_id = None;
                t.match_id = None;
                t.owner_player_id = None;
                t.current_round = None;
                t.settlement = None;
            }
            t.revision += 1;
        }
        self.set_activity(user_id, "exploring", None, None, None, None, None, None);
        t.state_to_json()
    }
}

impl CompetitionService {
    pub fn get_recovery(&self, _user_id: &str, player_id: &str) -> Option<JsonValue> {
        let t = self.table.lock().unwrap();
        let p = t.participants.iter().find(|p| p.player_id == player_id)?;
        let state_val = t.state_to_json();
        let submitted_ans = match &p.current_option_id {
            Some(o) => JsonValue::Object(vec![
                ("kind".to_string(), JsonValue::String("single_choice".to_string())),
                ("value".to_string(), JsonValue::String(o.clone())),
            ]),
            None => JsonValue::Null,
        };
        let ans_acc = p.current_option_id.is_some();

        Some(JsonValue::Object(vec![
            ("state".to_string(), state_val),
            ("submittedAnswer".to_string(), submitted_ans),
            ("answerAccepted".to_string(), JsonValue::Bool(ans_acc)),
        ]))
    }

    pub fn cancel_match(&self, reason: &str) {
        let mut t = self.table.lock().unwrap();
        if t.status != "running" {
            return;
        }
        let settlement_id = crate::auth::AuthService::generate_id();
        let match_id = t.match_id.clone().unwrap_or_default();
        let mut payouts = Vec::new();

        for p in &t.participants {
            let _ = self.wallet.refund_aura(&p.user_id, &settlement_id, t.stake_aura, Some(&match_id));
            payouts.push(SettlementPayout {
                player_id: p.player_id.clone(),
                amount_aura: t.stake_aura,
            });
        }

        t.settlement = Some(Settlement {
            settlement_id,
            match_id,
            outcome: "cancelled".to_string(),
            winner_player_id: None,
            pot_aura: t.pot_aura,
            payouts,
            reason: Some(reason.to_string()),
        });
        t.status = "cancelled".to_string();
        t.revision += 1;
    }

    pub fn state_to_json(&self) -> JsonValue {
        self.table.lock().unwrap().state_to_json()
    }

    pub fn get_participant_player_ids(&self) -> Vec<String> {
        let t = self.table.lock().unwrap();
        t.participants.iter().map(|p| p.player_id.clone()).collect()
    }

    pub fn get_participant_user_ids(&self) -> Vec<(String, String)> {
        let t = self.table.lock().unwrap();
        t.participants.iter().map(|p| (p.player_id.clone(), p.user_id.clone())).collect()
    }

    pub fn take_round_closed_payload(&self) -> Option<JsonValue> {
        let mut t = self.table.lock().unwrap();
        let (ord, q_id, corr_id, expl, scores) = t.round_closed_info.take()?;
        let match_id = t.match_id.clone().unwrap_or_default();
        let next_start = t.current_round.as_ref().map(|_| CompetitionTable::rfc3339_at(CompetitionTable::now_ms() + 1000));
        let next_val = match next_start {
            Some(s) => JsonValue::String(s),
            None => JsonValue::Null,
        };
        let scores_arr = scores.into_iter().map(|(pid, sc, corr)| {
            JsonValue::Object(vec![
                ("playerId".to_string(), JsonValue::String(pid)),
                ("score".to_string(), JsonValue::Number(sc as f64)),
                ("correct".to_string(), JsonValue::Bool(corr)),
            ])
        }).collect();

        Some(JsonValue::Object(vec![
            ("matchId".to_string(), JsonValue::String(match_id)),
            ("ordinal".to_string(), JsonValue::Number(ord as f64)),
            ("questionId".to_string(), JsonValue::String(q_id)),
            ("expectedAnswer".to_string(), JsonValue::String(corr_id)),
            ("explanation".to_string(), JsonValue::String(expl)),
            ("scores".to_string(), JsonValue::Array(scores_arr)),
            ("nextRoundStartsAt".to_string(), next_val),
        ]))
    }

    pub fn take_settled_payload(&self) -> Option<JsonValue> {
        let mut t = self.table.lock().unwrap();
        let s = t.settlement.take()?;
        Some(s.to_json())
    }
}
