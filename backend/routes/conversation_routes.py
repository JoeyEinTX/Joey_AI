from flask import Blueprint, request, jsonify
from backend.services.conversation_service import (
    create_conversation, list_conversations, rename_conversation, delete_conversation
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

@conversations_bp.route('/conversations/<int:conv_id>', methods=['PATCH'])
def patch_conversation(conv_id):
    data = request.get_json(force=True)
    title = data.get('title')
    return jsonify(rename_conversation(conv_id, title))

@conversations_bp.route('/conversations/<int:conv_id>', methods=['DELETE'])
def delete_conversation_route(conv_id):
    return jsonify(delete_conversation(conv_id))
