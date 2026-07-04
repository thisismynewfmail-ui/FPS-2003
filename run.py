#!/usr/bin/env python3
"""TEMPUS — Corridors of Eternity :: LAN host (main server).

    python3 run.py                serve on 0.0.0.0:6969
    python3 run.py --port 7000    another port
    ./run.py                      same (POSIX)

Shares the game with the whole LAN and persists everything into ./saves :
  savegame.json   world / level / progress  (CONTINUE in the main menu)
  chatlog.jsonl   every conversation with Minuette, timestamped
  memories.json   her long-term, date-stamped memories
  settings.json   endpoint / sampling / volume settings, shared LAN-wide

Requires only the Python 3 standard library.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.app import serve


def main():
    ap = argparse.ArgumentParser(description="TEMPUS LAN host")
    ap.add_argument("--host", default="0.0.0.0", help="bind address (default 0.0.0.0)")
    ap.add_argument("--port", type=int, default=6969, help="port (default 6969)")
    args = ap.parse_args()
    serve(args.host, args.port)


if __name__ == "__main__":
    main()
