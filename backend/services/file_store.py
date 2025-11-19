import json
import os
from flask import current_app


def get_chat_dir():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', current_app.config['CHAT_DIR'])


def list_chats():
    dir = get_chat_dir()
    if not os.path.exists(dir):
        return []
    files = [f[:-5] for f in os.listdir(dir) if f.endswith('.json')]
    return files


def create_chat(chat_id):
    dir = get_chat_dir()
    os.makedirs(dir, exist_ok=True)
    path = os.path.join(dir, f'{chat_id}.json')
    if not os.path.exists(path):
        with open(path, 'w') as f:
            json.dump([], f)


def delete_chat(chat_id):
    path = os.path.join(get_chat_dir(), f'{chat_id}.json')
    if os.path.exists(path):
        os.remove(path)


def get_chat(chat_id):
    path = os.path.join(get_chat_dir(), f'{chat_id}.json')
    if not os.path.exists(path):
        raise FileNotFoundError("Chat not found")
    with open(path, 'r') as f:
        return json.load(f)


def save_chat(chat_id, history):
    path = os.path.join(get_chat_dir(), f'{chat_id}.json')
    with open(path, 'w') as f:
        json.dump(history, f)
