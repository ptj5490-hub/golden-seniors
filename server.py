"""
순수 소켓 기반 정적 파일 서버.
os.getcwd() 를 일절 호출하지 않으므로 macOS 샌드박스 환경에서도 동작합니다.
"""
import socket
import os
import mimetypes
import threading

DIRECTORY = "/Users/jun/Desktop/클로드/golden-seniors"
PORT = 3000


def handle(conn):
    try:
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = conn.recv(4096)
            if not chunk:
                break
            data += chunk

        first_line = data.split(b"\r\n")[0].decode("utf-8", errors="replace")
        parts = first_line.split(" ")
        if len(parts) < 2:
            return

        raw_path = parts[1].split("?")[0]
        if raw_path == "/":
            raw_path = "/index.html"

        # 디렉토리 트래버설 방지 후 절대 경로 구성
        safe = os.path.normpath(raw_path).lstrip("/\\")
        filepath = os.path.join(DIRECTORY, safe)

        if os.path.isfile(filepath):
            with open(filepath, "rb") as f:
                content = f.read()
            mime = mimetypes.guess_type(filepath)[0] or "application/octet-stream"
            header = (
                f"HTTP/1.1 200 OK\r\n"
                f"Content-Type: {mime}; charset=utf-8\r\n"
                f"Content-Length: {len(content)}\r\n"
                f"Connection: close\r\n\r\n"
            )
            conn.sendall(header.encode() + content)
        else:
            body = b"404 Not Found"
            header = (
                f"HTTP/1.1 404 Not Found\r\n"
                f"Content-Length: {len(body)}\r\n"
                f"Connection: close\r\n\r\n"
            )
            conn.sendall(header.encode() + body)
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("", PORT))
srv.listen(10)

while True:
    try:
        conn, _ = srv.accept()
        threading.Thread(target=handle, args=(conn,), daemon=True).start()
    except Exception:
        pass
