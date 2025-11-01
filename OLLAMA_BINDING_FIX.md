# Ollama Network Binding Fix for JoeyAI

**Date:** October 31, 2025  
**Issue:** HTTP 502 errors due to OLLAMA_BASE_URL misconfiguration  
**Status:** ✅ Complete with automated diagnostic and fix tools

---

## Problem Statement

JoeyAI was experiencing HTTP 502: BAD GATEWAY errors when sending prompts to Ollama. The root cause was a mismatch between:
- **Ollama's actual network binding** (127.0.0.1 or 0.0.0.0)
- **JoeyAI's configured URL** (OLLAMA_BASE_URL in .env)

### Scenario
- Both JoeyAI and Ollama run on the same Jetson Orin Nano (JONS2)
- Ollama service runs as system user `ollama`
- JoeyAI runs as user `joey`
- If Ollama binds to 127.0.0.1 but JoeyAI uses http://10.0.0.32:11434, connection fails
- If Ollama binds to 0.0.0.0, both localhost and host IP work, but localhost is preferred

---

## Solution Overview

We created a **multi-layered solution** with:

1. **Diagnostic Script** - Detects Ollama's binding and tests connectivity
2. **Auto-Fix Script** - Automatically corrects the OLLAMA_BASE_URL
3. **Enhanced Configuration** - Better default values and fallback logic
4. **Improved Logging** - Clear visibility of configuration at startup

---

## Files Created

### 1. `scripts/diagnose_ollama_binding.sh`
**Purpose:** Comprehensive diagnostic tool

**Features:**
- Checks if Ollama service is running
- Detects network binding (127.0.0.1, 0.0.0.0, or other)
- Tests connectivity to both localhost and host IP
- Compares current .env configuration with recommendations
- Saves diagnostic report to file

**Usage:**
```bash
cd ~/Projects/Joey_AI
bash scripts/diagnose_ollama_binding.sh
```

**Sample Output:**
```
==========================================
Ollama Network Binding Diagnostic
==========================================

Step 1: Checking Ollama service status...
✓ Ollama service is running
ℹ PID: 800

Step 2: Detecting Ollama network binding...
ℹ Network binding detected:
   tcp   LISTEN 0   4096   127.0.0.1:11434   0.0.0.0:*

⚠ Ollama is bound to localhost only (127.0.0.1)

Step 3: Detecting host IP address...
ℹ Host IP: 10.0.0.32

Step 4: Testing Ollama connectivity...
   Testing http://127.0.0.1:11434/api/tags...
✓ Localhost (127.0.0.1) connection works
   Testing http://10.0.0.32:11434/api/tags...
✗ Host IP (10.0.0.32) connection failed

Step 5: Configuration Recommendations
==========================================

ℹ Ollama is bound to localhost only
   Both JoeyAI and Ollama are on the same machine
   You MUST use: http://127.0.0.1:11434

Step 6: Checking Current Configuration
==========================================

ℹ Current .env setting:
   OLLAMA_BASE_URL=http://10.0.0.32:11434

⚠ Configuration needs update

   Current:     http://10.0.0.32:11434
   Recommended: http://127.0.0.1:11434

   To fix, run:
   sed -i 's|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=http://127.0.0.1:11434|' /home/joey/Projects/Joey_AI/.env
```

### 2. `scripts/fix_ollama_url.sh`
**Purpose:** Automatic fix script

**Features:**
- Tests connectivity to both URLs
- Automatically selects working URL
- Backs up .env before making changes
- Updates OLLAMA_BASE_URL

**Usage:**
```bash
cd ~/Projects/Joey_AI
bash scripts/fix_ollama_url.sh
```

**What It Does:**
1. Tests `http://127.0.0.1:11434`
2. If that fails, tests `http://<host-ip>:11434`
3. Backs up `.env` to `.env.backup.<timestamp>`
4. Updates `OLLAMA_BASE_URL` to the working URL
5. Provides instructions to restart JoeyAI

---

## Files Modified

### 1. `backend/config.py`

**Added fallback logic for OLLAMA_BASE_URL:**
```python
BASE_URL: str = os.getenv('OLLAMA_BASE_URL', os.getenv('OLLAMA_BASE', 'http://127.0.0.1:11434'))
```

**Changed default from `http://10.0.0.32:11434` to `http://127.0.0.1:11434`**

**Reasoning:**
- When both services are on same machine, localhost is always correct
- Localhost is faster (no network stack)
- Localhost is more secure (can't be accessed remotely)
- Works regardless of network configuration

**Added configuration printing method:**
```python
@classmethod
def print_config(cls) -> None:
    """Print configuration for debugging."""
    print(f"[CONFIG] Ollama BASE_URL: {cls.BASE_URL}")
    print(f"[CONFIG] Ollama MODEL: {cls.MODEL}")
    print(f"[CONFIG] Ollama NUM_GPU: {cls.NUM_GPU} (CPU-only: {cls.NUM_GPU == 0})")
    print(f"[CONFIG] Ollama TIMEOUT: {cls.TIMEOUT}s")
    print(f"[CONFIG] API URL: {cls.get_api_url()}")
```

### 2. `backend/app.py`

**Added configuration logging at startup:**
```python
# Print Ollama configuration for debugging
print("")
OllamaConfig.print_config()
print("")
```

**Now shows on startup:**
```
[PATH_SETUP] sys.path[0]: /home/joey/Projects/Joey_AI
[PATH_SETUP] Project root: /home/joey/Projects/Joey_AI

[CONFIG] Ollama BASE_URL: http://127.0.0.1:11434
[CONFIG] Ollama MODEL: qwen2.5:7b-instruct
[CONFIG] Ollama NUM_GPU: 0 (CPU-only: True)
[CONFIG] Ollama TIMEOUT: 60s
[CONFIG] API URL: http://127.0.0.1:11434/api/generate
```

---

## How to Use

### Quick Fix (Recommended)

```bash
cd ~/Projects/Joey_AI

# Run auto-fix script
bash scripts/fix_ollama_url.sh

# Restart JoeyAI
source venv/bin/activate
python backend/app.py
```

### Detailed Diagnosis

```bash
cd ~/Projects/Joey_AI

# Run diagnostic
bash scripts/diagnose_ollama_binding.sh

# Review the report
cat ollama_binding_diagnosis.txt

# Apply recommended fix
# (script will tell you exact command to run)
```

### Manual
