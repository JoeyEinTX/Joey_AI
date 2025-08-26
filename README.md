# Joey_AI Dashboard - Git Repo Scaffold

## Cline Operation Policy

**ALWAYS run these commands when working with Joey_AI:**
- **PRE**: `./scripts/stop.sh` (before making any changes)
- **POST**: `./scripts/restart.sh && ./scripts/status.sh` (after edits)
- Never start a second server or use port 5001
- When verifying chat, if stream is silent for 8s, toggle Stream OFF and test non-stream

## Runbook

**Development Workflow:**
- Before coding: `./scripts/stop.sh`
- After edits: `./scripts/restart.sh` then `./scripts/status.sh`
- Health must show: base http://10.0.0.90:11434 and ok:true
- UI test: hard refresh (Ctrl+Shift+R), click **Test Render**, then send a prompt

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

# Start dev

Run the development server:

```bash
./scripts/dev.sh
```

# requirements.txt
Flask==3.0.0

## Memory Features

Joey_AI's Memory panel lets you save, search, filter, edit, and organize notes, todos, decisions, and logs with tags. You can also export/import your notes and view stats.

### Features
- **Tags**: Add comma-separated tags to any note for easy filtering.
- **Search & Filters**: Search notes by text, filter by kind (note/todo/decision/log) and tags.
- **Edit/Delete**: Inline edit and delete actions for each entry.
- **Export/Import**: Download all notes as JSON, or import from a file (upsert by id).
- **Stats**: See counts for each kind (note/todo/decision/log) in the dashboard.
- **Pagination**: Load more notes in pages of 25.

### Example curl commands

Update a note:
```bash
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"id": 123, "text": "Updated text", "tags": "project,urgent"}' \
  http://localhost:5000/memory/update
```

Delete a note:
```bash
curl -X DELETE "http://localhost:5000/memory/delete?id=123"
```

Export all notes:
```bash
curl http://localhost:5000/memory/export
```

Import notes:
```bash
curl -X POST -H "Content-Type: application/json" \
  --data @memory_export.json \
  http://localhost:5000/memory/import
```

## Auto-save Chats

By default, every chat exchange is automatically saved to Memory (kind="chat"). You can toggle this feature ON/OFF from the dashboard header.

## Editor Integration

JoeyAI provides an OpenAI-compatible `/v1/chat/completions` endpoint that works with popular VSCode extensions like Continue and Cline.

### Continue Extension Setup

Create or update `~/.continue/config.json`:

```json
{
  "models": [
    {
      "title": "JoeyAI Local",
      "provider": "openai",
      "model": "qwen2.5-coder:7b",
      "apiKey": "joey-ai-local",
      "apiBase": "http://localhost:5000/v1"
    }
  ],
  "tabAutocompleteModel": {
    "title": "JoeyAI Local",
    "provider": "openai", 
    "model": "qwen2.5-coder:7b",
    "apiKey": "joey-ai-local",
    "apiBase": "http://localhost:5000/v1"
  }
}
```

### Cline Extension Setup

In VSCode, open Cline settings and configure:

- **API Provider**: OpenAI
- **Base URL**: `http://localhost:5000/v1`
- **API Key**: `joey-ai-local` (any non-empty string)
- **Model**: `qwen2.5-coder:7b`

### Usage

1. Start JoeyAI server: `./scripts/dev.sh`
2. Ensure Ollama is running with your desired model
3. Use Continue or Cline as normal - they'll connect to your local JoeyAI instance

### Supported Features

- ✅ Chat completions
- ✅ Streaming responses
- ✅ Temperature control
- ✅ Custom model selection
- ✅ Error handling and retries

## Using Claude

JoeyAI supports Anthropic's Claude models through the same `/v1/chat/completions` endpoint. To use Claude:

1. **Set your API key**: Add your Anthropic API key to your environment:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

2. **Use the web interface**: Select "Anthropic" from the provider dropdown and enter a Claude model name (e.g., `claude-3-sonnet-20240229`).

3. **API usage**: Include `"provider": "anthropic"` in your request:
   ```bash
   curl -X POST http://localhost:5000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "anthropic",
       "model": "claude-3-sonnet-20240229",
       "temperature": 0.7,
       "messages": [
         {"role": "user", "content": "Hello, Claude!"}
       ]
     }'
   ```

The endpoint automatically handles message format conversion and returns OpenAI-compatible responses.

## Connectivity checks

Test your JoeyAI gateway and Ollama connectivity:

```bash
export OLLAMA_BASE=http://10.0.0.90:11434
curl -s http://localhost:5000/v1/health
curl -s http://localhost:5000/v1/chat/completions -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-coder:7b","messages":[{"role":"user","content":"hello"}],"provider":"ollama"}'
```

The `/v1/health` endpoint returns gateway status and Ollama connectivity. Error responses from `/v1/chat/completions` now include the base URL being used for debugging.
