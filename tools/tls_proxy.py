"""
tools/tls_proxy.py: Lightweight standard-library TLS terminator for Discovery.
Proxies HTTPS and WSS (WebSocket Secure) connections to internal HTTP/WS backend.
"""
import ssl
import socket
import threading

def _pipe(source, dest):
    try:
        while True:
            data = source.recv(65536)
            if not data:
                break
            dest.sendall(data)
    except Exception:
        pass
    finally:
        try:
            dest.shutdown(socket.SHUT_WR)
        except Exception:
            try:
                dest.close()
            except Exception:
                pass
        try:
            source.close()
        except Exception:
            pass

def _handle_connection(raw_client, client_addr, target_host, target_port, ssl_context):
    try:
        ssl_client = ssl_context.wrap_socket(raw_client, server_side=True)
    except Exception as e:
        # TLS handshake failure (e.g. port scan or unencrypted HTTP client)
        try:
            raw_client.close()
        except Exception:
            pass
        return

    try:
        backend_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        backend_sock.connect((target_host, target_port))
    except Exception as e:
        try:
            ssl_client.close()
        except Exception:
            pass
        return

    t1 = threading.Thread(target=_pipe, args=(ssl_client, backend_sock), daemon=True)
    t2 = threading.Thread(target=_pipe, args=(backend_sock, ssl_client), daemon=True)
    t1.start()
    t2.start()

def run_tls_proxy(listen_host, listen_port, target_host, target_port, cert_file, key_file):
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=cert_file, keyfile=key_file)

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((listen_host, listen_port))
    server.listen(128)

    while True:
        try:
            client_sock, client_addr = server.accept()
            t = threading.Thread(
                target=_handle_connection,
                args=(client_sock, client_addr, target_host, target_port, context),
                daemon=True
            )
            t.start()
        except Exception:
            break
