# tools/content_builder/import_pack.py: Offline Idempotent Importer for PostgreSQL 18
import os
import json
import hashlib
import subprocess

PACK_DIR = "assets/knowledge_pack/v1"

def verify_manifest():
    manifest_path = os.path.join(PACK_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for rel_path, expected_sha in data["files"].items():
        fp = os.path.join(PACK_DIR, rel_path)
        if not os.path.exists(fp):
            raise FileNotFoundError(f"Missing file in pack: {rel_path}")
        with open(fp, "rb") as f:
            actual_sha = hashlib.sha256(f.read()).hexdigest()
        if actual_sha != expected_sha:
            raise ValueError(f"Checksum mismatch for {rel_path}: expected {expected_sha}, got {actual_sha}")
    print(f"Manifest verified: all {len(data['files'])} files intact.")

def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def esc_arr(arr):
    if not arr:
        return "'{}'::text[]"
    items = [f'"{str(x).replace(chr(34), chr(92) + chr(34))}"' for x in arr]
    return "'{" + ",".join(items) + "}'::text[]"
def generate_sql():
    sql = ["BEGIN;"]

    # 1. Sources
    with open(os.path.join(PACK_DIR, "sources.json"), "r", encoding="utf-8") as f:
        sources = json.load(f)["sources"]
    for s in sources:
        sql.append(f"""
INSERT INTO sources (source_id, title, url, retrieved_at, revision, license, local_path, sha256, status, synthetic, section, author, attribution_text)
VALUES ({esc(s['sourceId'])}, {esc(s['title'])}, {esc(s['url'])}, {esc(s['retrievedAt'])}, {esc(s['revision'])}, {esc(s['license'])}, {esc(s['localPath'])}, {esc(s['sha256'])}, {esc(s['status'])}, {str(s['synthetic']).lower()}, {esc(s.get('section'))}, {esc(s.get('author'))}, {esc(s.get('attributionText'))})
ON CONFLICT (source_id) DO UPDATE SET title = EXCLUDED.title, sha256 = EXCLUDED.sha256, license = EXCLUDED.license;
""")

    # 2. Modules
    with open(os.path.join(PACK_DIR, "modules.json"), "r", encoding="utf-8") as f:
        modules = json.load(f)["modules"]
    for m in modules:
        sql.append(f"""
INSERT INTO knowledge_modules (module_id, content_version, subject, title, teacher_id, examiner_id, status)
VALUES ({esc(m['moduleId'])}, {esc(m['contentVersion'])}, {esc(m['subject'])}, {esc(m['title'])}, {esc(m['teacherId'])}, {esc(m['examinerId'])}, 'published')
ON CONFLICT (module_id, content_version) DO UPDATE SET title = EXCLUDED.title, subject = EXCLUDED.subject;
""")

    # 3. Facts
    with open(os.path.join(PACK_DIR, "facts.json"), "r", encoding="utf-8") as f:
        facts = json.load(f)["facts"]
    for fact in facts:
        sql.append(f"""
INSERT INTO knowledge_facts (fact_id, module_id, content_version, concept_id, text, source_ids, status)
VALUES ({esc(fact['factId'])}, {esc(fact['moduleId'])}, {esc(fact['contentVersion'])}, {esc(fact.get('conceptId'))}, {esc(fact['text'])}, {esc_arr(fact['sourceIds'])}, {esc(fact['status'])})
ON CONFLICT (fact_id, content_version) DO UPDATE SET text = EXCLUDED.text, source_ids = EXCLUDED.source_ids;
""")

    # 4. Assets
    with open(os.path.join(PACK_DIR, "assets.json"), "r", encoding="utf-8") as f:
        assets = json.load(f)["assets"]
    for a in assets:
        sql.append(f"""
INSERT INTO knowledge_assets (asset_id, sha256, byte_size, url, media_type, width, height, alt, local_path, source_id, license)
VALUES ({esc(a['assetId'])}, {esc(a['sha256'])}, {a['byteSize']}, {esc(a['url'])}, {esc(a['mediaType'])}, {a['width']}, {a['height']}, {esc(a['alt'])}, {esc(a['localPath'])}, {esc(a['sourceId'])}, {esc(a['license'])})
ON CONFLICT (asset_id) DO UPDATE SET sha256 = EXCLUDED.sha256, url = EXCLUDED.url;
""")
    # 5. Countries
    with open(os.path.join(PACK_DIR, "countries.json"), "r", encoding="utf-8") as f:
        countries = json.load(f)["countries"]
    for c in countries:
        pub = c["public"]
        desc_json = esc(json.dumps(pub["descriptionSentences"], ensure_ascii=False))
        sql.append(f"""
INSERT INTO knowledge_countries (country_id, content_version, wikidata_id, name_ru, accepted_names, capital_ru, description_sentences, fact_ids, flag_asset_id, flag_visible_elements, source_ids, status, synthetic)
VALUES ({esc(pub['countryId'])}, {esc(pub['contentVersion'])}, {esc(c.get('wikidataId'))}, {esc(pub['nameRu'])}, {esc_arr(c['acceptedNames'])}, {esc(c.get('capitalRu'))}, {desc_json}::jsonb, {esc_arr(pub['factIds'])}, {esc(c['flagAssetId'])}, {esc(c.get('flagVisibleElements'))}, {esc_arr(c['sourceIds'])}, 'published', {str(pub['synthetic']).lower()})
ON CONFLICT (country_id, content_version) DO UPDATE SET name_ru = EXCLUDED.name_ru, description_sentences = EXCLUDED.description_sentences, flag_asset_id = EXCLUDED.flag_asset_id;
""")

    # 6. Questions and Options
    with open(os.path.join(PACK_DIR, "questions.json"), "r", encoding="utf-8") as f:
        questions = json.load(f)["questions"]
    for q_item in questions:
        q = q_item["question"]
        q_id = q["questionId"]
        kind = q["kind"]
        prompt = q["prompt"]
        flag_asset_id = q.get("image", {}).get("assetId") if kind == "flag_country" else None
        module_id = "flags-basics" if kind == "flag_country" else ("math-basics" if "math" in q_id else ("informatics-basics" if "info" in q_id else "history-basics"))
        ans_key_json = esc(json.dumps(q_item["answerKey"], ensure_ascii=False))

        sql.append(f"""
INSERT INTO knowledge_questions (question_id, question_family_id, module_id, content_version, kind, prompt, flag_asset_id, source_ids, fact_ids, answer_key, correct_option_id, explanation, difficulty, review_topic, status)
VALUES ({esc(q_id)}, {esc(q_item['questionFamilyId'])}, {esc(module_id)}, 'v1', {esc(kind)}, {esc(prompt)}, {esc(flag_asset_id)}, {esc_arr(q_item['sourceIds'])}, {esc_arr(q_item.get('factIds', []))}, {ans_key_json}::jsonb, {esc(q_item.get('correctOptionId'))}, {esc(q_item['explanation'])}, {esc(q_item.get('difficulty', 'basic'))}, {esc(q_item.get('reviewTopic'))}, 'published')
ON CONFLICT (question_id, content_version) DO UPDATE SET prompt = EXCLUDED.prompt, answer_key = EXCLUDED.answer_key, explanation = EXCLUDED.explanation;
""")
        for idx, opt in enumerate(q.get("options", [])):
            sql.append(f"""
INSERT INTO knowledge_question_options (question_id, content_version, option_id, text, ordinal)
VALUES ({esc(q_id)}, 'v1', {esc(opt['optionId'])}, {esc(opt['text'])}, {idx})
ON CONFLICT (question_id, content_version, option_id) DO UPDATE SET text = EXCLUDED.text;
""")

    sql.append("COMMIT;")
    return "\n".join(sql)

def run_import():
    verify_manifest()
    sql_text = generate_sql()
    sql_file = "assets/knowledge_pack/v1/import.sql"
    with open(sql_file, "w", encoding="utf-8") as f:
        f.write(sql_text)
    print(f"Generated import script: {sql_file}")

    # Apply via docker postgres
    cmd = ["docker", "exec", "-i", "discovery-postgres", "psql", "-U", "postgres", "-d", "discovery"]
    res = subprocess.run(cmd, input=sql_text.encode("utf-8"), capture_output=True)
    if res.returncode != 0:
        print("SQL execution error:", res.stderr.decode("utf-8", errors="replace"))
        raise RuntimeError("Database import failed")
    print("Database import completed successfully!")

if __name__ == "__main__":
    run_import()
