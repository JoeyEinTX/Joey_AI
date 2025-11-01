# CPU-Only Mode Setup Guide for JoeyAI + Ollama on Jetson Orin Nano

## Overview

This guide configures JoeyAI to run Ollama in **CPU-only mode** on a Jetson Orin Nano, preventing CUDA buffer allocation errors that can occur with GPU-accelerated inference on resource-constrained devices.

## Problem Statement

The Jetson Orin Nano may encounter `unable to allocate CUDA0 buffer` errors when running Ollama with GPU acceleration, especially with larger models like `qwen2.5:7b-instruct`. This happens due to:
- Limited GPU memory (typically 8GB shared with system RAM)
- Memory fragmentation from other processes
- Insufficient CUDA buffer allocation for the model size

## Solution Architecture

The solution implements CPU-only mode at **two levels**:

1. **Server-level**: Ollama server on Jetson configured to never use GPU
2. **Request-level**: JoeyAI sends `num_gpu=0` with every API request

This dual-layer approach ensures stable, reliable inference without CUDA errors.

---

## Implementation Steps

### Part 1: Configure Ollama Server (on Jetson Orin Nano @ 10.0.0.32)

#### Option A: Automated Setup (Recommended)

1. Copy the configuration script to the Jetson:
   ```bash
   scp scripts/configure_ollama_jetson.sh user@10.0.0.32:/tmp/
   ```

2. SSH into the Jetson and run the script:
   ```bash
   ssh user@10.0.0.32
   sudo bash /tmp/configure_ollama_jetson.sh
   ```

The script will:
- Create `/etc/ollama/config.toml`
- Set `num_gpu = 0`
- Restart the Ollama service
- Verify the service is running

#### Option B: Manual Setup

1. SSH into the Jetson:
   ```bash
   ssh user@10.0.0.32
   ```

2. Create the Ollama configuration directory:
   ```bash
   sudo mkdir -p /etc/ollama
   ```

3. Create the configuration file:
   ```bash
   sudo nano /etc/ollama/config.toml
   ```

4. Add the following content:
   ```toml
   [server]
   num_gpu = 0
   ```

5. Save and exit (Ctrl+X, Y, Enter)

6. Restart Ollama:
   ```bash
   sudo systemctl restart ollama
   sudo systemctl status ollama
   ```

---

### Part 2: Configure JoeyAI (on your machine @ 10.0.0.35)

The following changes have already been implemented in this repository:

#### 1. Environment Configuration (.env)

**Changes:**
- Added `OLLAMA_NUM_GPU=0` to force CPU mode
- Increased `OLLAMA_TIMEOUT=60` for slower CPU inference

**Verification:**
```bash
cat .env | grep OLLAMA
```

Should show:
```
OLLAMA_BASE_URL=http://10.0.0.32:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_NUM_GPU=0
OLLAMA_TIMEOUT=60
```

#### 2. Backend Configuration (backend/config.py)

**Changes:**
- Added `NUM_GPU` parameter to `OllamaConfig` class
- Reads from `OLLAMA_NUM_GPU` environment variable
- Defaults to `0` if not specified

**Key addition:**
```python
NUM_GPU: int = int(os.getenv('OLLAMA_NUM_GPU', '0'))
```

#### 3. Ollama Service (backend/services/ollama_service.py)

**Changes:**
- Modified `_build_payload()` to include `num_gpu` in request options
- Every API request now explicitly sets `"num_gpu": 0`

**Key modification:**
```python
def _build_payload(self, prompt: str, **kwargs) -> Dict[str, Any]:
    payload = {
        "model": OllamaConfig.MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_gpu": OllamaConfig.NUM_GPU
        }
    }
    # ... rest of method
```

---

## Verification

### Automated Verification (Recommended)

Run the verification script:
```bash
cd ~/Projects/Joey_AI
bash scripts/verify_cpu_mode.sh
```

This script checks:
- ✓ .env configuration
- ✓ Connection to Ollama server
- ✓ Available models
- ✓ CPU-only inference test
- ✓ Python environment
- ✓ Backend configuration

### Manual Verification

#### On Jetson (10.0.0.32):

1. Check Ollama configuration:
   ```bash
   cat /etc/ollama/config.toml
   ```

2. Test CPU-only mode:
   ```bash
   ollama run qwen2.5:7b-instruct --cpu
   ```
   Type a test prompt. Should respond without CUDA errors.

3. Monitor logs for errors:
   ```bash
   journalctl -u ollama -f
   ```
   Should NOT show "unable to allocate CUDA0 buffer" errors.

#### On JoeyAI Machine (10.0.0.35):

1. Start JoeyAI:
   ```bash
   cd ~/Projects/Joey_AI
   source venv/bin/activate
   python backend/app.py
   ```

2. Open browser to: `http://10.0.0.35:5000`

3. Send test prompt: `"Hello Joey"`

