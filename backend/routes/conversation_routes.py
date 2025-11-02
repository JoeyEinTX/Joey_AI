from flask import Blueprint, request, jsonify, send_file
import json
import io
import logging
from backend.services.conversation_service import (
    create_conversation, list_conversations, rename_conversation, delete_conversation,
    get_messages, add_message, archive_conversation, unarchive_conversation, get_conversation,
    get_recent_conversations_with_snippets
)
from backend.services.ollama_service import get_ollama_service

logger = logging.getLogger(__name__)

conversations_bp = Blueprint('conversations_bp', __name__)

@conversations_bp.route('/conversations', methods=['GET'])
def get_conversations():
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    return jsonify(list_conversations(include_archived=include_archived))

@conversations_bp.route('/api/conversations/recent', methods=['GET'])
def get_recent_conversations():
    """
    Get recent conversations with message snippets for preview panel.
    
    Query Parameters:
        limit (int): Maximum number of conversations to return (default: 5)
    
    Returns:
        JSON: List of recent conversations with last message snippets
    """
    try:
        limit = request.args.get('limit', 5, type=int)
        limit = min(max(limit, 1), 20)  # Clamp between 1-20
        
        recent = get_recent_conversations_with_snippets(limit)
        logger.info(f"[SESSION] Retrieved {len(recent)} recent conversations")
        
        return jsonify(recent), 200
    except Exception as e:
        logger.error(f"Error getting recent conversations: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
    # Get conversation title before deleting for logging
    conv = get_conversation(conv_id)
    title = conv.get('title', 'Untitled') if conv else 'Unknown'
    
    result = delete_conversation(conv_id)
    
    if result.get('ok'):
        logger.info(f'[CHAT_MGMT] Deleted: "{title}"')
    
    return jsonify(result)

@conversations_bp.route('/api/conversations/<int:conv_id>/rename', methods=['POST'])
def rename_conversation_route(conv_id):
    """Rename a conversation"""
    try:
        data = request.get_json(force=True)
        new_title = data.get('title', '').strip()
        
        if not new_title:
            return jsonify({'error': 'Title cannot be empty'}), 400
        
        # Get old title for logging
        conv = get_conversation(conv_id)
        if not conv:
            return jsonify({'error': 'Conversation not found'}), 404
        
        old_title = conv.get('title', 'Untitled')
        
        # Rename the conversation
        updated_conv = rename_conversation(conv_id, new_title)
        
        logger.info(f'[CHAT_MGMT] Renamed: "{old_title}" → "{new_title}"')
        
        # Return updated conversation list
        conversations = list_conversations(include_archived=True)
        return jsonify({'conversation': updated_conv, 'conversations': conversations})
        
    except Exception as e:
        logger.error(f'Error renaming conversation {conv_id}: {str(e)}')
        return jsonify({'error': str(e)}), 500

@conversations_bp.route('/api/conversations/<int:conv_id>/archive', methods=['POST'])
def archive_conversation_route(conv_id):
    """Archive a conversation"""
    try:
        # Get conversation for logging
        conv = get_conversation(conv_id)
        if not conv:
            return jsonify({'error': 'Conversation not found'}), 404
        
        title = conv.get('title', 'Untitled')
        
        # Archive the conversation
        updated_conv = archive_conversation(conv_id)
        
        logger.info(f'[CHAT_MGMT] Archived: "{title}"')
        
        # Return updated conversation list
        conversations = list_conversations(include_archived=True)
        return jsonify({'conversation': updated_conv, 'conversations': conversations})
        
    except Exception as e:
        logger.error(f'Error archiving conversation {conv_id}: {str(e)}')
        return jsonify({'error': str(e)}), 500

@conversations_bp.route('/api/conversations/<int:conv_id>/unarchive', methods=['POST'])
def unarchive_conversation_route(conv_id):
    """Unarchive a conversation"""
    try:
        # Get conversation for logging
        conv = get_conversation(conv_id)
        if not conv:
            return jsonify({'error': 'Conversation not found'}), 404
        
        title = conv.get('title', 'Untitled')
        
        # Unarchive the conversation
        updated_conv = unarchive_conversation(conv_id)
        
        logger.info(f'[CHAT_MGMT] Unarchived: "{title}"')
        
        # Return updated conversation list
        conversations = list_conversations(include_archived=True)
        return jsonify({'conversation': updated_conv, 'conversations': conversations})
        
    except Exception as e:
        logger.error(f'Error unarchiving conversation {conv_id}: {str(e)}')
        return jsonify({'error': str(e)}), 500

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

@conversations_bp.route('/api/generate_title', methods=['POST'])
def generate_title():
    """Generate a short descriptive title for a conversation using the Ollama model"""
    try:
        data = request.get_json(force=True)
        messages = data.get('messages', [])
        conversation_id = data.get('conversation_id')
        
        if not messages:
            logger.warning("No messages provided for title generation")
            return jsonify({'title': 'Untitled Chat'}), 200
        
        # Extract first user message
        user_message = None
        for msg in messages:
            if msg.get('role') == 'user':
                user_message = msg.get('content', '')
                break
        
        if not user_message:
            logger.warning("No user message found for title generation")
            return jsonify({'title': 'Untitled Chat'}), 200
        
        # Create prompt for title generation
        prompt = f"""Generate a short, descriptive title (max 5 words) summarizing this conversation.

User message: {user_message[:500]}

Reply with ONLY the title, no extra words or punctuation."""
        
        # Call Ollama service with 5-second timeout
        try:
            ollama_service = get_ollama_service()
            title = ollama_service.send_prompt_with_retry(
                prompt,
                options={
                    "num_predict": 20,  # Limit response length
                    "temperature": 0.3  # Lower temperature for more focused titles
                }
            )
            
            # Clean up the title
            title = title.strip()
            
            # Remove quotes if present
            if title.startswith('"') and title.endswith('"'):
                title = title[1:-1]
            if title.startswith("'") and title.endswith("'"):
                title = title[1:-1]
            
            # Limit to 5 words
            words = title.split()
            if len(words) > 5:
                title = ' '.join(words[:5])
            
            # Check if title starts with "Error:"
            if title.startswith('Error:'):
                logger.error(f"Ollama service returned error: {title}")
                title = 'Untitled Chat'
            else:
                logger.info(f"[TITLE_GEN] Generated title: {title}")
            
            # Save title to conversation if conversation_id provided
            if conversation_id:
                rename_conversation(conversation_id, title)
            
            return jsonify({'title': title}), 200
            
        except Exception as e:
            logger.error(f"Error generating title with Ollama: {str(e)}")
            logger.info("[TITLE_GEN] Generated title: Untitled Chat")
            return jsonify({'title': 'Untitled Chat'}), 200
        
    except Exception as e:
        logger.error(f"Error in generate_title endpoint: {str(e)}")
        logger.info("[TITLE_GEN] Generated title: Untitled Chat")
        return jsonify({'title': 'Untitled Chat'}), 200
