from flask import Flask, render_template
from routes.query_routes import query_bp
from routes.preset_routes import preset_bp

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
app.register_blueprint(query_bp)
app.register_blueprint(preset_bp)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
