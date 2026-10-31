# tools/content_builder/build_pack.py: Assembles and validates the Discovery Knowledge Pack v1
import os
import json
import hashlib
from sources_data import SOURCES
from math_data import MODULE_MATH, MATH_FACTS, MATH_QUESTIONS, verify_math_questions
from informatics_data import MODULE_INFORMATICS, INFORMATICS_FACTS, INFORMATICS_QUESTIONS
from history_data import MODULE_HISTORY, HISTORY_FACTS, HISTORY_QUESTIONS
from flags_data import MODULE_FLAGS, COUNTRIES, verify_teacher_descriptions

OUT_DIR = "assets/knowledge_pack/v1"
ASSETS_DIR = os.path.join(OUT_DIR, "assets")
WORLD_ASSETS_DIR = "assets/world/resources"

os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(WORLD_ASSETS_DIR, exist_ok=True)
os.makedirs("assets/content", exist_ok=True)
os.makedirs("assets/education", exist_ok=True)

print("Verifying math questions...")
assert verify_math_questions()
print("Verifying teacher descriptions...")
assert verify_teacher_descriptions()

# Generate flag assets with opaque assetId and SHA-256
assets_list = []
country_records = []
flag_questions = []

for idx, c in enumerate(COUNTRIES, start=1):
    opaque_asset_id = f"flag-asset-{idx:02d}"
    svg_bytes = c["svg"].encode("utf-8")
    sha = hashlib.sha256(svg_bytes).hexdigest()
    byte_size = len(svg_bytes)

    # Save to package assets and world resources
    with open(os.path.join(ASSETS_DIR, f"{sha}.svg"), "wb") as f:
        f.write(svg_bytes)
    with open(os.path.join(WORLD_ASSETS_DIR, sha), "wb") as f:
        f.write(svg_bytes)

    asset_rec = {
        "assetId": opaque_asset_id,
        "sha256": sha,
        "byteSize": byte_size,
        "url": f"/api/v2/worlds/discovery-campus/assets/{sha}",
        "mediaType": "image/svg+xml",
        "width": 900,
        "height": 600,
        "alt": "Флаг страны для вопроса",
        "localPath": f"assets/{sha}.svg",
        "sourceId": "source-wikimedia-commons-flags",
        "license": "Public Domain / CC0-1.0"
    }
    assets_list.append(asset_rec)

    # Country private record
    c_private = {
        "public": {
            "countryId": c["countryId"],
            "nameRu": c["nameRu"],
            "descriptionSentences": c["descriptionSentences"],
            "factIds": c["factIds"],
            "contentVersion": "v1",
            "synthetic": False
        },
        "wikidataId": c["wikidataId"],
        "acceptedNames": c["acceptedNames"],
        "capitalRu": c["capitalRu"],
        "flagAssetId": opaque_asset_id,
        "flagVisibleElements": c["flagVisibleElements"],
        "sourceIds": ["source-wikidata-country-dump", "source-wikimedia-commons-flags"]
    }
    country_records.append(c_private)

    # Flag country question
    q_id = f"flag-q{idx:02d}"
    fam_id = f"flag-fam-{c['countryId']}"
    # 4 distinct country options: 1 correct + 3 distractors
    options = [
        {"optionId": "opt-1", "text": c["nameRu"]},
        {"optionId": "opt-2", "text": c["distractors"][0]},
        {"optionId": "opt-3", "text": c["distractors"][1]},
        {"optionId": "opt-4", "text": c["distractors"][2]},
    ]
    # Verify 4 distinct option texts
    opt_texts = [o["text"] for o in options]
    assert len(set(opt_texts)) == 4, f"Options not unique for {q_id}: {opt_texts}"

    flag_q = {
        "question": {
            "questionId": q_id,
            "kind": "flag_country",
            "prompt": "Какой стране принадлежит этот флаг?",
            "image": {
                "assetId": opaque_asset_id,
                "sha256": sha,
                "byteSize": byte_size,
                "url": f"/api/v2/worlds/discovery-campus/assets/{sha}",
                "mediaType": "image/svg+xml",
                "width": 900,
                "height": 600,
                "alt": "Флаг страны для вопроса"
            },
            "options": options
        },
        "questionFamilyId": fam_id,
        "sourceIds": ["source-wikimedia-commons-flags", "source-wikidata-country-dump"],
        "factIds": c["factIds"],
        "correctOptionId": "opt-1",
        "answerKey": {
            "acceptedValues": c["acceptedNames"],
            "caseSensitive": False,
            "numericTolerance": 0,
            "rubricPoints": [],
            "graded": True
        },
        "explanation": f"Этот флаг принадлежит стране {c['nameRu']}. Особенности полотнища: {c['flagVisibleElements']}",
        "difficulty": "basic",
        "reviewTopic": "Флаги государств мира"
    }
    flag_questions.append(flag_q)

# Build country facts
country_facts = []
for c in COUNTRIES:
    country_facts.extend([
        {"factId": f"fact-{c['countryId'][8:]}-loc", "moduleId": "flags-basics", "contentVersion": "v1", "conceptId": "geography", "text": c["descriptionSentences"][0], "sourceIds": ["source-wikidata-country-dump"], "status": "published"},
        {"factId": f"fact-{c['countryId'][8:]}-cap", "moduleId": "flags-basics", "contentVersion": "v1", "conceptId": "capital", "text": c["descriptionSentences"][1], "sourceIds": ["source-wikidata-country-dump"], "status": "published"},
        {"factId": f"fact-{c['countryId'][8:]}-geo", "moduleId": "flags-basics", "contentVersion": "v1", "conceptId": "geography", "text": c["descriptionSentences"][2], "sourceIds": ["source-wikidata-country-dump"], "status": "published"},
        {"factId": f"fact-{c['countryId'][8:]}-flag", "moduleId": "flags-basics", "contentVersion": "v1", "conceptId": "flag", "text": c["descriptionSentences"][3], "sourceIds": ["source-wikimedia-commons-flags"], "status": "published"}
    ])

