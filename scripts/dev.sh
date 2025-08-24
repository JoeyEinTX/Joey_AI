#!/usr/bin/env bash
set -e
# Hard-set the env so no other tool can override
export OLLAMA_BASE="http://10.0.0.90:11434"
# Set PYTHONPATH to include backend directory for relative imports
export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"
# Run the canonical app module
exec python -m flask --app backend.app run --port ${PORT:-5000}
