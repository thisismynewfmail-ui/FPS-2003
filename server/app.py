"""TEMPUS — LAN host.

Serves the game to the whole LAN on port 6969 and persists saves:

  GET  /                → the game (static files from the repo root)
  GET  /api/load        → last savegame (or {"exists": false})
  POST /api/save        → store savegame JSON
  POST /api/chatlog     → append one Minuette exchange
  GET  /api/chats       → recent chat exchanges
  GET  /api/memories    → server copy of her long-term memories
  POST /api/memories    → store her long-term memories
  GET  /api/settings    → shared settings (endpoint/sampling/volumes)
  POST /api/settings    → store shared settings
  GET  /api/ping        → {"ok": true} (client uses this to detect the host)
"""

import json
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from . import storage

PORT = 6969
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):  # keep the console tidy
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("[api] %s\n" % (args[0],))

    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length <= 0 or length > 2_000_000:
                return None
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    # ------------------------------------------------------------ GET
    def do_GET(self):
        if self.path.startswith("/api/"):
            if self.path == "/api/ping":
                return self._json(200, {"ok": True, "game": "TEMPUS"})
            if self.path == "/api/load":
                data = storage.load_game(ROOT)
                return self._json(200, {"exists": data is not None, "save": data})
            if self.path == "/api/chats":
                return self._json(200, {"chats": storage.recent_chats(ROOT)})
            if self.path == "/api/memories":
                mem = storage.load_memories(ROOT)
                return self._json(200, {"exists": mem is not None, "memories": mem or []})
            if self.path == "/api/settings":
                st = storage.load_settings(ROOT)
                return self._json(200, {"exists": st is not None, "settings": st or {}})
            return self._json(404, {"error": "unknown api"})
        # never serve the saves directory raw
        if self.path.startswith("/saves"):
            return self._json(403, {"error": "no"})
        return super().do_GET()

    # ----------------------------------------------------------- POST
    def do_POST(self):
        if self.path == "/api/save":
            data = self._read_json()
            if data is None:
                return self._json(400, {"error": "bad json"})
            saved_at = storage.save_game(ROOT, data)
            return self._json(200, {"ok": True, "savedAt": saved_at})
        if self.path == "/api/chatlog":
            data = self._read_json()
            if data is None:
                return self._json(400, {"error": "bad json"})
            storage.append_chat(ROOT, data)
            return self._json(200, {"ok": True})
        if self.path == "/api/memories":
            data = self._read_json()
            if data is None or not isinstance(data.get("memories"), list):
                return self._json(400, {"error": "bad json"})
            storage.save_memories(ROOT, data["memories"])
            return self._json(200, {"ok": True})
        if self.path == "/api/settings":
            data = self._read_json()
            if data is None or not isinstance(data.get("settings"), dict):
                return self._json(400, {"error": "bad json"})
            storage.save_settings(ROOT, data["settings"])
            return self._json(200, {"ok": True})
        return self._json(404, {"error": "unknown api"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()


def serve(host="0.0.0.0", port=PORT):
    server = ThreadingHTTPServer((host, port), Handler)
    ip = lan_ip()
    print()
    print("  TEMPUS — Corridors of Eternity :: LAN host")
    print("  ==========================================")
    print("  local   : http://localhost:%d" % port)
    print("  LAN     : http://%s:%d   <- share this" % (ip, port))
    print("  saves   : %s" % os.path.join(ROOT, "saves"))
    print("  stop    : Ctrl+C")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  the corridors close. goodnight.")


def main():
    serve()


if __name__ == "__main__":
    main()
