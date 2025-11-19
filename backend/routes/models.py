from flask import Blueprint, jsonify, request, current_app
from services.ollama_client import get_installed_models
import os

models_bp = Blueprint('models_bp', __name__)

@models_bp.route('/models', methods=['GET'])
def models():
    models_list = get_installed_models()
    return jsonify({"models": models_list})

@models_bp.route('/set_model', methods=['POST'])
def set_model():
    data = request.get_json()
    model = data.get('model')
    if not model:
        return jsonify({"error": "model required"}), 400

    current_app.config['ACTIVE_MODEL'] = model

    # Persist to .env
    env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
    lines = []
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            lines = f.readlines()
    for i, line in enumerate(lines):
        if line.startswith('ACTIVE_MODEL='):
            lines[i] = f'ACTIVE_MODEL={model}\n'
            break
    else:
        lines.append(f'ACTIVE_MODEL={model}\n')
    with open(env_file, 'w') as f:
        f.writelines(lines)

    return jsonify({"success": True})
