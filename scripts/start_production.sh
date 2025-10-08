#!/usr/bin/env bash
set -e

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Start with gunicorn for production
exec gunicorn -w 4 -b 0.0.0.0:${PORT:-5000} backend.app:app
