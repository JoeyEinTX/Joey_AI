import json
import os
import requests
import logging
from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any, List

logger = logging.getLogger(__name__)
models_bp = Blueprint('models_bp', __name__)

def resolve_ollama_base():
    """Resolve OLLAMA_BASE with proper precedence: ENV > config > default"""
    if "OLLAMA_BASE" in os.environ:
        return os.environ["OLLAMA_BASE"], "env"
    elif current_app.config.get("OLLAMA_BASE"):
        return current_app.config["OLLAMA_BASE"], "config"
    else:
        return "http://127.0.0.1:11434", "default"

def get_ollama_models() -> List[Dict[str, Any]]:
    """Fetch models from Ollama API with 2s timeout"""
    try:
        base, source = resolve_ollama_base()
        logger.info(f"Fetching Ollama models from {base} (source: {source})")
        
        response = requests.get(
            f'{base}/api/tags',
            timeout=2
        )
        response.raise_for_status()
        
        data = response.json()
        models = []
        
        # Map tags.models[*] to required fields
        for model in data.get('models', []):
            models.append({
                'name': model.get('name', ''),
                'family': model.get('details', {}).get('family', ''),
                'size': model.get('size', 0),
                'modified_at': model.get('modified_at', '')
            })
        
        logger.info(f"Successfully fetched {len(models)} Ollama models")
        return models
        
    except Exception as e:
        logger.error(f"Failed to fetch Ollama models: {str(e)}")
        return []

def get_anthropic_models() -> List[Dict[str, Any]]:
    """Return Anthropic preset models"""
    return [
        {'name': 'claude-3-5-sonnet-20241022'},
        {'name': 'claude-3-5-haiku-20241022'},
        {'name': 'claude-3-opus-20240229'},
        {'name': 'claude-3-sonnet-20240229'},
        {'name': 'claude-3-haiku-20240307'}
    ]

@models_bp.route('/v1/models/debug', methods=['GET'])
def get_models_debug():
    """
    GET /v1/models/debug - Debug endpoint for diagnosing model fetch issues
    Returns detailed information about Ollama connection and response
    """
    base, source = resolve_ollama_base()
    
    debug_info = {
        "base": base,
        "source": source,
        "status": None,
        "error": None,
        "raw": None
    }
    
    try:
        logger.info(f"Debug: Attempting to fetch from {base}/api/tags")
        response = requests.get(f'{base}/api/tags', timeout=2)
        debug_info["status"] = response.status_code
        
        if response.status_code == 200:
            raw_data = response.json()
            debug_info["raw"] = raw_data
            logger.info(f"Debug: Successfully fetched {len(raw_data.get('models', []))} models")
        else:
            debug_info["error"] = f"HTTP {response.status_code}: {response.text[:120]}"
            logger.warning(f"Debug: HTTP error {response.status_code}")
            
    except requests.exceptions.Timeout:
        debug_info["error"] = "Request timeout (2s)"
        logger.error("Debug: Request timeout")
    except requests.exceptions.ConnectionError as e:
        debug_info["error"] = f"Connection error: {str(e)}"
        logger.error(f"Debug: Connection error: {str(e)}")
    except Exception as e:
        debug_info["error"] = f"Unexpected error: {str(e)}"
        logger.error(f"Debug: Unexpected error: {str(e)}")
    
    return jsonify(debug_info)

@models_bp.route('/v1/models', methods=['GET'])
def get_models():
    """
    GET /v1/models - Returns available models from Ollama and Anthropic
    Supports ?provider=ollama|anthropic to filter; default returns both
    """
    try:
        provider_filter = request.args.get('provider', '').lower()
        
        result = {}
        
        # Fetch Ollama models if requested or no filter
        if not provider_filter or provider_filter == 'ollama':
            ollama_models = get_ollama_models()
            result['ollama'] = ollama_models
            
            # Add error info if Ollama fetch failed
            if not ollama_models:
                base, _ = resolve_ollama_base()
                result['ollama_error'] = f"Failed to fetch from {base}"
        
        # Add Anthropic models if requested or no filter
        if not provider_filter or provider_filter == 'anthropic':
            result['anthropic'] = get_anthropic_models()
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Models endpoint error: {str(e)}")
        return jsonify({'error': f'Failed to fetch models: {str(e)}'}), 500
