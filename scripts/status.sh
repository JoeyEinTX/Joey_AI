#!/usr/bin/env bash
set -e
echo "== listeners =="
ss -lntp | grep -E ':5000|:5001' || echo "none"
echo "== health =="
curl -s http://localhost:5000/v1/health || echo "(no response)"
echo
echo "== debug env =="
curl -s http://localhost:5000/v1/debug/env || echo "(missing)"
echo
