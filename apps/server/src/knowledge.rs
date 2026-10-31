// knowledge.rs: Local Versioned Knowledge Base, Country Teacher and Quiz Evaluator
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use crate::db::DbPool;
use crate::json::{parse_json, JsonValue};

#[derive(Debug, Clone)]
pub struct QuestionOpt {
    pub option_id: String,
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct KnowledgeQuestion {
    pub question_id: String,
    pub question_family_id: String,
    pub module_id: String,
    pub content_version: String,
    pub kind: String,
    pub prompt: String,
    pub options: Vec<QuestionOpt>,
    pub correct_option_id: Option<String>,
    pub accepted_values: Vec<String>,
    pub explanation: String,
    pub flag_asset_sha: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CountryCard {
    pub country_id: String,
    pub name_ru: String,
    pub description_sentences: Vec<String>,
    pub fact_ids: Vec<String>,
    pub content_version: String,
    pub flag_asset_id: String,
    pub accepted_names: Vec<String>,
}

pub struct KnowledgeService {
    db: DbPool,
    cached_countries: Mutex<HashMap<String, CountryCard>>,
    cached_packs: Mutex<HashMap<String, Vec<KnowledgeQuestion>>>,
}

impl KnowledgeService {
    pub fn new(db: DbPool) -> Self {
        let svc = Self {
            db,
            cached_countries: Mutex::new(HashMap::new()),
            cached_packs: Mutex::new(HashMap::new()),
        };
        svc.load_local_data();
        svc
    }
}

impl KnowledgeService {
    fn load_local_data(&self) {
        // Load countries from package / assets
        let country_paths = [
            "assets/knowledge_pack/v1/countries.json",
            "assets/content/countries.json",
        ];
        for cp in &country_paths {
            if let Ok(content) = std::fs::read_to_string(cp) {
                if let Ok(json) = parse_json(&content) {
                    if let Some(arr) = json.get("countries").and_then(|c| c.as_array()) {
                        let mut map = self.cached_countries.lock().unwrap();
                        for item in arr {
                            let pub_val = match item.get("public") { Some(p) => p, None => continue };
                            let cid = pub_val.get_str("countryId").unwrap_or("").to_string();
                            let name_ru = pub_val.get_str("nameRu").unwrap_or("").to_string();
                            let cv = pub_val.get_str("contentVersion").unwrap_or("v1").to_string();
                            let sents = pub_val.get("descriptionSentences").and_then(|s| s.as_array())
                                .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                                .unwrap_or_default();
                            let fids = pub_val.get("factIds").and_then(|f| f.as_array())
                                .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                                .unwrap_or_default();
                            let flag_id = item.get_str("flagAssetId").unwrap_or("").to_string();
                            let acc = item.get("acceptedNames").and_then(|a| a.as_array())
                                .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                                .unwrap_or_default();
                            map.insert(cid.clone(), CountryCard {
                                country_id: cid, name_ru, description_sentences: sents,
                                fact_ids: fids, content_version: cv, flag_asset_id: flag_id, accepted_names: acc,
                            });
                        }
                    }
                }
                break;
            }
        }
    }

    pub fn get_modules(&self) -> JsonValue {
        let content = std::fs::read_to_string("assets/education/modules.json")
            .or_else(|_| std::fs::read_to_string("assets/knowledge_pack/v1/modules.json"))
            .unwrap_or_else(|_| "{\"modules\":[]}".to_string());
        parse_json(&content).unwrap_or(JsonValue::Null)
    }
}

impl KnowledgeService {
    pub fn get_country_description(&self, country_id: &str) -> Option<JsonValue> {
        let guard = self.cached_countries.lock().unwrap();
        if let Some(card) = guard.get(country_id) {
            let sents_json: Vec<JsonValue> = card.description_sentences.iter().map(|s| JsonValue::String(s.clone())).collect();
            let fids_json: Vec<JsonValue> = card.fact_ids.iter().map(|f| JsonValue::String(f.clone())).collect();
            return Some(JsonValue::Object(vec![
                ("countryId".to_string(), JsonValue::String(card.country_id.clone())),
                ("nameRu".to_string(), JsonValue::String(card.name_ru.clone())),
                ("descriptionSentences".to_string(), JsonValue::Array(sents_json)),
                ("factIds".to_string(), JsonValue::Array(fids_json)),
                ("contentVersion".to_string(), JsonValue::String(card.content_version.clone())),
                ("synthetic".to_string(), JsonValue::Bool(false)),
            ]));
        }
        None
    }

    pub fn get_module_material(&self, module_id: &str, _content_version: &str) -> Option<JsonValue> {
        let path = format!("assets/content/{}.json", module_id);
        let content = std::fs::read_to_string(&path).ok()?;
        let val = parse_json(&content).ok()?;
        val.get("material").cloned()
    }
}

impl KnowledgeService {
    pub fn get_module_questions(&self, module_id: &str) -> Vec<KnowledgeQuestion> {
        let mut guard = self.cached_packs.lock().unwrap();
        if let Some(list) = guard.get(module_id) {
            return list.clone();
        }

        let mut questions = Vec::new();
        let path = format!("assets/content/{}.json", module_id);
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(val) = parse_json(&content) {
                if let Some(q_arr) = val.get("questions").and_then(|q| q.as_array()) {
                    for item in q_arr {
                        let q_inner = match item.get("question") { Some(q) => q, None => continue };
                        let q_id = q_inner.get_str("questionId").unwrap_or("").to_string();
                        let kind = q_inner.get_str("kind").unwrap_or("single_choice").to_string();
                        let prompt = q_inner.get_str("prompt").unwrap_or("").to_string();
                        let fam_id = item.get_str("questionFamilyId").unwrap_or(&q_id).to_string();
                        let mut options = Vec::new();
                        if let Some(opt_arr) = q_inner.get("options").and_then(|o| o.as_array()) {
                            for opt in opt_arr {
                                options.push(QuestionOpt {
                                    option_id: opt.get_str("optionId").unwrap_or("").to_string(),
                                    text: opt.get_str("text").unwrap_or("").to_string(),
                                });
                            }
                        }
                        let correct_opt = item.get_str("correctOptionId").map(|s| s.to_string());
                        let exp = item.get_str("explanation").unwrap_or("").to_string();
                        let mut acc_vals = Vec::new();
                        if let Some(ak) = item.get("answerKey") {
                            if let Some(av) = ak.get("acceptedValues").and_then(|a| a.as_array()) {
                                for v in av {
                                    if let Some(s) = v.as_str() {
                                        acc_vals.push(s.to_string());
                                    }
                                }
                            }
                        }
                        let flag_sha = q_inner.get("image").and_then(|img| img.get_str("sha256")).map(|s| s.to_string());

                        questions.push(KnowledgeQuestion {
                            question_id: q_id, question_family_id: fam_id, module_id: module_id.to_string(),
                            content_version: "v1".to_string(), kind, prompt, options, correct_option_id: correct_opt,
                            accepted_values: acc_vals, explanation: exp, flag_asset_sha: flag_sha,
                        });
                    }
                }
            }
        }
        guard.insert(module_id.to_string(), questions.clone());
        questions
    }
}

impl KnowledgeService {
    pub fn select_attempt_questions(&self, module_id: &str, count: usize, already_shown_families: &HashSet<String>) -> Result<Vec<KnowledgeQuestion>, &'static str> {
        let all = self.get_module_questions(module_id);
        let mut selected = Vec::new();
        let mut used_families = already_shown_families.clone();

