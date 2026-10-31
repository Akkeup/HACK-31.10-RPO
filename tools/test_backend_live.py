# tools/test_backend_live.py: End-to-end verification of Discovery backend
import os
import json
import hashlib
import sys
import time
import socket
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

    for q in qs:
        q_obj = q["question"]
        opts = q_obj.get("options", [])
        if opts:
            assert len(opts) == 4, f"{q_obj['questionId']}: options count != 4"
            texts = [o["text"] for o in opts]
            assert len(set(texts)) == 4, f"{q_obj['questionId']}: non-unique options {texts}"

print("=== 3. Checking Math Programmatic Verification ===")
sys.path.append("tools/content_builder")
from math_data import verify_math_questions
assert verify_math_questions(), "Math verification failed!"
print("All math questions programmatically verified.")

print("=== 4. Checking Country Teacher Descriptions ===")
from flags_data import verify_teacher_descriptions, COUNTRIES
assert verify_teacher_descriptions(), "Teacher descriptions validation failed!"
assert len(COUNTRIES) >= 20, "Countries count < 20!"
print("All 20 country teacher descriptions strictly conform to 3-4 sentences and <=80 words.")

print("=== 5. Starting discovery-server for HTTP and WebSocket tests ===")
import urllib.request
import base64

env = os.environ.copy()
env["PORT"] = "8089"
env["DB_HOST"] = "127.0.0.1"

server_proc = subprocess.Popen(["apps/server/discovery-server.exe"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(1.0)

try:
    print("Testing /health/live and /health/ready...")
    with urllib.request.urlopen("http://127.0.0.1:8089/health/live") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert d["status"] == "pass"

    print("Testing /api/v2/bootstrap...")
    with urllib.request.urlopen("http://127.0.0.1:8089/api/v2/bootstrap") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert "2.0.0" in d["protocolVersions"]
        assert "discovery-campus" in d["worldIds"]

    print("Testing /api/v2/worlds/discovery-campus/education/modules...")
    with urllib.request.urlopen("http://127.0.0.1:8089/api/v2/worlds/discovery-campus/education/modules") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert len(d["modules"]) == 4

    print("Testing /api/v2/worlds/discovery-campus/countries/country-jp...")
    with urllib.request.urlopen("http://127.0.0.1:8089/api/v2/worlds/discovery-campus/countries/country-jp") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert d["countryId"] == "country-jp"
        assert len(d["descriptionSentences"]) in (3, 4)

    print("Testing /api/v2/worlds/discovery-campus/library/books...")
    with urllib.request.urlopen("http://127.0.0.1:8089/api/v2/worlds/discovery-campus/library/books") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert len(d["books"]) == 4

    print("Testing /api/v2/worlds/discovery-campus/config...")
    with urllib.request.urlopen("http://127.0.0.1:8089/api/v2/worlds/discovery-campus/config") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert "readingRoom" in d["values"]
        assert "economy" not in d["values"]
        assert "npcBehavior" not in d["values"]
        assert len(d["values"]["gameplay"]["competition"]["tables"][0]["subjects"]) == 4

    print("Testing /api/v2/worlds/discovery-campus/manifest...")
    with urllib.request.urlopen("http://127.0.0.1:8089/api/v2/worlds/discovery-campus/manifest") as r:
        assert r.status == 200
        d = json.loads(r.read())
        assert d["cacheBudgetBytes"] > 0
        assert d["totalWorldBytes"] >= d["cacheBudgetBytes"]
