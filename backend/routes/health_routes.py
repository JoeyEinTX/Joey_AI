from flask import Blueprint, jsonify
from services.ollama_service import get_ollama_service, OllamaConfig
import time
import logging

logger = logging.getLogger(__name__)
health_bp = Blueprint('health_bp', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "Joey_AI"
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
