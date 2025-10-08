from flask import Blueprint, jsonify, current_app
import time
import logging
import requests
import os

logger = logging.getLogger(__name__)
health_bp = Blueprint('health_bp', __name__)

def resolve_ollama_base():
    """Resolve OLLAMA_BASE with proper precedence: ENV > config > default"""
    if "OLLAMA_BASE" in os.environ:
        return os.environ["OLLAMA_BASE"], "env"
    elif current_app.config.get("OLLAMA_BASE"):
        return current_app.config["OLLAMA_BASE"], "config"
    else:
        return "http://127.0.0.1:11434", "default"

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "Joey_AI"
    })

@health_bp.route('/healthz', methods=['GET'])
def healthz_check():
    """Health check endpoint (Kubernetes/cloud-native alias)."""
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "Joey_AI"
    })

@health_bp.route('/v1/health', methods=['GET'])
def v1_health_check():
    """Gateway health check with Ollama connectivity test."""
    # Get base URL using resolve_ollama_base with source information
    base, source = resolve_ollama_base()
    
    # Test Ollama connectivity and get models count
    ollama_ok = False
    models_count = -1
    
    try:
        response = requests.get(f"{base}/api/tags", timeout=2)
        ollama_ok = response.status_code == 200
        
        if ollama_ok:
            data = response.json()
            models_count = len(data.get('models', []))
            logger.info(f"Health check: Found {models_count} models")
        else:
            logger.warning(f"Health check: HTTP {response.status_code} from Ollama")
            
    except Exception as e:
        logger.error(f"Health check: Ollama connection failed: {str(e)}")
        ollama_ok = False
        models_count = -1
    
    return jsonify({
        "gateway": "ok",
        "ollama": {
            "ok": ollama_ok,
            "base": base,
            "source": source
        },
        "models_count": models_count
    })

@health_bp.route('/health/ollama', methods=['GET'])
def ollama_health_check():
    """Check if Ollama service is accessible."""
    try:
        service = get_ollama_service()
        
        # Quick test with minimal prompt
        start_time = time.time()
        test_response = service.send_prompt_with_retry("Hello", options={"num_predict": 1})
        response_time = time.time() - start_time
        
        is_healthy = not test_response.startswith("Error:")
        
        return jsonify({
            "status": "healthy" if is_healthy else "unhealthy",
            "ollama_url": OllamaConfig.BASE_URL,
            "model": OllamaConfig.MODEL,
            "response_time": round(response_time, 2),
            "test_response": test_response[:50] + "..." if len(test_response) > 50 else test_response,
            "timestamp": int(time.time())
        })
    except Exception as e:
        logger.error(f"Ollama health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": int(time.time())
        }), 503

@health_bp.route('/status', methods=['GET'])
def get_status():
    """Get detailed service status and configuration."""
    return jsonify({
        "service": "Joey_AI",
        "version": "1.0.0",
        "timestamp": int(time.time()),
        "configuration": {
            "ollama_url": OllamaConfig.BASE_URL,
            "model": OllamaConfig.MODEL,
            "timeout": OllamaConfig.TIMEOUT,
            "max_retries": OllamaConfig.MAX_RETRIES,
            "retry_delay": OllamaConfig.RETRY_DELAY
        }
    })
