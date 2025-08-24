from flask import Blueprint, request, jsonify
from ..services.conversation_service import (
    create_conversation, list_conversations, rename_conversation, delete_conversation,
    get_messages, add_message
)

conversations_bp = Blueprint('conversations_bp', __name__)

@conversations_bp.route('/conversations', methods=['GET'])
def get_conversations():
    return jsonify(list_conversations())

@conversations_bp.route('/conversations', methods=['POST'])
def post_conversation():
    data = request.get_json(force=True)
    title = data.get('title')
    return jsonify(create_conversation(title))

@conversations_bp.route('/conversations/<int:conv_id>/messages', methods=['GET'])
def get_conversation_messages(conv_id):
    return jsonify(get_messages(conv_id))

@conversations_bp.route('/conversations/<int:conv_id>/messages', methods=['POST'])
def add_conversation_message(conv_id):
    data = request.get_json(force=True)
    role = data.get('role')
    content = data.get('content')
    return jsonify(add_message(conv_id, role, content))

@conversations_bp.route('/conversations/<int:conv_id>', methods=['PATCH'])
def patch_conversation(conv_id):
    data = request.get_json(force=True)
    title = data.get('title')
    return jsonify(rename_conversation(conv_id, title))

@conversations_bp.route('/conversations/<int:conv_id>/title', methods=['POST'])
def update_conversation_title(conv_id):
    data = request.get_json(force=True)
    title = data.get('title')
    return jsonify(rename_conversation(conv_id, title))

@conversations_bp.route('/conversations/<int:conv_id>', methods=['DELETE'])
def delete_conversation_route(conv_id):
    return jsonify(delete_conversation(conv_id))
