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

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(ROOT_DIR, "apps", "client")
SERVER_DIR = os.path.join(ROOT_DIR, "apps", "server")
DIST_DIR = os.path.join(CLIENT_DIR, "dist")

def main():
    print("========================================")
    print("   DISCOVERY UNIFIED RUNNER (v2.0.0)   ")
    print("========================================")

    # 1. Build frontend if needed
    if not os.path.exists(os.path.join(DIST_DIR, "index.html")):
        print("[1/3] Building frontend client with Vite...")
        subprocess.check_call(["npm", "run", "build"], cwd=CLIENT_DIR, shell=(sys.platform == "win32"))
    else:
        print("[1/3] Frontend bundle is ready.")

    # 2. Compile backend binary if needed
    server_bin = os.path.join(SERVER_DIR, "discovery-server.exe" if sys.platform == "win32" else "discovery-server")
    if not os.path.exists(server_bin) or os.path.getmtime(os.path.join(SERVER_DIR, "src", "main.rs")) > os.path.getmtime(server_bin):
        print("[2/3] Compiling authoritative Rust backend server...")
        subprocess.check_call(["rustc", "--edition", "2021", "--crate-type", "bin", "-O", "-o", server_bin, "apps/server/src/main.rs"], cwd=ROOT_DIR)
    else:
        print("[2/3] Backend binary is up to date.")

    # 3. Launch unified server
    port = os.environ.get("PORT", "8080")
    print(f"[3/3] Starting Discovery Game Server on http://localhost:{port} ...")
    print("      Serving Three.js 3D world, WebSockets, and REST API from single server.")

    env = os.environ.copy()
    env["PORT"] = port
    env["HOST"] = "0.0.0.0"

    # Open browser after a brief delay
    def open_browser():
        time.sleep(1.0)
        webbrowser.open(f"http://localhost:{port}")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        proc = subprocess.Popen([server_bin], env=env, cwd=ROOT_DIR)
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping Discovery server...")
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    main()
