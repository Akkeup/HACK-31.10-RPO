#!/usr/bin/env python3
"""
Test Suite: Session Lifecycle, Reconnect, Grace Period, Concurrency, and Protocol 2.0.0
Covers all 8 required verification scenarios.
"""
import os
import sys
import time
import json
import base64
import socket
import urllib.request
import urllib.error

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_URL = "http://127.0.0.1:8080"

def http_req(path, method="GET", body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"X-Discovery-Protocol": "2.0.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            val = resp.read().decode("utf-8")
            return resp.status, json.loads(val) if val else None
    except urllib.error.HTTPError as e:
        val = e.read().decode("utf-8")
        return e.code, json.loads(val) if val else None

def login(username, password="password"):
    status, data = http_req("/api/v2/auth/login", method="POST", body={"username": username, "password": password})
    assert status == 200, f"Login failed for {username}: {data}"
    return data["accessToken"], data["user"]

class RawWsClient:
    def __init__(self, host, port, path, subprotocol="discovery.v2"):
        self.sock = socket.create_connection((host, port), timeout=5)
        key = base64.b64encode(os.urandom(16)).decode("utf-8")
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n"
            f"Sec-WebSocket-Protocol: {subprotocol}\r\n\r\n"
        )
        self.sock.sendall(handshake.encode("utf-8"))
        resp = self.sock.recv(4096).decode("utf-8", errors="ignore")
        assert "101 Switching Protocols" in resp, f"WS Upgrade failed: {resp}"
    def send_text(self, text):
        payload = text.encode("utf-8")
        mask = os.urandom(4)
        header = bytearray([0x81])
        length = len(payload)
        if length < 126:
            header.append(0x80 | length)
        else:
            header.append(0x80 | 126)
            header.extend(length.to_bytes(2, "big"))
        header.extend(mask)
        masked = bytearray(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(header + masked)

    def recv_text(self):
        b1, b2 = self.sock.recv(2)
        length = b2 & 0x7F
        if length == 126:
            length = int.from_bytes(self.sock.recv(2), "big")
        elif length == 127:
            length = int.from_bytes(self.sock.recv(8), "big")
        data = bytearray()
        while len(data) < length:
            chunk = self.sock.recv(length - len(data))
            if not chunk:
                break
            data.extend(chunk)
        return data.decode("utf-8", errors="ignore")

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass

def test_1_first_login(token):
    print("Test 1: Первый вход (First login)...")
    status, sess = http_req("/api/v2/sessions", method="POST", body={"worldId": "discovery-campus"}, token=token)
    assert status == 201, f"Expected 201 Created, got {status}: {sess}"
    assert "sessionId" in sess
    assert len(sess["players"]) == 1
    session_id = sess["sessionId"]
    print(f"  -> Session created: {session_id}, player: {sess['players'][0]['playerId']}")
    return session_id

def test_2_reentry_and_page_refresh(token, session_id):
    print("Test 2: Повторный вход и обновление страницы...")
    # Simulating client recovery: without sessionId, POST yields 409 with details
    status, err = http_req("/api/v2/sessions", method="POST", body={"worldId": "discovery-campus"}, token=token)
    assert status == 409, f"Expected 409, got {status}: {err}"
    assert err["code"] == "ALREADY_IN_SESSION"
    extracted_sid = next((d["reason"] for d in err.get("details", []) if d["path"] == "sessionId"), None)
    assert extracted_sid == session_id, f"Expected detail sessionId {session_id}, got {extracted_sid}"
    
    # Client resumes existing session
    status, sess = http_req(f"/api/v2/sessions/{session_id}/members/me", method="PUT", token=token)
    assert status == 200, f"Expected 200 OK, got {status}: {sess}"
    assert sess["sessionId"] == session_id
    assert len(sess["players"]) == 1
    print(f"  -> Successfully resumed session {session_id} without duplicate player or room.")
def test_3_reconnect_within_grace_period(token, session_id):
    print("Test 3: Reconnect до истечения grace period...")
    # Get WS ticket
    status, t_resp = http_req(f"/api/v2/sessions/{session_id}/ws-ticket", method="POST", body={"protocolVersion": "2.0.0"}, token=token)
    assert status == 200, f"Ticket failed: {t_resp}"
    ticket = t_resp["ticket"]

    # Connect WebSocket
    ws = RawWsClient("127.0.0.1", 8080, f"/api/v2/ws?ticket={ticket}")
    ws.send_text(json.dumps({"type": "client.hello", "clientSeq": 1, "payload": {"clientName": "TestClient"}}))
    welcome_raw = ws.recv_text()
    welcome = json.loads(welcome_raw)
    assert welcome["type"] == "server.welcome"
    orig_pid = welcome["payload"]["playerId"]
    print(f"  -> Connected WS. Player ID: {orig_pid}")

    # Disconnect WS
    ws.close()
    time.sleep(0.3)

    # Reconnect within grace period (< 60s)
    status, r_sess = http_req(f"/api/v2/sessions/{session_id}/members/me", method="PUT", token=token)
    assert status == 200
    assert r_sess["players"][0]["playerId"] == orig_pid
    print(f"  -> Reconnected before grace period expired. Player state retained.")

def test_4_and_5_grace_period_expiry_and_cleanup(token, session_id):
    print("Test 4 & 5: Вход после истечения grace period и очистка устаревших привязок...")
    # Wait for grace period to expire (server started with GRACE_PERIOD_MS=1500 for tests)
    print("  -> Waiting 2.2s for grace period expiry...")
    time.sleep(2.2)

    # Verify session list: empty room deleted
    status, list_resp = http_req("/api/v2/sessions", method="GET", token=token)
    assert status == 200
    assert isinstance(list_resp["sessions"], list)
    active_sids = [s["sessionId"] for s in list_resp["sessions"]]
    assert session_id not in active_sids, f"Stale session {session_id} should have been deleted"
    print(f"  -> Empty room and expired player cleaned up. Active sessions: {active_sids}")

    # Attempt to join old room -> 404 NOT_FOUND
    status, err = http_req(f"/api/v2/sessions/{session_id}/members/me", method="PUT", token=token)
    assert status == 404, f"Expected 404 for expired room, got {status}"

    # Creating new session should succeed with 201 Created (stale user_session mapping was cleared!)
    status, new_sess = http_req("/api/v2/sessions", method="POST", body={"worldId": "discovery-campus"}, token=token)
    assert status == 201, f"Expected 201 for fresh session, got {status}: {new_sess}"
    new_sid = new_sess["sessionId"]
    assert new_sid != session_id
    print(f"  -> New session created after grace period expiry: {new_sid}")
    return new_sid
def test_6_two_users_in_one_room(token1, token2, session_id):
    print("Test 6: Два разных пользователя в одной комнате...")
    status, sess = http_req(f"/api/v2/sessions/{session_id}/members/me", method="PUT", token=token2)
    assert status == 200, f"Player2 failed to join {session_id}: {sess}"
    assert len(sess["players"]) == 2
    names = [p["displayName"] for p in sess["players"]]
    print(f"  -> Room {session_id} now has 2 players: {names}")

def test_7_attempt_join_another_room(token1, token3):
    print("Test 7: Попытка входа одного пользователя в другую комнату...")
    # player3 creates another room S_other
    status, sess_other = http_req("/api/v2/sessions", method="POST", body={"worldId": "discovery-campus"}, token=token3)
    assert status == 201
    s_other_id = sess_other["sessionId"]

    # player1 (already in session_id) tries to join S_other -> 409 ALREADY_IN_SESSION
    status, err = http_req(f"/api/v2/sessions/{s_other_id}/members/me", method="PUT", token=token1)
    assert status == 409, f"Expected 409 ALREADY_IN_SESSION, got {status}: {err}"
    assert err["code"] == "ALREADY_IN_SESSION"
    print(f"  -> Properly rejected with 409 ALREADY_IN_SESSION. User preserved in original room.")

def test_8_concurrent_connections_multi_tab(token1, session_id):
    print("Test 8: Конкурентные подключения и несколько вкладок...")
    # Get ticket for Tab 1
    s, t1 = http_req(f"/api/v2/sessions/{session_id}/ws-ticket", method="POST", body={"protocolVersion": "2.0.0"}, token=token1)
    ws1 = RawWsClient("127.0.0.1", 8080, f"/api/v2/ws?ticket={t1['ticket']}")
    ws1.send_text(json.dumps({"type": "client.hello", "clientSeq": 1, "payload": {"clientName": "Tab1"}}))
    w1 = json.loads(ws1.recv_text())
    assert w1["type"] == "server.welcome"

    # Get ticket for Tab 2 (same user / player)
    s, t2 = http_req(f"/api/v2/sessions/{session_id}/ws-ticket", method="POST", body={"protocolVersion": "2.0.0"}, token=token1)
    ws2 = RawWsClient("127.0.0.1", 8080, f"/api/v2/ws?ticket={t2['ticket']}")
    ws2.send_text(json.dumps({"type": "client.hello", "clientSeq": 1, "payload": {"clientName": "Tab2"}}))
    w2 = json.loads(ws2.recv_text())
    assert w2["type"] == "server.welcome"
    print("  -> Both tabs connected concurrently.")

    # Close Tab 1!
    ws1.close()
    time.sleep(0.3)

    # Check session: player MUST still be connected because Tab 2 is alive!
    s, sess = http_req(f"/api/v2/sessions/{session_id}", method="GET", token=token1)
    p1 = next((p for p in sess["players"] if p["playerId"] == w1["payload"]["playerId"]), None)
    assert p1 is not None and p1["connected"] == True, f"Player was incorrectly disconnected when Tab 1 closed: {sess}"
    print("  -> Closing Tab 1 did NOT disconnect Tab 2. Active connection preserved!")

    ws2.close()
    time.sleep(0.3)

def main():
    print("=== RUNNING DISCOVERY SESSION LIFECYCLE VERIFICATION ===")
    t1, u1 = login("player1")
    t2, u2 = login("player2")
    t3, u3 = login("player3")

    sid = test_1_first_login(t1)
    test_2_reentry_and_page_refresh(t1, sid)
    test_3_reconnect_within_grace_period(t1, sid)
    new_sid = test_4_and_5_grace_period_expiry_and_cleanup(t1, sid)
    test_6_two_users_in_one_room(t1, t2, new_sid)
    test_7_attempt_join_another_room(t1, t3)
    test_8_concurrent_connections_multi_tab(t1, new_sid)
    print("=== ALL 8 SCENARIOS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
