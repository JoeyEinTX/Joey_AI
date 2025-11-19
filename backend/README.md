# Joey_AI Backend

This is a Flask backend for the Joey_AI frontend application, designed to run on Jetson Orin Nano and communicate with local Ollama.

## Prerequisites

- Jetson Orin Nano running JetPack
- Python 3.8+
- Ollama installed and running on localhost:11434
- At least one model pulled (e.g., phi3:mini)

## Project Structure

```
backend/
├── app.py                  # Main Flask application
├── .env                    # Environment configuration
├── chat_history/           # Directory for JSON chat session files
├── routes/                 # Flask blueprints for API endpoints
│   ├── __init__.py
│   ├── health.py           # /api/health endpoint
│   ├── system.py           # System stats and power management
│   ├── models.py           # Model listing and setting
│   └── chats.py            # Chat history and streaming
└── services/               # Business logic services
    ├── __init__.py
    ├── ollama_client.py    # Ollama integration
    ├── system_info.py      # Jetson system metrics
    └── file_store.py       # JSON file-based chat persistence
```

## Setup Instructions

1. **Navigate to the project directory:**
   ```bash
   cd Joey_AI
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate
   ```

4. **Install required packages:**
   ```bash
   pip install Flask flask-cors ollama psutil python-dotenv
   ```

5. **Configure environment variables:**
   Edit `backend/.env`:
   ```
   ACTIVE_MODEL=phi3:mini
   OLLAMA_HOST=http://127.0.0.1:11434
   CHAT_DIR=chat_history
   ```

6. **Ensure Ollama is running:**
   ```bash
   ollama serve &
   ```

7. **Pull required model:**
   ```bash
   ollama pull phi3:mini
   ```

## Running the Backend

From the Joey_AI directory:

```bash
source venv/bin/activate
cd backend
python app.py
```

The backend will start at http://127.0.0.1:5000 by default.

## API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns: `{"status": "ok", "active_model": "phi3:mini", "reaches_ollama": true}`

### System Stats
- **GET** `/api/system_stats`
  - Returns: CPU load, RAM usage, GPU load, mode, temperatures

### Models
- **GET** `/api/models`
  - Lists installed Ollama models
- **POST** `/api/set_model`
  - Body: `{"model": "new_model_name"}`
  - Updates active model and persists to .env

### Chat Sessions
- **GET** `/api/chats`
  - Lists all chat session IDs
- **POST** `/api/chats`
  - Creates new chat session
  - Returns: `{"chat_id": "uuid-goes-here"}`
- **DELETE** `/api/chats/{chat_id}`
  - Deletes chat session
- **POST** `/api/chats/{chat_id}/message`
  - Body: `{"message": "User input here"}`
  - Returns: Streaming text/plain response from Ollama

### System Tools (Jetson-specific)
- **GET** `/api/system/power_mode`
  - Returns current NVPMODEL mode as integer
- **POST** `/api/system/set_mode`
  - Body: `{"mode": 0}` (requires sudo)
  - Sets power mode and runs jetson_clocks
- **POST** `/api/system/reload_models`
  - Pulls active model again
- **POST** `/api/system/restart_backend`
  - Mock restart (not implemented)
- **POST** `/api/system/reload_ollama`
  - Reloads active model

## Notes

- Power management endpoints require sudo privileges
- Chat history is stored as JSON files in `backend/chat_history/`
- GPU metrics use Jetson-specific sysfs files and tegrastats fallback
- Streaming responses use text/plain content type without JSON wrappers
