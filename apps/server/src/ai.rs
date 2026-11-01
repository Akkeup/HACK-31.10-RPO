// ai.rs: Local Adaptive NPC AI and Knowledge System

use std::collections::HashSet;
use crate::db::DbPool;
use crate::json::{parse_json, JsonValue};
use crate::models::{InteractionDto, ProgressDto};

#[derive(Debug, Clone)]
pub struct KnowledgeItem {
    pub id: String,
    pub title: String,
    pub keywords: Vec<String>,
    pub simple: String,
    pub advanced: String,
    pub reward_knowledge_id: String,
}

pub struct NpcAiService {
    db: DbPool,
    knowledge_items: Vec<KnowledgeItem>,
}

impl NpcAiService {
    pub fn new(db: DbPool) -> Self {
        let content = std::fs::read_to_string("assets/npc/knowledge/discovery-basics.json")
            .unwrap_or_else(|_| "{}".to_string());
        let val = parse_json(&content).unwrap_or(JsonValue::Null);

        let mut items = Vec::new();
        if let Some(arr) = val.get("items").and_then(|i| i.as_array()) {
            for item in arr {
                let id = item.get_str("id").unwrap_or("").to_string();
                let title = item.get_str("title").unwrap_or("").to_string();
                let simple = item.get_str("simple").unwrap_or("").to_string();
                let advanced = item.get_str("advanced").unwrap_or("").to_string();
                let reward_knowledge_id = item.get_str("rewardKnowledgeId").unwrap_or("").to_string();
                let keywords = item.get("keywords").and_then(|k| k.as_array())
                    .map(|k_arr| k_arr.iter().filter_map(|w| w.as_str().map(|s| s.to_lowercase())).collect())
                    .unwrap_or_default();

                items.push(KnowledgeItem {
                    id, title, keywords, simple, advanced, reward_knowledge_id,
                });
            }
        }

        Self {
            db,
            knowledge_items: items,
        }
    }
}
impl NpcAiService {
    pub fn process_interaction(
        &self,
        user_id: &str,
        session_id: &str,
        request_id: &str,
        npc_id: &str,
        action: &str,
        text: &str,
        current_progress: &ProgressDto,
        difficulty: &str,
        fallback_text: &str,
    ) -> InteractionDto {
        // Idempotency: return existing interaction if already processed
        if let Some(existing) = self.get_interaction(user_id, session_id, request_id) {
            return existing;
        }

        let text_lower = text.to_lowercase();
        let completed_set: HashSet<String> = current_progress.completed_knowledge_ids.iter().cloned().collect();

        // 1. Search knowledge items for matching keywords
        let mut matched_item: Option<&KnowledgeItem> = None;
        for item in &self.knowledge_items {
            for kw in &item.keywords {
                if text_lower.contains(kw) {
                    matched_item = Some(item);
                    break;
                }
            }
            if matched_item.is_some() {
                break;
            }
        }

        // 2. Select response text and candidate knowledge ID
        let mut llm_res: Option<String> = None;
        if !text.trim().is_empty() {
            if let Ok(resp) = self.call_ollama(text) {
                if !resp.trim().is_empty() {
                    llm_res = Some(resp);
                }
            }
        }

        let (reply_text, source, candidate_k_id) = if let Some(llm_text) = llm_res {
            (llm_text, "ollama".to_string(), matched_item.map(|i| i.reward_knowledge_id.clone()))
        } else if let Some(item) = matched_item {
            let use_advanced = match difficulty {
                "advanced" => true,
                "simple" => false,
                _ => completed_set.len() >= 1, // "adaptive": advance if player already has progress
            };
            let text = if use_advanced { item.advanced.clone() } else { item.simple.clone() };
            (text, "rules".to_string(), Some(item.reward_knowledge_id.clone()))
        } else {
            (fallback_text.to_string(), "fallback".to_string(), None)
        };

        // 3. Calculate new progress revision and reward
        let mut new_knowledge_ids = Vec::new();
        let mut next_revision = current_progress.revision;
        if let Some(k_id) = candidate_k_id {
            if !completed_set.contains(&k_id) {
                new_knowledge_ids.push(k_id);
                next_revision += 1;
            }
        }

        InteractionDto {
            request_id: request_id.to_string(),
            npc_id: npc_id.to_string(),
            status: "completed".to_string(),
            text: reply_text,
            source,
            knowledge_ids: new_knowledge_ids,
            progress_revision: next_revision,
            error: None,
        }
    }
}
impl NpcAiService {
    pub fn save_interaction(
        &self,
        user_id: &str,
        session_id: &str,
        request_id: &str,
        payload_hash: &str,
        npc_id: &str,
        action: &str,
        input_text: &str,
        interaction: &InteractionDto,
    ) {
        let k_arr = if interaction.knowledge_ids.is_empty() {
            "'{}'".to_string()
        } else {
            format!("ARRAY[{}]", interaction.knowledge_ids.iter().map(|k| format!("'{}'", k)).collect::<Vec<_>>().join(","))
        };

        let sql = format!(
            "INSERT INTO interactions (user_id, session_id, request_id, payload_hash, npc_id, action, input_text, status, result_text, source, knowledge_ids, progress_revision, created_at) \
             VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}', {}, {}, NOW()) \
             ON CONFLICT (user_id, session_id, request_id) DO UPDATE \
             SET status = EXCLUDED.status, result_text = EXCLUDED.result_text, source = EXCLUDED.source, knowledge_ids = EXCLUDED.knowledge_ids, progress_revision = EXCLUDED.progress_revision",
            user_id, session_id, request_id, payload_hash, npc_id, action,
            input_text.replace("'", "''"), interaction.status, interaction.text.replace("'", "''"),
            interaction.source, k_arr, interaction.progress_revision
        );
        let _ = self.db.execute(&sql);

        // Record turn in npc_memories
        let mem_sql = format!(
            "INSERT INTO npc_memories (user_id, world_id, npc_id, turn_index, role, content, created_at) \
             VALUES ('{}', 'discovery-campus', '{}', 1, 'user', '{}', NOW()), \
                    ('{}', 'discovery-campus', '{}', 2, 'npc', '{}', NOW())",
            user_id, npc_id, input_text.replace("'", "''"),
            user_id, npc_id, interaction.text.replace("'", "''")
        );
        let _ = self.db.execute(&mem_sql);
    }