all_facts = MATH_FACTS + INFORMATICS_FACTS + HISTORY_FACTS + country_facts
all_modules = [MODULE_MATH, MODULE_INFORMATICS, MODULE_HISTORY, MODULE_FLAGS]

def normalize_q(q, mod_id):
    ans_key = q.get("answerKey")
    if not ans_key:
        corr_opt = next(o for o in q["options"] if o["optionId"] == q["correctOptionId"])
        ans_key = {"acceptedValues": [corr_opt["text"]], "caseSensitive": False, "numericTolerance": 0, "rubricPoints": [], "graded": True}
    return {
        "question": {
            "questionId": q["questionId"],
            "prompt": q["prompt"],
            "kind": "single_choice",
            "options": q["options"]
        },
        "questionFamilyId": q["questionFamilyId"],
        "sourceIds": ["source-math-arithmetic"] if "math" in mod_id else (["source-cs-unplugged"] if "info" in mod_id else ["source-ruwiki-hist-source", "source-ruwiki-chronology"]),
        "factIds": q["factIds"],
        "correctOptionId": q["correctOptionId"],
        "answerKey": ans_key,
        "explanation": q["explanation"],
        "difficulty": q.get("difficulty", "basic"),
        "reviewTopic": q.get("reviewTopic", "Базовый курс")
    }

normalized_math = [normalize_q(q, "math") for q in MATH_QUESTIONS]
normalized_info = [normalize_q(q, "info") for q in INFORMATICS_QUESTIONS]
normalized_hist = [normalize_q(q, "hist") for q in HISTORY_QUESTIONS]
all_questions = normalized_math + normalized_info + normalized_hist + flag_questions

# Write knowledge package files
def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

write_json(os.path.join(OUT_DIR, "sources.json"), {"sources": SOURCES})
write_json(os.path.join(OUT_DIR, "modules.json"), {"modules": all_modules})
write_json(os.path.join(OUT_DIR, "facts.json"), {"facts": all_facts})
write_json(os.path.join(OUT_DIR, "countries.json"), {"countries": country_records})
write_json(os.path.join(OUT_DIR, "assets.json"), {"assets": assets_list})
write_json(os.path.join(OUT_DIR, "questions.json"), {"questions": all_questions})

# Write individual subject content packs for server runtime in assets/content/
write_json("assets/content/math-basics.json", {
    "module": MODULE_MATH,
    "material": {"module": MODULE_MATH, "sections": [{"heading": "Арифметика", "text": "Основы сложения, вычитания, умножения и деления."}], "examples": ["2 + 3 = 5"], "keyPoints": ["Сначала умножение, затем сложение."]},
    "questions": normalized_math
})
write_json("assets/content/informatics-basics.json", {
    "module": MODULE_INFORMATICS,
    "material": {"module": MODULE_INFORMATICS, "sections": [{"heading": "Информатика", "text": "Двоичный код, биты и алгоритмы."}], "examples": ["101₂ = 5"], "keyPoints": ["Бит — наименьшая единица информации."]},
    "questions": normalized_info
})
write_json("assets/content/history-basics.json", {
    "module": MODULE_HISTORY,
    "material": {"module": MODULE_HISTORY, "sections": [{"heading": "Источники", "text": "Письменные и вещественные свидетельства прошлого."}], "examples": ["Летописи, монеты"], "keyPoints": ["Хронология изучает счет времени."]},
    "questions": normalized_hist
})
write_json("assets/content/flags-basics.json", {
    "module": MODULE_FLAGS,
    "material": {"module": MODULE_FLAGS, "sections": [{"heading": "Страны и флаги", "text": "Государственные флаги и географические сведения."}], "examples": ["Белый флаг с красным кругом — Япония."], "keyPoints": ["Каждая страна имеет уникальный флаг."]},
    "questions": flag_questions
})
write_json("assets/education/modules.json", {"modules": all_modules})

# Generate SHA-256 checksums manifest
manifest = {}
for root, _, files in os.walk(OUT_DIR):
    for fn in files:
        if fn == "manifest.json":
            continue
        fp = os.path.join(root, fn)
        rel = os.path.relpath(fp, OUT_DIR).replace("\\", "/")
        with open(fp, "rb") as f:
            manifest[rel] = hashlib.sha256(f.read()).hexdigest()

write_json(os.path.join(OUT_DIR, "manifest.json"), {
    "packageVersion": "v1.0.0",
    "createdAt": "2026-10-31T12:00:00Z",
    "accounting": "sha256-file-manifest",
    "files": manifest
})

print(f"Knowledge Pack v1 assembled successfully at {OUT_DIR}!")
print(f"Total sources: {len(SOURCES)}")
print(f"Total modules: {len(all_modules)}")
print(f"Total facts: {len(all_facts)}")
print(f"Total countries: {len(country_records)}")
print(f"Total questions: {len(all_questions)} (20 math, 20 info, 20 hist, 20 flags)")
print(f"Total flag assets: {len(assets_list)}")
print(f"Manifest contains {len(manifest)} verified files.")
