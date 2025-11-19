from flask import Blueprint, jsonify, current_app
from services.ollama_client import is_ollama_reachable

health_bp = Blueprint('health_bp', __name__)

@health_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok" if is_ollama_reachable() else "Ollama unreachable",
        "active_model": current_app.config['ACTIVE_MODEL'],
        "reaches_ollama": is_ollama_reachable()
    })