    pub fn get_interaction(&self, user_id: &str, session_id: &str, request_id: &str) -> Option<InteractionDto> {
        let sql = format!(
            "SELECT npc_id, status, result_text, source, progress_revision FROM interactions \
             WHERE user_id = '{}' AND session_id = '{}' AND request_id = '{}'",
            user_id, session_id, request_id
        );
        let rows = self.db.query(&sql).ok()?;
        let row = rows.get(0)?;
        Some(InteractionDto {
            request_id: request_id.to_string(),
            npc_id: row.get(0).unwrap_or("").to_string(),
            status: row.get(1).unwrap_or("completed").to_string(),
            text: row.get(2).unwrap_or("").to_string(),
            source: row.get(3).unwrap_or("rules").to_string(),
            knowledge_ids: Vec::new(),
            progress_revision: row.get(4).and_then(|r| r.parse().ok()).unwrap_or(1),
            error: None,
        })
    }

    pub fn get_progress(&self, user_id: &str) -> ProgressDto {
        let sql = format!(
            "SELECT revision, completed_knowledge_ids, updated_at FROM player_progress WHERE player_id = '{}'",
            user_id
        );
        if let Ok(rows) = self.db.query(&sql) {
            if let Some(row) = rows.get(0) {
                let rev = row.get(0).and_then(|r| r.parse().ok()).unwrap_or(1);
                let raw_k = row.get(1).unwrap_or("");
                let ids = raw_k.trim_matches(|c| c == '{' || c == '}').split(',')
                    .filter(|s| !s.is_empty())
                    .map(|s| s.trim_matches('"').to_string())
                    .collect();
                let updated = row.get(2).unwrap_or("2026-10-31T09:00:00Z").to_string();
                return ProgressDto {
                    player_id: user_id.to_string(),
                    revision: rev,
                    completed_knowledge_ids: ids,
                    updated_at: updated,
                };
            }
        }
        ProgressDto {
            player_id: user_id.to_string(),
            revision: 1,
            completed_knowledge_ids: Vec::new(),
            updated_at: "2026-10-31T09:00:00Z".to_string(),
        }
    }

