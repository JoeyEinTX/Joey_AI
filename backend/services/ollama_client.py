import ollama
from flask import current_app


def is_ollama_reachable():
    try:
        ollama.list()
        return True
    except:
        return False


def get_installed_models():
    try:
        models = ollama.list()
        return [model['name'] for model in models.get('models', [])]
    except:
        return []


def pull_model(model):
    try:
        ollama.pull(model)
        return True
    except:
        return False


def chat_stream(model, messages):
    try:
        return ollama.chat(model=model, messages=messages, stream=True)
    except Exception as e:
        return iter([f"Error: {str(e)}"])
