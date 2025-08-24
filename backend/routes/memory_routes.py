from flask import Blueprint, request, jsonify
from ..services.memory_service import (
    add_note, update_note, delete_note, stats, export_notes, import_notes, recent_notes, search_notes
)

memory_bp = Blueprint('memory_bp', __name__)

@memory_bp.route('/memory/update', methods=['PATCH'])
def update_memory_note():
    data = request.get_json()
    note_id = data.get('id')
    kind = data.get('kind')
    text = data.get('text')
    tags = data.get('tags')
    updated = update_note(note_id, kind, text, tags)
    if not updated:
        return jsonify({'error': 'Note not found or nothing to update'}), 404
    return jsonify(updated)

@memory_bp.route('/memory/delete', methods=['DELETE'])
def delete_memory_note():
    note_id = request.args.get('id', type=int)
    return jsonify(delete_note(note_id))

@memory_bp.route('/memory/stats', methods=['GET'])
def get_memory_stats():
    return jsonify(stats())

@memory_bp.route('/memory/export', methods=['GET'])
def export_memory_notes():
    return jsonify(export_notes())

@memory_bp.route('/memory/import', methods=['POST'])
def import_memory_notes():
    notes = request.get_json(force=True)
    return jsonify(import_notes(notes))

@memory_bp.route('/memory/add', methods=['POST'])
def add_memory_note():
    data = request.get_json()
    kind = data.get('kind')
    text = data.get('text')
    tags = data.get('tags')
    return jsonify(add_note(kind, text, tags))

@memory_bp.route('/memory/recent', methods=['GET'])
def get_recent_notes():
    page = request.args.get('page', default=1, type=int)
    return jsonify(recent_notes(page))

@memory_bp.route('/memory/search', methods=['GET'])
def search_memory_notes():
    q = request.args.get('q', default='', type=str)
    kind = request.args.get('kind', default=None, type=str)
    tags = request.args.get('tags', default=None, type=str)
    page = request.args.get('page', default=1, type=int)
    return jsonify(search_notes(q, kind, tags, page))
