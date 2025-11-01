# ─── PATH SETUP (MUST BE FIRST) ────────────────────────────────────────────────
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
# ───────────────────────────────────────────────────────────────────────────────

# Ensure package resolution for module execution
if __package__ is None:
    __package__ = "backend"

# Confirmation logging for path setup
print(f"[PATH_SETUP] sys.path[0]: {sys.path[0]}")
print(f"[PATH_SETUP] Project root: {project_root}")


import os
from flask import Flask, render_template, current_app, jsonify, url_for
from dotenv import load_dotenv, find_dotenv

from backend.routes.query_routes import query_bp
from backend.routes.preset_routes import preset_bp
from backend.routes.health_routes import health_bp
from backend.routes.memory_routes import memory_bp
from backend.routes.conversation_routes import conversations_bp
from backend.routes.chat_routes import chat_bp
from backend.routes.llm_gateway import llm_bp
from backend.routes.models_routes import models_bp
from backend.routes.system_routes import system_bp

from backend.services.conversation_service import init_db as init_conversation_db
from backend.config import FlaskConfig, OllamaConfig

import logging


def main():
    """Main entry point for JoeyAI application."""
    # Load environment variables from .env file
    load_dotenv()

    # Print Ollama configuration for debugging
    print("")
    OllamaConfig.print_config()
    print("")

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, FlaskConfig.LOG_LEVEL.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")

    # Set configuration from environment variables
    # Use OLLAMA_BASE_URL if available, otherwise fall back to OLLAMA_BASE, then default
    app.config["OLLAMA_BASE"] = os.getenv("OLLAMA_BASE_URL", os.getenv("OLLAMA_BASE", "http://10.0.0.32:11434"))

    # Boot logging
    logger = logging.getLogger(__name__)
    logger.info(f"[BOOT] static_folder={app.static_folder} template_folder={app.template_folder}")

    # Boot log for OLLAMA_BASE resolution
    dotenv_path = find_dotenv() or None
    env_ollama_base = os.environ.get("OLLAMA_BASE")
    env_ollama_base_url = os.environ.get("OLLAMA_BASE_URL")
    config_ollama = app.config.get("OLLAMA_BASE")

    # Determine which OLLAMA setting is active
    if env_ollama_base_url:
        resolved_base = env_ollama_base_url
        source = "env(OLLAMA_BASE_URL)"
    elif env_ollama_base:
        resolved_base = env_ollama_base
        source = "env(OLLAMA_BASE)"
    elif config_ollama:
        resolved_base = config_ollama
        source = "config"
    else:
        resolved_base = "http://10.0.0.32:11434"
        source = "default"

    logger.info(f"[BOOT] dotenv={dotenv_path} OLLAMA_BASE={env_ollama_base} OLLAMA_BASE_URL={env_ollama_base_url} config={config_ollama} resolved={resolved_base}({source})")

    # Register blueprints
    app.register_blueprint(query_bp)
    app.register_blueprint(preset_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(memory_bp)
    app.register_blueprint(conversations_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(llm_bp)
    app.register_blueprint(models_bp)
    app.register_blueprint(system_bp)

    @app.route('/')
    def home():
        return render_template('index.html')

    @app.route('/v1/debug/static')
    def debug_static():
        """Debug endpoint to check static file configuration"""
        logo_path = os.path.join(current_app.static_folder, 'img', 'joey_ai_main_logo.png')
        return jsonify({
            "static_folder": current_app.static_folder,
            "logo_url": url_for('static', filename='img/joey_ai_main_logo.png'),
            "logo_exists": os.path.exists(logo_path)
        })

    @app.route('/v1/dev/hello')
    def dev_hello():
        """Test route for render sanity checking"""
        return jsonify({
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "**Hello from /v1/dev/hello**"
                }
            }]
        })

    # Initialize database
    init_conversation_db()

    # Run the application
    print("")
    print("=" * 50)
    print(f">> Starting JoeyAI v1.0.0")
    print(f">> Server: http://{FlaskConfig.HOST}:{FlaskConfig.PORT}")
    print(f">> Debug mode: {FlaskConfig.DEBUG}")
    print("=" * 50)
    print("")
    
    app.run(host=FlaskConfig.HOST, port=FlaskConfig.PORT, debug=FlaskConfig.DEBUG)


if __name__ == '__main__':
    main()