4. Check backend logs for confirmation:
   ```
   INFO:OllamaService:Successfully received response from Ollama
   ```

---

## Performance Considerations

### CPU vs GPU Performance

| Aspect | CPU Mode | GPU Mode |
|--------|----------|----------|
| **Stability** | ✓ Excellent | ⚠ Can crash with buffer errors |
| **Memory** | Lower usage | Higher CUDA memory |
| **Speed** | Slower (2-5x) | Faster |
| **Reliability** | ✓ Very reliable | Depends on available VRAM |

### Optimization Tips for CPU Mode

1. **Increase timeout**: Already set to 60s in `.env`
2. **Use smaller models**: Consider `qwen2.5:3b` or `qwen2.5:1.5b` for faster responses
3. **Adjust thread count**: In `/etc/ollama/config.toml`, add:
   ```toml
   [server]
   num_gpu = 0
   num_threads = 4  # Adjust based on CPU cores
   ```
4. **Limit concurrent requests**: Ensure only one inference at a time

---

## Troubleshooting

### Problem: "Connection refused" to Ollama

**Solution:**
1. Verify Ollama is running on Jetson:
   ```bash
   ssh user@10.0.0.32 'systemctl status ollama'
   ```
2. Check if port 11434 is accessible:
   ```bash
   curl http://10.0.0.32:11434/api/tags
   ```

### Problem: Still seeing CUDA errors

**Solution:**
1. Verify server config exists:
   ```bash
   ssh user@10.0.0.32 'cat /etc/ollama/config.toml'
   ```
2. Restart Ollama service:
   ```bash
   ssh user@10.0.0.32 'sudo systemctl restart ollama'
   ```
3. Check environment variable is set:
   ```bash
   grep OLLAMA_NUM_GPU .env
   ```

### Problem: Responses are very slow

**Expected behavior:** CPU mode is slower than GPU mode.

**If excessively slow:**
1. Check CPU load on Jetson:
   ```bash
   ssh user@10.0.0.32 'top'
   ```
2. Consider using a smaller model
3. Increase thread count in Ollama config

### Problem: Application won't start

**Solution:**
1. Check for Python errors:
   ```bash
   cd ~/Projects/Joey_AI
   source venv/bin/activate
   python backend/app.py
   ```
2. Verify all dependencies installed:
   ```bash
   pip install -r requirements.txt
   ```

---

## Architecture Improvements Made

### 1. Request-Level Control
**Benefit:** Every API request explicitly sets `num_gpu=0`, ensuring no GPU usage even if server config fails.

### 2. Configuration Hierarchy
**Benefit:** Multiple layers of CPU enforcement:
- Environment variable → Config class → Service layer → API request

### 3. Increased Timeout
**Benefit:** 60-second timeout accommodates slower CPU inference without premature failures.

### 4. Persistent HTTP Sessions
**Benefit:** Connection pooling reduces overhead for repeated requests to Ollama server.

### 5. Comprehensive Validation
**Benefit:** Automated verification scripts catch configuration issues before they cause runtime errors.

---

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `.env` | Added `OLLAMA_NUM_GPU=0`, increased timeout | Environment configuration |
| `backend/config.py` | Added `NUM_GPU` parameter | Configuration management |
| `backend/services/ollama_service.py` | Modified payload builder | Request-level GPU control |
| `scripts/configure_ollama_jetson.sh` | New file | Automated Jetson setup |
| `scripts/verify_cpu_mode.sh` | New file | Automated verification |

---

## Quick Reference Commands

### On Jetson (10.0.0.32)
```bash
# View Ollama config
cat /etc/ollama/config.toml

# Restart Ollama
sudo systemctl restart ollama

# Check status
sudo systemctl status ollama

# View logs
journalctl -u ollama -f

# Test CPU mode
ollama run qwen2.5:7b-instruct --cpu
```

### On JoeyAI Machine (10.0.0.35)
```bash
# Verify configuration
bash scripts/verify_cpu_mode.sh

# Start application
cd ~/Projects/Joey_AI
source venv/bin/activate
python backend/app.py

# Check logs
tail -f flask.log
```

---

## Rollback Instructions

If you need to revert to GPU mode:

1. **On Jetson:**
   ```bash
   sudo rm /etc/ollama/config.toml
   sudo systemctl restart ollama
   ```

2. **On JoeyAI:**
   - Edit `.env`: Remove or set `OLLAMA_NUM_GPU=1`
   - Restart application

---

## Summary

This CPU-only configuration provides **stable, reliable inference** at the cost of slower response times. It's ideal for development, testing, or situations where GPU memory constraints cause crashes. The dual-layer approach (server + request level) ensures robust CPU-only operation even if one layer fails.

For production use with better performance, consider:
- Upgrading to a device with more GPU memory
- Using smaller, quantized models
- Implementing request queuing to manage memory usage
