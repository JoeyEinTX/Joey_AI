from flask import Blueprint, jsonify, request, Response, current_app
from services.file_store import list_chats as fs_list_chats, create_chat as fs_create_chat, delete_chat as fs_delete_chat, get_chat, save_chat
from services.ollama_client import chat_stream
import uuid

chats_bp = Blueprint('chats_bp', __name__)

@chats_bp.route('', methods=['GET'])
def list_chats():
    chat_ids = fs_list_chats()
    return jsonify({"chats": chat_ids})

@chats_bp.route('', methods=['POST'])
def create_chat():
    chat_id = str(uuid.uuid4())
    fs_create_chat(chat_id)
    return jsonify({"chat_id": chat_id})

@chats_bp.route('/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    fs_delete_chat(chat_id)
    return jsonify({"success": True})

@chats_bp.route('/<chat_id>/message', methods=['POST'])
def send_message(chat_id):
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "message required"}), 400

    user_msg = data['message']
    try:
        history = get_chat(chat_id)
    except FileNotFoundError:
        return jsonify({"error": "Chat not found"}), 404

    # Append user message
    history.append({"role": "user", "content": user_msg})

    # Get model
    model = current_app.config['ACTIVE_MODEL']

    # Streaming response
    def generate():
        try:
            stream = chat_stream(model, history)
            response_text = ""
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    content = chunk['message']['content']
                    yield content
                    response_text += content
            # Append assistant message after streaming
            history.append({"role": "assistant", "content": response_text})
            save_chat(chat_id, history)
        except Exception as e:
            yield f"Error: {str(e)}"

    return Response(generate(), mimetype='text/plain')
