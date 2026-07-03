"""TEMPUS — persistence.

Saves live next to the game in ./saves :
  savegame.json   — one slot, the whole world state the client sends
  chatlog.jsonl   — every exchange with Minuette, append-only, timestamped
  memories.json   — mirror of her long-term memories (client also keeps
                    them in localStorage; the server copy survives browsers)
"""

import json
import os
import threading
import time

_LOCK = threading.Lock()


def _saves_dir(root):
    d = os.path.join(root, "saves")
    os.makedirs(d, exist_ok=True)
    return d


def save_game(root, payload):
    payload = dict(payload)
    payload["savedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    path = os.path.join(_saves_dir(root), "savegame.json")
    with _LOCK:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        os.replace(tmp, path)
    return payload["savedAt"]


def load_game(root):
    path = os.path.join(_saves_dir(root), "savegame.json")
    if not os.path.exists(path):
        return None
    with _LOCK:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


def append_chat(root, entry):
    entry = dict(entry)
    entry.setdefault("at", time.strftime("%Y-%m-%d %H:%M:%S"))
    path = os.path.join(_saves_dir(root), "chatlog.jsonl")
    with _LOCK:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def recent_chats(root, limit=50):
    path = os.path.join(_saves_dir(root), "chatlog.jsonl")
    if not os.path.exists(path):
        return []
    with _LOCK:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    out = []
    for line in lines[-limit:]:
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def save_memories(root, memories):
    path = os.path.join(_saves_dir(root), "memories.json")
    with _LOCK:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(memories, f, indent=2, ensure_ascii=False)


def load_memories(root):
    path = os.path.join(_saves_dir(root), "memories.json")
    if not os.path.exists(path):
        return None
    with _LOCK:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
