import os
import sys
import socket
import subprocess

CERTS_DIR = os.path.dirname(os.path.abspath(__file__))
CERT_FILE = os.path.join(CERTS_DIR, "cert.pem")
KEY_FILE = os.path.join(CERTS_DIR, "key.pem")

def get_lan_ips():
    ips = ["127.0.0.1"]
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    return ips

def main():
    os.makedirs(CERTS_DIR, exist_ok=True)
    ips = get_lan_ips()
    san_parts = ["DNS:localhost", "DNS:*.localhost"]
    for ip in ips:
        san_parts.append(f"IP:{ip}")
    san = ",".join(san_parts)

    print("=== Generating SSL Certificates for Discovery ===")
    print(f"Target folder: {CERTS_DIR}")
    print(f"Subject Alternative Names (SAN): {san}")

    # Check if OpenSSL is available
    openssl_cmd = "openssl"
    git_openssl = r"C:\Program Files\Git\usr\bin\openssl.exe"
    if os.path.exists(git_openssl):
        openssl_cmd = git_openssl

    cmd = [
        openssl_cmd, "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", KEY_FILE,
        "-out", CERT_FILE,
        "-days", "365",
        "-subj", "/CN=localhost",
        "-addext", f"subjectAltName={san}"
    ]
    try:
        subprocess.check_call(cmd)
        print("\nSUCCESS! Generated:")
        print(f"  • Certificate: {CERT_FILE}")
        print(f"  • Private Key: {KEY_FILE}")
    except Exception as e:
        print(f"Failed to generate with openssl: {e}")
        print("\nManual generation command:")
        print(f'openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost" -addext "subjectAltName={san}"')

if __name__ == "__main__":
    main()
