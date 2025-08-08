from flask import Blueprint, request, jsonify
from services.ollama_service import send_prompt
import time
import logging

logger = logging.getLogger(__name__)
query_bp = Blueprint('query_bp', __name__)

@query_bp.route('/query', methods=['POST'])
def query():
    """Handle basic prompt queries to Ollama."""
    data = request.json
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    start_time = time.time()
    response = send_prompt(prompt)
    response_time = time.time() - start_time
    
    return jsonify({
        "response": response,
        "response_time": round(response_time, 2),
        "timestamp": int(time.time())
    })

@query_bp.route('/query/advanced', methods=['POST'])
def advanced_query():
    """Handle advanced queries with additional parameters."""
    data = request.json
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    # Extract optional parameters
    temperature = data.get('temperature')
    max_tokens = data.get('max_tokens')
    top_p = data.get('top_p')
    
    # Build kwargs for Ollama API
    kwargs = {}
    if temperature is not None:
        kwargs['options'] = kwargs.get('options', {})
        kwargs['options']['temperature'] = temperature
    if max_tokens is not None:
        kwargs['options'] = kwargs.get('options', {})
        kwargs['options']['num_predict'] = max_tokens
    if top_p is not None:
        kwargs['options'] = kwargs.get('options', {})
        kwargs['options']['top_p'] = top_p
    
    start_time = time.time()
    response = send_prompt(prompt, **kwargs)
    response_time = time.time() - start_time
    
    return jsonify({
        "response": response,
        "response_time": round(response_time, 2),
        "timestamp": int(time.time()),
        "parameters": {
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p
        }
    })

@query_bp.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available models from Ollama."""
    from services.ollama_service import get_ollama_service
    
    try:
        service = get_ollama_service()
        # Make a request to Ollama's /api/tags endpoint to get available models
        response = service.session.get(
            f"{service.session.headers.get('base_url', 'http://localhost:11434')}/api/tags",
            timeout=5
        )
        response.raise_for_status()
        models_data = response.json()
        
        return jsonify({
            "models": [model['name'] for model in models_data.get('models', [])],
            "count": len(models_data.get('models', []))
        })
    except Exception as e:
        logger.error(f"Failed to fetch models: {str(e)}")
        return jsonify({"error": "Unable to fetch available models"}), 500