        for q in all {
            if !used_families.contains(&q.question_family_id) {
                used_families.insert(q.question_family_id.clone());
                selected.push(q);
                if selected.len() >= count {
                    break;
                }
            }
        }

        if selected.len() < count {
            return Err("INSUFFICIENT_CONTENT");
        }
        Ok(selected)
    }

    pub fn evaluate_answer(&self, question: &KnowledgeQuestion, submitted_val: &str) -> (bool, String) {
        let sub_trimmed = submitted_val.trim().to_lowercase();
        if question.kind == "single_choice" {
            if let Some(corr) = &question.correct_option_id {
                let is_corr = corr.to_lowercase() == sub_trimmed || question.options.iter().any(|o| o.option_id == *corr && o.text.trim().to_lowercase() == sub_trimmed);
                return (is_corr, question.explanation.clone());
            }
        } else if question.kind == "flag_country" || question.kind == "short_text" {
            for acc in &question.accepted_values {
                if acc.trim().to_lowercase() == sub_trimmed {
                    return (true, question.explanation.clone());
                }
            }
            if let Some(corr) = &question.correct_option_id {
                if corr.to_lowercase() == sub_trimmed {
                    return (true, question.explanation.clone());
                }
            }
        }
        (false, question.explanation.clone())
    }
}
