from flask import Blueprint, jsonify, request, Response, current_app
from services.file_store import list_chats as fs_list_chats, create_chat as fs_create_chat, delete_chat as fs_delete_chat, get_chat, save_chat
from services.ollama_client import chat_stream
import uuid
import requests

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

@chats_bp.route("/send", methods=["POST"])
def send_chat():
    """
    Receive user message → forward to Ollama → return AI text reply.
    """
    data = request.get_json()
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    ollama_host = current_app.config.get("OLLAMA_HOST", "http://127.0.0.1:11434")
    model_name = current_app.config.get("ACTIVE_MODEL", "phi3:mini")

    try:
        response = requests.post(
            f"{ollama_host}/api/generate",
            json={
                "model": model_name,
                "prompt": user_message,
                "stream": False
            },
            timeout=60
        )

        if response.status_code != 200:
            return jsonify({"error": "Ollama returned error"}), 500

        ollama_data = response.json()

        reply = (
            ollama_data.get("response")
            or ollama_data.get("message")
            or ollama_data.get("output")
            or "No reply"
        )

        # Extract performance metrics from Ollama response
        metrics = {}
        if ollama_data.get("total_duration"):
            # Convert nanoseconds to milliseconds
            metrics["latency_ms"] = round(ollama_data["total_duration"] / 1_000_000)
        
        if ollama_data.get("prompt_eval_count"):
            metrics["input_tokens"] = ollama_data["prompt_eval_count"]
        
        if ollama_data.get("eval_count"):
            metrics["output_tokens"] = ollama_data["eval_count"]
        
        if metrics.get("input_tokens") and metrics.get("output_tokens"):
            metrics["total_tokens"] = metrics["input_tokens"] + metrics["output_tokens"]
        
        # Calculate tokens per second
        if ollama_data.get("eval_count") and ollama_data.get("eval_duration"):
            # eval_duration is in nanoseconds
            seconds = ollama_data["eval_duration"] / 1_000_000_000
            if seconds > 0:
                metrics["tps"] = round(ollama_data["eval_count"] / seconds, 1)
        
        # Add model name
        metrics["model"] = ollama_data.get("model", model_name)
        
        # Context usage (if available)
        if ollama_data.get("context") and isinstance(ollama_data["context"], list):
            context_len = len(ollama_data["context"])
            # Assuming max context of 2048 for phi3:mini (adjust if needed)
            max_context = 2048
            metrics["context_used_pct"] = round((context_len / max_context) * 100, 1)

        return jsonify({
            "reply": reply,
            "metrics": metrics
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
