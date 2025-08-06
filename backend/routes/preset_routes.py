from flask import Blueprint, jsonify
import json
import os

preset_bp = Blueprint('preset_bp', __name__)

@preset_bp.route('/presets', methods=['GET'])
def get_presets():
    presets_path = os.path.join(os.path.dirname(__file__), '../presets.json')
    with open(presets_path, 'r') as f:
        data = json.load(f)
    return jsonify(data.get('presets', []))
