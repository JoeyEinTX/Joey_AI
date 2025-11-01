# HTTP 502 & Message Duplication Fix Summary

**Date:** October 31, 2025  
**System:** JoeyAI on Jetson Orin Nano (10.0.0.32)  
**Issues Resolved:**
1. HTTP 502: BAD GATEWAY errors
2. Triple message duplication in chat UI

---

## Root Causes Identified

### 1. Environment Variable Mismatch (PRIMARY 502 CAUSE)
**Problem:** 
- `.env` file uses `OLLAMA_BASE_URL=http://10.0.0.32:11434`
- Backend gateway was looking for `OLLAMA_BASE`
- Result: Gateway defaulted to `http://127.0.0.1:11434` (localhost) which didn't exist
- Ollama connection failed → 502 error

### 2. Missing CPU-Only Configuration in Gateway
**Problem:**
- Gateway wasn't passing `num_gpu=0` to Ollama
- Could cause CUDA errors even with other CPU configurations

### 3. Multiple Event Listeners (DUPLICATION CAUSE)
**Problem:**
- Button click, form submit, and Ctrl+Enter all triggered `onSend()`
- No deduplication guard
- Result: 3 simultaneous requests per user action

### 4. Insufficient Timeout for CPU Mode
**Problem:**
- 60-second timeout too short for CPU inference
- Could cause premature failures

---

## Changes Made

### 1. Fixed Environment Variable Resolution (`backend/routes/llm_gateway.py`)

**Before:**
```python
def resolve_ollama_base():
    if "OLLAMA_BASE" in os.environ:
        return os.environ["OLLAMA_BASE"], "env"
    # ...
```

**After:**
```python
def resolve_ollama_base():
    """Resolve OLLAMA_BASE_URL with proper precedence: ENV > config > default"""
    # Try OLLAMA_BASE_URL first (standard naming), then fall back to OLLAMA_BASE
    if "OLLAMA_BASE_URL" in os.environ:
        return os.environ["OLLAMA_BASE_URL"], "env:OLLAMA_BASE_URL"
    elif "OLLAMA_BASE" in os.environ:
        return os.environ["OLLAMA_BASE"], "env:OLLAMA_BASE"
    elif current_app.config.get("OLLAMA_BASE_URL"):
        return current_app.config["OLLAMA_BASE_URL"], "config:OLLAMA_BASE_URL"
    elif current_app.config.get("OLLAMA_BASE"):
        return current_app.config["OLLAMA_BASE"], "config:OLLAMA_BASE"
    else:
        return "http://127.0.0.1:11434", "default"
```

**Impact:** Now reads correct Ollama URL from `.env`, fixing 502 errors

---

### 2. Added CPU-Only Mode to Gateway (`backend/routes/llm_gateway.py`)

**Added:**
```python
# Get num_gpu from environment or use 0 for CPU-only mode
num_gpu = int(os.getenv('OLLAMA_NUM_GPU', '0'))

ollama_payload = {
    'model': model,
    'messages': messages,
    'stream': stream,
    'options': {
        'temperature': temperature,
        'num_gpu': num_gpu  # ← NEW
    }
}

# Log the complete payload being sent to Ollama
logger.info(f"[OLLAMA PAYLOAD] {json.dumps(ollama_payload, indent=2)}")
```

**Impact:** 
- Ensures CPU-only mode even if server config missing
- Better debugging with payload logging

---

### 3. Increased Timeout for CPU Mode (`backend/routes/llm_gateway.py`)

**Before:**
```python
response = requests.post(
    f'{base}/api/chat',
    json=ollama_payload,
    timeout=60,  # 60 seconds
    stream=stream
)
```

**After:**
```python
response = requests.post(
    f'{base}/api/chat',
    json=ollama_payload,
    timeout=120,  # ← Increased to 120 seconds for CPU mode
    stream=stream
)
```

**Impact:** Prevents premature timeouts during slow CPU inference

---

### 4. Fixed Message Duplication (`frontend/static/scripts.js`)

**Before:** No deduplication - multiple triggers could fire simultaneously
```python
if (btn) {
    btn.addEventListener('click', onSend);
}

if (ta) {
    ta.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            onSend();
        }
    });
}

if (composer) {
    composer.addEventListener('submit', (e) => {
        e.preventDefault();
        onSend();
    });
}
```

**After:** Added deduplication guard
```javascript
// Bind events after DOMContentLoaded with deduplication guard
let sendInProgress = false;

if (btn) {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!sendInProgress) {
            sendInProgress = true;
            onSend().finally(() => { sendInProgress = false; });
        }
    });
}

if (ta) {
    ta.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (!sendInProgress) {
                sendInProgress = true;
                onSend().finally(() => { sendInProgress = false; });
            }
        }
    });
}

if (composer) {
    composer.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!sendInProgress) {
            sendInProgress = true;
            onSend().finally(() => { sendInProgress = false; });
        }
    });
}
```

**Impact:** Prevents multiple simultaneous requests, eliminating duplication

---

## Enhanced Logging

Added comprehensive logging throughout the request chain:

1. **Gateway Entry:**
   ```python
   logger.info(f"[LLM IN] ip={remote_addr} provider={provider} model={model} stream={stream} temp={temperature} len={json_length}")
   ```

2. **Base URL Resolution:**
   ```python
   logger.info(f"base={base} source={source}")
   ```

3. **Complete Payload:**
   ```python
   logger.info(f"[OLLAMA PAYLOAD] {json.dumps(ollama_payload, indent=2)}")
   ```

4. **Success/Failure:**
   ```python
   logger.info(f"[LLM OK] provider={provider} tokens={len(content)}")
   logger.error(f"[LLM ERR] status=502 msg={str(e)}")
   ```

**Impact:** Easy troubleshooting and request tracking

---

## Testing Checklist

### Pre-Test Verification:
- [x] `.env` contains `OLLAMA_BASE_URL=http://10.0.0.32:11434`
- [x] `.env` contains `OLLAMA_NUM_GPU=0`
- [x] Backend gateway reads `OLLAMA_BASE_URL`
- [x] Gateway passes `num_gpu=0` in payload
- [x] Frontend has deduplication guard
- [x] Timeout increased to 120s

### Test Procedure:

1. **Restart Flask Application:**
   ```bash
   cd ~/Projects/Joey_AI
   source venv/bin/activate
   python backend/app.py
   ```

2. **Open Browser:**
   - Navigate to `http://10.0.0.32:5000`

3. **Send Test Prompt:**
   - Type: "Hello Joey"
   - Click Send button (or press Ctrl+Enter)

4. **Verify:**
   - ✅ Only ONE message appears in chat (not 3)
   - ✅ No "HTTP 502: BAD GATEWAY" error
   - ✅ Response received within reasonable time
   - ✅ Backend logs show correct base URL: `base=http://10.0.0.32:11434`
   - ✅ Backend logs show `num_gpu: 0` in payload

---

## Expected Behavior After Fixes

### Request Flow:
```
User clicks Send
    ↓
Frontend: sendInProgress guard (prevents duplicates)
    ↓
POST to /v1/chat/completions
    ↓
Gateway: Resolves OLLAMA_BASE_URL from .env
    ↓
Gateway: Builds payload with num_gpu=0
    ↓
Gateway: Logs complete payload
    ↓
Gateway: POST to http://10.0.0.32:11434/api/chat (120s timeout)
    ↓
Ollama: Processes with CPU-only mode
    ↓
Gateway: Returns response
    ↓
Frontend: Displays
