from flask import Blueprint, request, jsonify
from backend.services.conversation_service import (
    get_messages, add_message, search_messages, rename_conversation
)
from backend.services.ollama_service import send_prompt

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route('/conversations/<int:conv_id>/messages', methods=['GET'])
def get_conversation_messages(conv_id):
    limit = int(request.args.get('limit', 200))
    order = request.args.get('order', 'asc')
    asc = order == 'asc'
    return jsonify(get_messages(conv_id, limit, asc))

@chat_bp.route('/conversations/<int:conv_id>/message', methods=['POST'])
def post_message(conv_id):
    data = request.get_json(force=True)
    content = data.get('content')
    # 1) Add user message
    user_msg = add_message(conv_id, 'user', content)
    # 2) Run model
    try:
        model_reply = send_prompt(content)
    except Exception:
        model_reply = "Model offline"
    # 3) Add assistant reply
    assistant_msg = add_message(conv_id, 'assistant', model_reply)
    # 4) If first message, set title
    if user_msg and user_msg.get('id') and user_msg.get('role') == 'user':
        from backend.services.conversation_service import get_conversation
        conv = get_conversation(conv_id)
        if conv and (not conv.get('title') or not conv.get('title').strip()):
            preview = ' '.join(content.split()[:10])
            rename_conversation(conv_id, preview)
    return jsonify({"reply": model_reply})

@chat_bp.route('/search', methods=['GET'])
def search_messages_route():
    q = request.args.get('q', '')
    results = search_messages(q)
    # Group by conversation_id
    grouped = {}
    for r in results:
        cid = r['conversation_id']
        if cid not in grouped:
            grouped[cid] = []
        grouped[cid].append(r)
    return jsonify(grouped)
