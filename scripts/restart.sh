#!/usr/bin/env bash
set -e
"$(dirname "$0")/stop.sh"
nohup "$(dirname "$0")/start.sh" >/tmp/joeyai.out 2>&1 &
sleep 2
echo "[restart] started pid(s):" $(pgrep -f "flask run" || true)
