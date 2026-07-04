#!/usr/bin/env python3
# TEMPUS — Corridors of Eternity :: LAN host launcher
# Thin wrapper around run.py (the main server). See run.py for options.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import run

if __name__ == "__main__":
    run.main()
