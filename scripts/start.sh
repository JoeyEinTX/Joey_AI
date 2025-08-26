#!/usr/bin/env bash
set -e
exec env -i PATH="$PATH" \
  OLLAMA_BASE="http://10.0.0.90:11434" \
  FLASK_APP="backend.app" \
  python -m flask run --host 0.0.0.0 --port ${PORT:-5000} --no-reload
