from flask import Blueprint, request, jsonify
from services.ollama_service import send_prompt

query_bp = Blueprint('query_bp', __name__)

@query_bp.route('/query', methods=['POST'])
def query():
    data = request.json
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    response = send_prompt(prompt)
    return jsonify({"response": response})
