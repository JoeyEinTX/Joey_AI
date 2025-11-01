from flask import Blueprint, request, jsonify, send_file
import json
import io
from backend.services.conversation_service import (
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

@conversations_bp.route('/conversations/<int:conv_id>/export', methods=['GET'])
def export_conversation(conv_id):
    """Export a single conversation as JSON"""
    try:
        # Get conversation metadata
        conversations = list_conversations()
        conversation = next((c for c in conversations if c['id'] == conv_id), None)
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Get messages
        messages = get_messages(conv_id)
        
        # Create export data
        export_data = {
            'conversation': conversation,
            'messages': messages,
            'exported_at': conversation.get('updated_at')
        }
        
        # Create in-memory file
        json_str = json.dumps(export_data, indent=2)
        json_bytes = json_str.encode('utf-8')
        json_io = io.BytesIO(json_bytes)
        
        # Generate filename
        title = conversation.get('title', 'Untitled').replace(' ', '_')
        filename = f"conversation_{conv_id}_{title}.json"
        
        return send_file(
            json_io,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@conversations_bp.route('/conversations/export', methods=['GET'])
def export_all_conversations():
    """Export all conversations as JSON"""
    try:
        conversations = list_conversations()
        
        export_data = {
            'conversations': [],
            'exported_at': None
        }
        
        for conv in conversations:
            messages = get_messages(conv['id'])
            export_data['conversations'].append({
                'conversation': conv,
                'messages': messages
            })
        
        if conversations:
            export_data['exported_at'] = conversations[0].get('updated_at')
        
        # Create in-memory file
        json_str = json.dumps(export_data, indent=2)
        json_bytes = json_str.encode('utf-8')
        json_io = io.BytesIO(json_bytes)
        
        return send_file(
            json_io,
            mimetype='application/json',
            as_attachment=True,
            download_name='all_conversations_export.json'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
