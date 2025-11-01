# Joey_AI Quick Start Guide

## 🚀 Getting Started

### 1. Start the Server
```bash
cd ~/Joey_AI
./scripts/dev.sh
```

The server will start on `http://localhost:5000`

### 2. Access the Dashboard
Open your browser and navigate to: `http://localhost:5000`

### 3. Verify Health
Check the health indicator in the header:
- **Green (Online)**: Everything is working
- **Yellow (Degraded)**: Connection issues detected
- **Red (Offline)**: Backend or Ollama offline

### 4. Select a Model
1. Choose provider (Ollama or Anthropic) from dropdown
2. Select model from the list
3. If no models appear, use the manual model input

### 5. Start Chatting!
- Type your message in the text area
- Press `Ctrl+Enter` or click "Send"
- Watch the response stream in real-time

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send message |
| `Ctrl+K` | New conversation |
| `Ctrl+E` | Export current conversation |
| `Ctrl+D` | Delete current conversation |
| `Ctrl+/` | Show shortcuts help |
| `Escape` | Close modals |

## 🔧 Common Tasks

### Creating a New Conversation
- Click "New Chat" button in sidebar
- Or press `Ctrl+K`

### Exporting Conversations
- Press `Ctrl+E` to export current conversation
- Or navigate to `/conversations/export` for all conversations

### Switching Models
1. Select provider (Ollama/Anthropic)
2. Choose model from dropdown
3. Adjust temperature slider (0.0 = precise, 1.0 = creative)

### Using Memory
1. Click gear icon (⚙️) in header
2. Select "Memory"
3. Add notes, todos, decisions, or logs
4. Search and filter by tags

## 🐛 Troubleshooting

### No Models Showing
1. Check Ollama is running:
   ```bash
   curl http://10.0.0.90:11434/api/tags
   ```
2. Verify `OLLAMA_BASE` in `.env` file
3. Click "Debug" link in model dropdown
4. Use manual model input as fallback

### Connection Issues
1. Check health indicator shows base URL
2. Verify network connectivity to Ollama
3. Check firewall settings
4. Review logs: `tail -f flask.log`

### Streaming Not Working
1. Try non-stream mode (toggle in settings)
2. Check browser console for errors
3. Verify model supports streaming
4. Check 6-second timeout isn't too aggressive

### Backend Offline
1. Restart server: `./scripts/restart.sh`
2. Check status: `./scripts/status.sh`
3. Review logs for errors
4. Verify port 5000 is available

## 📚 Advanced Features

### OpenAI-Compatible API
Your Joey_AI instance provides an OpenAI-compatible endpoint at:
```
http://localhost:5000/v1/chat/completions
```

**Example curl request:**
```bash
curl -X POST http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "provider": "ollama",
    "temperature": 0.7,
    "stream": false,
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### IDE Integration (Continue/Cline)
See [README.md](README.md#editor-integration) for detailed setup instructions.

### Using Anthropic Claude
1. Set environment variable:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Select "Anthropic" provider
3. Choose Claude model (e.g., `claude-3-sonnet-20240229`)

## 📊 Health Checks

### Gateway Health
```bash
curl http://localhost:5000/v1/health
```

### Test Chat Completion
```bash
curl -X POST http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "provider": "ollama",
    "messages": [{"role": "user", "content": "ping"}]
  }'
```

### Models Endpoint
```bash
curl http://localhost:5000/v1/models?provider=ollama
```

## 💡 Tips & Tricks

1. **Save bandwidth**: Disable streaming for slow connections
2. **Better responses**: Adjust temperature based on task
   - 0.0-0.3: Precise, factual responses
   - 0.4-0.7: Balanced creativity
   - 0.8-1.0: Creative, varied responses
3. **Organize chats**: Use descriptive conversation titles
4. **Export regularly**: Back up important conversations
5. **Use memory**: Store reusable prompts and snippets
6. **Keyboard shortcuts**: Speed up your workflow with `Ctrl+/`

## 🆘 Getting Help

1. Press `Ctrl+/` for keyboard shortcuts
2. Click ⚙️ → "About" for feature overview
3. Check [IMPROVEMENTS.md](IMPROVEMENTS.md) for detailed features
4. Review [README.md](README.md) for complete documentation

## 📝 Next Steps

- Explore the Memory system for note-taking
- Try different models and providers
- Set up IDE integration (Continue/Cline)
- Customize system prompts for specific tasks
- Export conversations for backup

---

**Need more help?** See the full [README.md](README.md) or [IMPROVEMENTS.md](IMPROVEMENTS.md)
