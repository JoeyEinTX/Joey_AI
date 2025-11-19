from flask import Blueprint, jsonify, request, current_app
from services.system_info import get_cpu_load, get_ram_info, get_gpu_load, get_gpu_mode, get_temps, get_power_mode, set_power_mode
from services.ollama_client import pull_model

system_bp = Blueprint('system_bp', __name__)

@system_bp.route('/system_stats', methods=['GET'])
def system_stats():
    ram = get_ram_info()
    return jsonify({
        "cpu_load": get_cpu_load(),
        "ram_used_gb": ram['used_gb'],
        "ram_total_gb": ram['total_gb'],
        "gpu_load": get_gpu_load(),
        "gpu_mode": get_gpu_mode(),
        "temps": get_temps()
    })

@system_bp.route('/power_mode', methods=['GET'])
def power_mode():
    return jsonify({"power_mode": get_power_mode()})

@system_bp.route('/set_mode', methods=['POST'])
def set_mode():
    data = request.get_json()
    mode = data.get('mode')
    if mode is None:
        return jsonify({"error": "mode required"}), 400
    success = set_power_mode(mode)
    return jsonify({"success": success}), 200 if success else 500

@system_bp.route('/reload_models', methods=['POST'])
def reload_models():
    model = current_app.config['ACTIVE_MODEL']
    success = pull_model(model)
    return jsonify({"success": success}), 200 if success else 500

@system_bp.route('/restart_backend', methods=['POST'])
def restart_backend():
    # Mock for now
    return jsonify({"message": "Backend restart not implemented"}), 200

@system_bp.route('/reload_ollama', methods=['POST'])
def reload_ollama():
    model = current_app.config['ACTIVE_MODEL']
    success = pull_model(model)
    return jsonify({"success": success}), 200 if success else 500
