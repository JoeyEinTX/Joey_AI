from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Config
app.config['ACTIVE_MODEL'] = os.getenv('ACTIVE_MODEL', 'phi3:mini')
app.config['OLLAMA_HOST'] = os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434')
app.config['CHAT_DIR'] = os.getenv('CHAT_DIR', 'chat_history')

# Import and register blueprints
from routes.health import health_bp
from routes.system import system_bp
from routes.models import models_bp
from routes.chats import chats_bp

app.register_blueprint(health_bp, url_prefix='/api')
app.register_blueprint(system_bp, url_prefix='/api/system')
app.register_blueprint(models_bp, url_prefix='/api')
app.register_blueprint(chats_bp, url_prefix='/api/chats')

if __name__ == '__main__':
    app.run(debug=True)
