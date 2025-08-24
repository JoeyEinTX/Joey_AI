# Cline Extension Configuration

To configure Cline to use JoeyAI's local endpoint:

## Method 1: VSCode Settings UI

1. Open VSCode
2. Go to Extensions and find Cline
3. Click the gear icon → Extension Settings
4. Configure the following:

- **API Provider**: `OpenAI`
- **Base URL**: `http://localhost:5000/v1`
- **API Key**: `joey-ai-local` (any non-empty string)
- **Model**: `qwen2.5-coder:7b`

## Method 2: VSCode Settings JSON

Add to your VSCode `settings.json`:

```json
{
  "cline.apiProvider": "openai",
  "cline.openaiBaseUrl": "http://localhost:5000/v1",
  "cline.openaiApiKey": "joey-ai-local",
  "cline.openaiModelId": "qwen2.5-coder:7b"
}
```

## Method 3: Workspace Settings

Create `.vscode/settings.json` in your project:

```json
{
  "cline.apiProvider": "openai",
  "cline.openaiBaseUrl": "http://localhost:5000/v1", 
  "cline.openaiApiKey": "joey-ai-local",
  "cline.openaiModelId": "qwen2.5-coder:7b"
}
```

## Testing the Connection

1. Ensure JoeyAI server is running: `python -m flask --app backend/app.py run --host=0.0.0.0 --port=5000`
2. Ensure Ollama is running with the `qwen2.5-coder:7b` model
3. Open Cline in VSCode (Cmd/Ctrl+Shift+P → "Cline: Open")
4. Send a test message like "Hello, can you help me with some code?"
5. You should see responses from your local JoeyAI instance

## Troubleshooting

- **Connection Error**: Verify JoeyAI server is running on port 5000
- **Model Error**: Ensure Ollama has the specified model downloaded
- **API Key Error**: Any non-empty string works as the API key
- **Timeout**: Check that Ollama service is responsive