    pub fn update_progress(&self, user_id: &str, new_rev: u64, new_id: &str) {
        let sql = format!(
            "INSERT INTO player_progress (player_id, revision, completed_knowledge_ids, updated_at) \
             VALUES ('{}', {}, ARRAY['{}'], NOW()) \
             ON CONFLICT (player_id) DO UPDATE \
             SET revision = {}, completed_knowledge_ids = array_append(player_progress.completed_knowledge_ids, '{}'), updated_at = NOW()",
            user_id, new_rev, new_id, new_rev, new_id
        );
        let _ = self.db.execute(&sql);
    }
}

// LLM Question Drafting and Country Teacher Generator
impl NpcAiService {
    pub fn build_country_teacher_prompt(country_name: &str, facts: &[&str], flag_visible: &str) -> String {
        format!(
            "Ты преподаватель читального зала. По COUNTRY_FACTS составь ровно 3–4 коротких предложения на русском, \
максимум 80 слов. Назови страну/географическое положение; столицу только если однозначна в фактах; \
добавь 1–2 подтверждённых факта. Флаг описывай только по переданной записи. \
Не придумывай символику, статистику, даты. Если фактов мало, status=insufficient_data. \
Верни JSON со свойствами: status, descriptionSentences, usedFactIds. Не добавляй списки и вступления.\n\n\
COUNTRY_FACTS:\nСтрана: {}\nВидимый флаг: {}\nФакты:\n{}",
            country_name, flag_visible, facts.join("\n")
        )
    }

    pub fn validate_drafted_description(sentences: &[String]) -> Result<(), &'static str> {
        if sentences.len() < 3 || sentences.len() > 4 {
            return Err("INVALID_SENTENCE_COUNT");
        }
        let total_text = sentences.join(" ");
        let words: Vec<&str> = total_text.split_whitespace().collect();
        if words.len() > 80 {
            return Err("EXCEEDED_80_WORDS");
        }
        for s in sentences {
            if !s.ends_with('.') {
                return Err("SENTENCE_MUST_END_WITH_PERIOD");
            }
            let inner = &s[..s.len() - 1];
            if inner.contains('.') || inner.contains('!') || inner.contains('?') {
                return Err("INTERNAL_SENTENCE_SPLIT_DETECTED");
            }
        }
        Ok(())
    }
}

impl NpcAiService {
    pub fn call_ollama(&self, prompt: &str) -> Result<String, &'static str> {
        use std::io::{Read, Write};
        use std::net::TcpStream;
        use std::time::Duration;

        let host = std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "127.0.0.1:11434".to_string());
        let mut stream = TcpStream::connect_timeout(
            &host.parse().map_err(|_| "OLLAMA_HOST_PARSE_ERROR")?,
            Duration::from_millis(1000),
        ).map_err(|_| "OLLAMA_CONNECT_TIMEOUT")?;

        stream.set_read_timeout(Some(Duration::from_secs(12))).ok();
        stream.set_write_timeout(Some(Duration::from_secs(2))).ok();

        let req_body = format!(
            "{{\"model\":\"qwen2.5:3b\",\"prompt\":{},\"stream\":false,\"format\":\"json\"}}",
            JsonValue::String(prompt.to_string()).to_string()
        );
        let http_req = format!(
            "POST /api/generate HTTP/1.1\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            host, req_body.len(), req_body
        );

        stream.write_all(http_req.as_bytes()).map_err(|_| "OLLAMA_WRITE_ERROR")?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp).map_err(|_| "OLLAMA_READ_ERROR")?;

        if let Some(pos) = resp.find("\r\n\r\n") {
            let body = &resp[pos + 4..];
            if let Ok(json) = parse_json(body) {
                if let Some(ans) = json.get_str("response") {
                    return Ok(ans.to_string());
                }
            }
        }
        Err("OLLAMA_EMPTY_RESPONSE")
    }

    pub fn validate_drafted_options(options: &[String], correct_idx: usize) -> Result<(), &'static str> {
        if options.len() != 4 {
            return Err("MUST_HAVE_EXACTLY_4_OPTIONS");
        }
        let set: HashSet<String> = options.iter().map(|s| s.trim().to_lowercase()).collect();
        if set.len() != 4 {
            return Err("DUPLICATE_OPTIONS_DETECTED");
        }
        if correct_idx >= options.len() {
            return Err("CORRECT_OPTION_INDEX_OUT_OF_BOUNDS");
        }
        Ok(())
    }
}
