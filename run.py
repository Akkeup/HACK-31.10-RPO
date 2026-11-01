#!/usr/bin/env python3
"""
Discovery Single-File Runner:
Builds frontend, compiles authoritative backend server, and runs unified application.
"""
import os
import sys
import time
import subprocess
import webbrowser
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(ROOT_DIR, "apps", "client")
SERVER_DIR = os.path.join(ROOT_DIR, "apps", "server")
DIST_DIR = os.path.join(CLIENT_DIR, "dist")

def load_env_file(path):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k not in os.environ:
                os.environ[k] = v

def main():
    load_env_file(os.path.join(ROOT_DIR, ".env"))
    print("========================================")
    print("   DISCOVERY UNIFIED RUNNER (v2.0.0)   ")
    print("========================================")

    if not shutil.which("npm"):
        raise SystemExit("npm не найден. Установите Node.js 22 LTS или используйте docker compose up --build.")
    if not shutil.which("rustc"):
        raise SystemExit("rustc не найден. Установите Rust 1.85+ или используйте docker compose up --build.")

    # 1. Build frontend if needed
    src_dir_client = os.path.join(CLIENT_DIR, "src")
    dist_index = os.path.join(DIST_DIR, "index.html")
    latest_client_src_mtime = max(
        [os.path.getmtime(os.path.join(root, f)) for root, _, files in os.walk(src_dir_client) for f in files],
        default=0
    )
    if not os.path.exists(dist_index) or latest_client_src_mtime > os.path.getmtime(dist_index):
        print("[1/3] Building frontend client with Vite...")
        subprocess.check_call(["npm", "run", "build"], cwd=CLIENT_DIR, shell=(sys.platform == "win32"))
    else:
        print("[1/3] Frontend bundle is ready.")

    # 2. Compile backend binary if needed
    server_bin = os.path.join(SERVER_DIR, "discovery-server.exe" if sys.platform == "win32" else "discovery-server")
    src_dir = os.path.join(SERVER_DIR, "src")
    latest_src_mtime = max(
        [os.path.getmtime(os.path.join(root, f)) for root, _, files in os.walk(src_dir) for f in files if f.endswith(".rs")],
        default=0
    )
    if not os.path.exists(server_bin) or latest_src_mtime > os.path.getmtime(server_bin):
        print("[2/3] Compiling authoritative Rust backend server...")
        subprocess.check_call(["rustc", "--edition", "2021", "--crate-type", "bin", "-O", "-o", server_bin, "apps/server/src/main.rs"], cwd=ROOT_DIR)
    else:
        print("[2/3] Backend binary is up to date.")

    # 3. Launch unified server
    port = os.environ.get("PORT", "8080")
    use_https = os.environ.get("USE_HTTPS", "").lower() in ("true", "1", "yes")
    scheme = "https" if use_https else "http"
    ws_scheme = "wss" if use_https else "ws"

    print(f"[3/3] Starting Discovery Game Server ({scheme.upper()}/{ws_scheme.upper()}) on port {port} (0.0.0.0) ...")
    print("      Serving Three.js 3D world, WebSockets, and REST API from single server.")
    print("      Доступные адреса для подключения:")
    print(f"      • Локально:    {scheme}://localhost:{port}")
    try:
        import socket
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                print(f"      • По сети LAN: {scheme}://{ip}:{port}")
    except Exception:
        pass

    env = os.environ.copy()
    if use_https:
        cert_file = os.environ.get("SSL_CERT_PATH", os.path.join(ROOT_DIR, "certs", "cert.pem"))
        key_file = os.environ.get("SSL_KEY_PATH", os.path.join(ROOT_DIR, "certs", "key.pem"))
        if not os.path.exists(cert_file) or not os.path.exists(key_file):
            print("[HTTPS] Certificate files not found. Auto-generating in certs/ ...")
            subprocess.check_call([sys.executable, os.path.join(ROOT_DIR, "certs", "generate_certs.py")])

        from tools.tls_proxy import run_tls_proxy
        internal_port = int(port) + 10000
        env["PORT"] = str(internal_port)
        env["HOST"] = "127.0.0.1"
        env["USE_HTTPS"] = "true"

        import threading
        proxy_thread = threading.Thread(
            target=run_tls_proxy,
            args=("0.0.0.0", int(port), "127.0.0.1", internal_port, cert_file, key_file),
            daemon=True
        )
        proxy_thread.start()
    else:
        env["PORT"] = port
        env["HOST"] = "0.0.0.0"

    # Open browser after a brief delay
    def open_browser():
        time.sleep(1.0)
        webbrowser.open(f"{scheme}://localhost:{port}")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    ai_server_proc = None
    ai_server_script = os.path.join(ROOT_DIR, "services", "ai", "server.py")
    if os.path.exists(ai_server_script):
        already_running = False
        try:
            s_check = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s_check.settimeout(0.5)
            s_check.connect(("127.0.0.1", 11434))
            s_check.close()
            already_running = True
        except Exception:
            pass

        if already_running:
            print("[LLM] Local Qwen2.5-3B-Instruct AI service is already running on port 11434.")
        else:
            print("[LLM] Starting local Qwen2.5-3B-Instruct AI service on port 11434...")
            ai_server_proc = subprocess.Popen([sys.executable, ai_server_script], cwd=ROOT_DIR)

    try:
        proc = subprocess.Popen([server_bin], env=env, cwd=ROOT_DIR)
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping Discovery server...")
        proc.terminate()
        proc.wait()
        if ai_server_proc:
            ai_server_proc.terminate()
            ai_server_proc.wait()

if __name__ == "__main__":
    main()
