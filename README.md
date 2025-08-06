# Joey_AI Dashboard - Git Repo Scaffold

# Folder structure:
# Joey_AI/
# ├── backend/
# │   ├── app.py
# │   ├── routes/
# │   │   └── query_routes.py
# │   ├── services/
# │   │   └── ollama_service.py
# │   └── presets.json
# ├── frontend/
# │   ├── static/
# │   │   ├── style.css
# │   ├── templates/
# │   │   └── index.html
# │   └── scripts.js
# ├── tests/
# ├── scripts/
# │   └── start_server.sh
# ├── README.md
# └── requirements.txt

# backend/app.py
from flask import Flask, render_template
from routes.query_routes import query_bp

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
app.register_blueprint(query_bp)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# backend/routes/query_routes.py
from flask import Blueprint, request, jsonify
from services.ollama_service import send_prompt

query_bp = Blueprint('query_bp', __name__)

@query_bp.route('/query', methods=['POST'])
def query():
    data = request.json
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    response = send_prompt(prompt)
    return jsonify({"response": response})

# backend/services/ollama_service.py
def send_prompt(prompt):
    # Placeholder function for now.
    # Later, integrate with Ollama API running on Jetson.
    print(f"Prompt sent to LLM: {prompt}")
    return "[Simulated Response]"

# backend/presets.json
{
    "presets": [
        {"name": "Deep Reasoning", "text": "Think step-by-step and explain your logic clearly."},
        {"name": "Code Audit", "text": "Analyze this code for bugs, edge cases, and optimizations."},
        {"name": "Edge Cases", "text": "List all potential failure points for this function or system."}
    ]
}

# frontend/templates/index.html
<!DOCTYPE html>
<html>
<head>
    <title>Joey_AI Dashboard</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <h1>Joey_AI Dashboard</h1>
    <textarea id="prompt" placeholder="Enter your prompt here..."></textarea>
    <div id="preset-buttons"></div>
    <button onclick="sendPrompt()">Send Prompt</button>
    <pre id="response"></pre>

    <script src="/scripts.js"></script>
</body>
</html>

# frontend/static/style.css
body {
    font-family: Arial, sans-serif;
    padding: 20px;
    background-color: #f4f4f4;
}
textarea {
    width: 100%;
    height: 100px;
}
button {
    margin-top: 10px;
}
pre {
    margin-top: 20px;
    background: #fff;
    padding: 10px;
}

# frontend/scripts.js
async function sendPrompt() {
    const prompt = document.getElementById('prompt').value;
    const res = await fetch('/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt})
    });
    const data = await res.json();
    document.getElementById('response').innerText = data.response;
}

# scripts/start_server.sh
#!/bin/bash
export FLASK_APP=backend/app.py
flask run --host=0.0.0.0 --port=5000

# requirements.txt
Flask==3.0.0
