# tools/verify_all.py: Comprehensive validation suite for Discovery Knowledge Base
import os
import json
import hashlib
import ssl
import urllib.request
import subprocess

print("=== 1. Checking Knowledge Pack files and Manifest ===")
pack_dir = "assets/knowledge_pack/v1"
manifest_path = os.path.join(pack_dir, "manifest.json")
assert os.path.exists(manifest_path), "manifest.json missing!"

with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)

for rel_path, expected_sha in manifest["files"].items():
    fp = os.path.join(pack_dir, rel_path)
    assert os.path.exists(fp), f"File {rel_path} in manifest does not exist!"
    with open(fp, "rb") as f_in:
        actual_sha = hashlib.sha256(f_in.read()).hexdigest()
    assert actual_sha == expected_sha, f"SHA mismatch for {rel_path}!"
print(f"Manifest checksums OK ({len(manifest['files'])} files).")

print("=== 2. Checking Question Volumes and Content Quality ===")
for mod_id in ["math-basics", "informatics-basics", "history-basics", "flags-basics"]:
    cp = f"assets/content/{mod_id}.json"
    assert os.path.exists(cp), f"{cp} missing!"
    with open(cp, "r", encoding="utf-8") as f:
        data = json.load(f)
    qs = data["questions"]
    assert len(qs) >= 20, f"Module {mod_id} has {len(qs)} < 20 questions!"
    print(f"Module {mod_id}: {len(qs)} verified questions.")

    # Check 4 distinct options per question and valid answers
    for q in qs:
        q_obj = q["question"]
        opts = q_obj.get("options", [])
        if opts:
            assert len(opts) == 4, f"{q_obj['questionId']}: options count != 4"
            texts = [o["text"] for o in opts]
            assert len(set(texts)) == 4, f"{q_obj['questionId']}: non-unique options {texts}"

print("=== 3. Checking Math Programmatic Verification ===")
import sys
sys.path.append("tools/content_builder")
from math_data import verify_math_questions
assert verify_math_questions(), "Math verification failed!"
print("All math questions programmatically verified.")

print("=== 4. Checking Country Teacher Descriptions ===")
from flags_data import verify_teacher_descriptions, COUNTRIES
assert verify_teacher_descriptions(), "Teacher descriptions validation failed!"
assert len(COUNTRIES) >= 20, "Countries count < 20!"
print("All 20 country teacher descriptions strictly conform to 3-4 sentences and <=80 words.")

print("=== 5. Checking PostgreSQL 18 Database Tables ===")
cmd = [
    "docker", "exec", "discovery-postgres", "psql", "-U", "postgres", "-d", "discovery", "-t", "-A", "-c",
    "SELECT count(*) FROM sources UNION ALL SELECT count(*) FROM knowledge_modules UNION ALL SELECT count(*) FROM knowledge_facts UNION ALL SELECT count(*) FROM knowledge_countries UNION ALL SELECT count(*) FROM knowledge_questions;"
]
res = subprocess.run(cmd, capture_output=True, text=True)
assert res.returncode == 0, f"Postgres query failed: {res.stderr}"
counts = [int(x) for x in res.stdout.strip().split("\n") if x]
print("Postgres table counts:", counts)
assert counts[0] >= 7, "sources count < 7"
assert counts[1] >= 4, "modules count < 4"
assert counts[2] >= 100, "facts count < 100"
assert counts[3] >= 20, "countries count < 20"
assert counts[4] >= 80, "questions count < 80"
print("Postgres database verification passed!")

print("=== 6. Checking Live Discovery HTTP API Endpoints ===")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test modules endpoint
req_mod = urllib.request.Request("https://localhost/api/v2/worlds/discovery-campus/education/modules", headers={"X-Discovery-Protocol": "2.0.0"})
with urllib.request.urlopen(req_mod, context=ctx) as r:
    assert r.status == 200, f"Modules returned {r.status}"
    mod_data = json.loads(r.read().decode("utf-8"))
    assert len(mod_data["modules"]) == 4, f"Expected 4 modules, got {len(mod_data['modules'])}"
print("Live /education/modules OK (4 modules).")

# Test country card endpoint
req_country = urllib.request.Request("https://localhost/api/v2/worlds/discovery-campus/countries/country-jp", headers={"X-Discovery-Protocol": "2.0.0"})
with urllib.request.urlopen(req_country, context=ctx) as r:
    assert r.status == 200, f"Country returned {r.status}"
    country_data = json.loads(r.read().decode("utf-8"))
    assert country_data["countryId"] == "country-jp"
    assert len(country_data["descriptionSentences"]) in (3, 4)
print("Live /countries/{countryId} OK (teacher description delivered).")

# Test library books endpoint
req_books = urllib.request.Request("https://localhost/api/v2/worlds/discovery-campus/library/books", headers={"X-Discovery-Protocol": "2.0.0"})
with urllib.request.urlopen(req_books, context=ctx) as r:
    assert r.status == 200, f"Books returned {r.status}"
    books_data = json.loads(r.read().decode("utf-8"))
    assert len(books_data["books"]) == 4
print("Live /library/books OK (4 books).")
print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
