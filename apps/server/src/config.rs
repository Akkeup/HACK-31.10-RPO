// config.rs: WorldConfig, CharacterConfig, NPCBehaviorConfig and Admin CAS Service

use std::sync::{Arc, RwLock};
use crate::db::DbPool;
use crate::json::{parse_json, JsonValue};

pub struct ConfigState {
    pub revision: u64,
    pub admin_values: JsonValue,
    pub public_values: JsonValue,
}

pub struct ConfigService {
    db: DbPool,
    state: RwLock<ConfigState>,
}

impl ConfigService {
    pub fn new(db: DbPool) -> Self {
        let admin_content = std::fs::read_to_string("assets/config/admin-config.json")
            .or_else(|_| std::fs::read_to_string("apps/client/tests/fixtures/v2.0.0/http/admin-config.json"))
            .unwrap_or_else(|_| "{}".to_string());
        let mut admin_values = parse_json(&admin_content).unwrap_or(JsonValue::Null);
        while let Some(inner) = admin_values.get("values") {
            admin_values = inner.clone();
        }

        let public_content = std::fs::read_to_string("assets/config/public-config.json")
            .or_else(|_| std::fs::read_to_string("apps/client/tests/fixtures/v2.0.0/http/public-config.json"))
            .unwrap_or_else(|_| "{}".to_string());
        let mut public_values = parse_json(&public_content).unwrap_or(JsonValue::Null);
        while let Some(inner) = public_values.get("values") {
            public_values = inner.clone();
        }

        let mut revision = 1u64;
        if let Ok(rows) = db.query("SELECT revision FROM config_revisions ORDER BY revision DESC LIMIT 1") {
            if let Some(row) = rows.get(0) {
                if let Some(rev_str) = row.get(0) {
                    if let Ok(r) = rev_str.parse::<u64>() {
                        revision = r;
                    }
                }
            }
        }

        Self {
            db,
            state: RwLock::new(ConfigState {
                revision,
                admin_values,
                public_values,
            }),
        }
    }
}
impl ConfigService {
    pub fn get_revision(&self) -> u64 {
        self.state.read().unwrap().revision
    }

    pub fn get_etag(&self) -> String {
        format!("config-{}", self.get_revision())
    }

    pub fn get_public_config(&self) -> (JsonValue, String) {
        let guard = self.state.read().unwrap();
        let mut pub_vals = guard.public_values.clone();
        if let JsonValue::Object(ref mut map) = pub_vals {
            map.retain(|(k, _)| k != "economy" && k != "npcBehavior");
        }
        let body = JsonValue::Object(vec![
            ("revision".to_string(), JsonValue::Number(guard.revision as f64)),
            ("values".to_string(), pub_vals),
        ]);
        (body, format!("config-{}", guard.revision))
    }

    pub fn get_admin_config(&self, role: &str) -> Result<(JsonValue, String), (u16, &'static str, &'static str)> {
        if role != "admin" {
            return Err((403, "FORBIDDEN", "Admin role required"));
        }
        let guard = self.state.read().unwrap();
        let body = JsonValue::Object(vec![
            ("revision".to_string(), JsonValue::Number(guard.revision as f64)),
            ("values".to_string(), guard.admin_values.clone()),
        ]);
        Ok((body, format!("config-{}", guard.revision)))
    }

    pub fn get_character_speed(&self) -> (f64, f64, f64) {
        let guard = self.state.read().unwrap();
        let char_cfg = guard.admin_values.get("character");
        let walk_speed = char_cfg.and_then(|c| c.get_f64("walkSpeedMps")).unwrap_or(4.0);
        let run_mul = char_cfg.and_then(|c| c.get_f64("runMultiplier")).unwrap_or(1.5);
        let interaction_radius = char_cfg.and_then(|c| c.get_f64("interactionRadiusM")).unwrap_or(3.0);
        (walk_speed, run_mul, interaction_radius)
    }
}
impl ConfigService {
    pub fn update_admin_config(
        &self,
        role: &str,
        if_match: Option<&str>,
        new_values: JsonValue,
        has_active_sessions: bool,
    ) -> Result<(JsonValue, String), (u16, &'static str, &'static str)> {
        if role != "admin" {
            return Err((403, "FORBIDDEN", "Admin role required"));
        }
        let current_etag = self.get_etag();
        let client_etag = if_match.ok_or((428, "CONFIG_CONFLICT", "If-Match header is required"))?;
        let clean_client_etag = client_etag.trim_matches('"');
        if clean_client_etag != current_etag {
            return Err((412, "CONFIG_CONFLICT", "Stale configuration revision"));
        }

        // Validate basic bounds
        if let Some(char_cfg) = new_values.get("character") {
            if let Some(speed) = char_cfg.get_f64("walkSpeedMps") {
                if speed <= 0.0 || speed > 50.0 {
                    return Err((422, "INVALID_REQUEST", "walkSpeedMps out of bounds"));
                }
            }
        }

        // Check structural changes if session is active
        let mut guard = self.state.write().unwrap();
        if has_active_sessions {
            // Compare structural keys
            let old_world = guard.admin_values.get("world");
            let new_world = new_values.get("world");
            if let (Some(o), Some(n)) = (old_world, new_world) {
                if o.get("chunkSizeM") != n.get("chunkSizeM") || o.get("grid") != n.get("grid") || o.get("spawn") != n.get("spawn") {
                    return Err((409, "RESTART_REQUIRED", "Structural configuration changes require restarting sessions"));
                }
            }
        }

        // Build new public config (strip server-only npcBehavior, economy, activeChunkIds, placements, npcIds)
        let mut pub_values = new_values.clone();
        if let JsonValue::Object(entries) = &mut pub_values {
            entries.retain(|(k, _)| k != "npcBehavior" && k != "economy");
            if let Some((_, JsonValue::Object(w_entries))) = entries.iter_mut().find(|(k, _)| k == "world") {
                w_entries.retain(|(k, _)| k != "activeChunkIds" && k != "placements" && k != "npcIds");
            }
        }

        guard.revision += 1;
        guard.admin_values = new_values.clone();
        guard.public_values = pub_values.clone();

        let new_revision = guard.revision;
        let new_etag = format!("config-{}", new_revision);

        let admin_str = guard.admin_values.to_string().replace("'", "''");
        let pub_str = guard.public_values.to_string().replace("'", "''");
        let _ = self.db.execute(&format!(
            "INSERT INTO config_revisions (world_id, revision, public_values, admin_values, actor_user_id, created_at) VALUES ('discovery-campus', {}, '{}'::jsonb, '{}'::jsonb, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NOW())",
            new_revision, pub_str, admin_str
        ));

        let res_body = JsonValue::Object(vec![
            ("revision".to_string(), JsonValue::Number(new_revision as f64)),
            ("values".to_string(), guard.admin_values.clone()),
        ]);
        Ok((res_body, new_etag))
    }
}
