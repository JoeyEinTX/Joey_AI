#!/usr/bin/env bash
set -e
pkill -f "flask run" || true
pkill -f "Joey_AI.backend.app" || true
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5001/tcp 2>/dev/null || true
echo "[stop] done"
