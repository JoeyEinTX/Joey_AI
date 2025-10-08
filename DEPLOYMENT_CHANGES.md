# Deployment Fixes Summary

## Changes Made for LAN/Production Deployment

### 1. scripts/start.sh - Removed Hardcoded OLLAMA_BASE
**Before**: Hardcoded `OLLAMA_BASE="http://10.0.0.90:11434"`
**After**: Reads from .env file using environment variable loading

```bash
# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi
```

### 2. backend/routes/health_routes.py - Added /healthz Route
Added Kubernetes/cloud-native standard health check endpoint:

```python
@health_bp.route('/healthz', methods=['GET'])
def healthz_check():
    """Health check endpoint (Kubernetes/cloud-native alias)."""
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "Joey_AI"
    })
```

### 3. .env - Set FLASK_DEBUG=false
**Before**: `FLASK_DEBUG=true`
**After**: `FLASK_DEBUG=false`

This prevents debug mode in production deployments.

### 4. requirements.txt - Added Gunicorn
Added `gunicorn==21.2.0` for production WSGI server.

### 5. scripts/start_production.sh - New Production Start Script
Created production-ready start script using gunicorn:

```bash
#!/usr/bin/env bash
set -e

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Start with gunicorn for production
exec gunicorn -w 4 -b 0.0.0.0:${PORT:-5000} backend.app:app
```

## Usage

### Development Mode
```bash
bash scripts/start.sh
```

### Production Mode
```bash
bash scripts/start_production.sh
```

### Custom Port
```bash
PORT=8080 bash scripts/start_production.sh
```

## Health Check Endpoints

- `/health` - Basic health check
- `/healthz` - Kubernetes-style health check (alias)
- `/v1/health` - Gateway health with Ollama connectivity test
- `/health/ollama` - Detailed Ollama service check
- `/status` - Full service status

## Configuration Notes

- Server binds to `0.0.0.0` (all interfaces) by default
- Default port is `5000`, configurable via `PORT` or `FLASK_PORT` env vars
- OLLAMA_BASE is read from .env file
- Debug mode disabled by default
- Gunicorn uses 4 worker processes for better concurrency
