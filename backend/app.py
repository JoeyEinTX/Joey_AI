from flask import Flask, render_template
from routes.query_routes import query_bp
from routes.preset_routes import preset_bp
from routes.health_routes import health_bp
from routes.memory_routes import memory_bp
from config import FlaskConfig
import logging

# Configure logging
logging.basicConfig(
    level=getattr(logging, FlaskConfig.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
app.register_blueprint(query_bp)
app.register_blueprint(preset_bp)
app.register_blueprint(health_bp)
app.register_blueprint(memory_bp)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host=FlaskConfig.HOST, port=FlaskConfig.PORT, debug=FlaskConfig.DEBUG)
