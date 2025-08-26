from flask import Flask, render_template, current_app, jsonify, url_for
from dotenv import load_dotenv, find_dotenv
from .routes.query_routes import query_bp
from .routes.preset_routes import preset_bp
from .routes.health_routes import health_bp
from .routes.memory_routes import memory_bp
from .routes.conversation_routes import conversations_bp
from .routes.chat_routes import chat_bp
from .routes.llm_gateway import llm_bp
from .routes.models_routes import models_bp
from .services.conversation_service import init_db as init_conversation_db
from .config import FlaskConfig
import logging
import os

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, FlaskConfig.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")

# Set configuration from environment variables
app.config["OLLAMA_BASE"] = os.getenv("OLLAMA_BASE", "http://127.0.0.1:11434")

def resolve_ollama_base():
    """Resolve OLLAMA_BASE with proper precedence: ENV > config > default"""
    if "OLLAMA_BASE" in os.environ:
        return os.environ["OLLAMA_BASE"], "env"
    elif current_app.config.get("OLLAMA_BASE"):
        return current_app.config["OLLAMA_BASE"], "config"
    else:
        return "http://127.0.0.1:11434", "default"

# Boot logging
logger = logging.getLogger(__name__)
logger.info(f"[BOOT] static_folder={app.static_folder} template_folder={app.template_folder}")

# Boot log for OLLAMA_BASE resolution
base, source = resolve_ollama_base()
dotenv_path = find_dotenv() or None
env_ollama = os.environ.get("OLLAMA_BASE")
config_ollama = app.config.get("OLLAMA_BASE")
logger.info(f"[BOOT] dotenv={dotenv_path} env={env_ollama} config={config_ollama} resolved={base}({source})")

app.register_blueprint(query_bp)
app.register_blueprint(preset_bp)
app.register_blueprint(health_bp)
app.register_blueprint(memory_bp)
app.register_blueprint(conversations_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(llm_bp)
app.register_blueprint(models_bp)

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

init_conversation_db()

if __name__ == '__main__':
    app.run(host=FlaskConfig.HOST, port=FlaskConfig.PORT, debug=FlaskConfig.DEBUG)
