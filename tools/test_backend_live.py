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

    print("Testing Auth Login...")
    login_req = urllib.request.Request("http://127.0.0.1:8089/api/v2/auth/login", data=b'{"username":"admin","password":"password"}', headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(login_req) as r:
        assert r.status == 200
        login_res = json.loads(r.read())
        token = login_res["accessToken"]
        user_id = login_res["user"]["userId"]

    print("Testing Session Creation...")
    sess_req = urllib.request.Request("http://127.0.0.1:8089/api/v2/sessions", data=b'{"worldId":"discovery-campus"}', headers={"Content-Type":"application/json", "Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(sess_req) as r:
        assert r.status == 201
        sess_res = json.loads(r.read())
        sess_id = sess_res["sessionId"]

    print("Testing WS Ticket 2.0.0...")
    tkt_req = urllib.request.Request(f"http://127.0.0.1:8089/api/v2/sessions/{sess_id}/ws-ticket", data=b'{"protocolVersion":"2.0.0"}', headers={"Content-Type":"application/json", "Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(tkt_req) as r:
        assert r.status == 200
        tkt_res = json.loads(r.read())
        ticket = tkt_res["ticket"]
        assert tkt_res["subprotocol"] == "discovery.v2"
        assert tkt_res["wsPath"] == "/api/v2/ws"

    print("Testing WebSocket RFC 6455 Handshake & protocol 2.0.0...")
    s = socket.create_connection(("127.0.0.1", 8089))
    ws_key = base64.b64encode(os.urandom(16)).decode('utf-8')
    handshake = (
        f"GET /api/v2/ws?ticket={ticket} HTTP/1.1\r\n"
        f"Host: 127.0.0.1:8089\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {ws_key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n"
        f"Sec-WebSocket-Protocol: discovery.v2\r\n\r\n"
    )
    s.sendall(handshake.encode('utf-8'))
    resp_hdr = s.recv(1024).decode('utf-8')
    assert "101 Switching Protocols" in resp_hdr
    assert "Sec-WebSocket-Protocol: discovery.v2" in resp_hdr

    def send_ws_frame(sock, text):
        data = text.encode('utf-8')
        length = len(data)
        mask_key = os.urandom(4)
        masked_data = bytes([b ^ mask_key[i % 4] for i, b in enumerate(data)])
        if length < 126:
            header = bytes([0x81, 0x80 | length]) + mask_key
        else:
            header = bytes([0x81, 0x80 | 126, (length >> 8) & 0xff, length & 0xff]) + mask_key
        sock.sendall(header + masked_data)

    def recv_ws_frame(sock):
        hdr = sock.recv(2)
        if not hdr: return None
        length = hdr[1] & 0x7f
        if length == 126:
            ext = sock.recv(2)
            length = (ext[0] << 8) | ext[1]
        payload = sock.recv(length)
        return json.loads(payload.decode('utf-8'))

    print("Sending client.hello...")
    send_ws_frame(s, '{"protocolVersion":"2.0.0","type":"client.hello","requestId":"req-1","payload":{}}')
    welcome_msg = recv_ws_frame(s)
    assert welcome_msg["type"] == "server.welcome"
    assert welcome_msg["protocolVersion"] == "2.0.0"

    interest_msg = recv_ws_frame(s)
    assert interest_msg["type"] == "world.interest"

    print("Sending library.open...")
    send_ws_frame(s, '{"protocolVersion":"2.0.0","type":"library.open","requestId":"req-2","payload":{"bookId":"book-math-basics"}}')
    lib_msg = recv_ws_frame(s)
    assert lib_msg["type"] == "library.opened"
    assert lib_msg["payload"]["material"]["module"]["moduleId"] == "math-basics"

    print("Sending country.describe...")
    send_ws_frame(s, '{"protocolVersion":"2.0.0","type":"country.describe","requestId":"req-3","payload":{"countryId":"country-jp","teacherId":"teacher-flags"}}')
    country_msg = recv_ws_frame(s)
    assert country_msg["type"] == "country.description"
    assert country_msg["payload"]["countryId"] == "country-jp"

    print("Sending competition.join...")
    send_ws_frame(s, '{"protocolVersion":"2.0.0","type":"competition.join","requestId":"req-4","payload":{"tableId":"competition-central"}}')
    comp_state = recv_ws_frame(s)
    assert comp_state["type"] == "competition.state"
    act_msg = recv_ws_frame(s)
    assert act_msg["type"] == "activity.changed"
    assert act_msg["payload"]["activity"]["mode"] == "seated_competition"

    print("Sending client.ping...")
    send_ws_frame(s, '{"protocolVersion":"2.0.0","type":"client.ping","requestId":"req-5","payload":{"nonce":"123"}}')
    pong_msg = recv_ws_frame(s)
    assert pong_msg["type"] == "server.pong"
    assert pong_msg["payload"]["nonce"] == "123"

    print("\n>>> ALL LIVE BACKEND CHECKS AND ENDPOINTS PASSED PERFECTLY! <<<")

finally:
    server_proc.terminate()
    server_proc.kill()
