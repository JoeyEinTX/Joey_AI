# JoeyAI Helper Scripts

This directory contains utility scripts for managing and troubleshooting JoeyAI and its Ollama integration.

---

## Ollama Network Diagnostics

### `diagnose_ollama_binding.sh`
**Purpose:** Comprehensive diagnostic tool for Ollama network binding issues

**What it does:**
- Checks if Ollama service is running
- Detects network binding (127.0.0.1, 0.0.0.0, or other)
- Tests connectivity to both localhost and host IP
- Compares current `.env` configuration with recommendations
- Saves diagnostic report to `ollama_binding_diagnosis.txt`

**Usage:**
```bash
cd ~/Projects/Joey_AI
bash scripts/diagnose_ollama_binding.sh
```

**When to use:**
- Getting HTTP 502 errors when sending prompts
- After changing Ollama configuration
- After system/network changes
- When troubleshooting connectivity issues

**Requirements:**
- Ollama service must be installed
- `ss` or `netstat` command available
- `curl` for connectivity testing
- sudo access for network inspection

---

### `fix_ollama_url.sh`
**Purpose:** Automatically detect and fix OLLAMA_BASE_URL configuration

**What it does:**
- Tests connectivity to localhost (127.0.0.1:11434)
- Falls back to host IP if localhost fails
- Backs up `.env` before making changes
- Updates `OLLAMA_BASE_URL` to working URL

**Usage:**
```bash
cd ~/Projects/Joey_AI
bash scripts/fix_ollama_url.sh
```

**When to use:**
- After running `diagnose_ollama_binding.sh` and finding issues
- Quick fix for 502 errors without manual diagnosis
- After Ollama service restarts or configuration changes

**Safety features:**
- Creates timestamped backup of `.env`
- Only modifies if Ollama is accessible
- Validates connectivity before applying changes

---

## Ollama Configuration

### `configure_ollama_jetson.sh`
**Purpose:** Configure Ollama for CPU-only mode on Jetson devices

**What it does:**
- Creates `/etc/ollama/config.toml` with `num_gpu = 0`
- Restarts Ollama service
- Verifies service status

**Usage:**
```bash
# On Jetson device (10.0.0.32)
sudo bash /tmp/configure_ollama_jetson.sh
```

**Requirements:**
- Must be run on Jetson device
- Requires root/sudo access
- Ollama must be installed as systemd service

---

## Application Management

### `start.sh`
**Purpose:** Start JoeyAI in development mode

**Usage:**
```bash
bash scripts/start.sh
```

**What it does:**
- Activates virtual environment
- Starts Flask development server
- Runs from project root

---

### `start_production.sh`
**Purpose:** Start JoeyAI in production mode

**Usage:**
```bash
bash scripts/start_production.sh
```

**What it does:**
- Activates virtual environment  
- Starts with production settings
- Uses nohup for background execution

---

### `restart.sh`
**Purpose:** Restart JoeyAI application

**Usage:**
```bash
bash scripts/restart.sh
```

**What it does:**
- Stops running instance
- Starts fresh instance
- Useful after configuration changes

---

### `stop.sh`
**Purpose:** Stop running JoeyAI instance

**Usage:**
```bash
bash scripts/stop.sh
```

---

### `status.sh`
**Purpose:** Check if JoeyAI is running

**Usage:**
```bash
bash scripts/status.sh
```

**Output:**
- Process ID if running
- Port and status information

---

## Verification & Testing

### `verify_cpu_mode.sh`
**Purpose:** Verify CPU-only mode configuration

**What it checks:**
- `.env` contains `OLLAMA_NUM_GPU=0`
- Ollama server connectivity
- Model availability
- CPU-only inference test
- Python environment setup
- Backend configuration

**Usage:**
```bash
cd ~/Projects/Joey_AI
bash scripts/verify_cpu_mode.sh
```

---

### `verify_imports.sh`
**Purpose:** Verify Python import paths are configured correctly

**What it checks:**
- Virtual environment setup
- Direct execution (`python backend/app.py`)
- Module execution (`python -m backend.app`)
- Path setup utility
- Backend module imports

**Usage:**
```bash
cd ~/Projects/Joey_AI
bash scripts/verify_imports.sh
```

---

## Development

### `dev.sh`
**Purpose:** Start development server with auto-reload

**Usage:**
```bash
bash scripts/dev.sh
```

---

### `start_server.sh`
**Purpose:** Start server (alias/alternative to start.sh)

**Usage:**
```bash
bash scripts/start_server.sh
```

---

## Making Scripts Executable

After cloning or transferring to a Linux system:

```bash
cd ~/Projects/Joey_AI
chmod +x scripts/*.sh
```

---

## Common Workflows

### First-Time Setup on Jetson
```bash
# 1. Configure Ollama for CPU mode
scp scripts/configure_ollama_jetson.sh user@10.0.0.32:/tmp/
ssh user@10.0.0.32 'sudo bash /tmp/configure_ollama_jetson.sh'

# 2. Fix Ollama URL
bash scripts/fix_ollama_url.sh

# 3. Verify setup
bash scripts/verify_cpu_mode.sh

# 4. Start application
bash scripts/start.sh
```

### Troubleshooting 502 Errors
```bash
# 1. Diagnose the issue
bash scripts/diagnose_ollama_binding.sh

# 2. Review diagnosis
cat ollama_binding_diagnosis.txt

# 3. Apply automatic fix
bash scripts/fix_ollama_url.sh

# 4. Restart application
bash scripts/restart.sh

# 5. Test
# Open http://10.0.0.32:5000 and send a prompt
```

### After Configuration Changes
```bash
# 1. Verify configuration is correct
bash scripts/verify_cpu_mode.sh

# 2. Check import paths
bash scripts/verify_imports.sh

# 3. Restart application
bash scripts/restart.sh
```

---

## Exit Codes

Most diagnostic scripts follow this convention:
- `0`: Success, no issues found
- `1`: Error or issues found
- `2`: Missing dependencies

Check exit code:
```bash
bash scripts/diagnose_ollama_binding.sh
echo $?  # Shows exit code
```

---

## Troubleshooting Script Issues

### Script not executable
```bash
chmod +x scripts/<script-name>.sh
```

### Script not found
```bash
# Ensure you're in project root
cd ~/Projects/Joey_AI
pwd  # Should show /home/joey/Projects/Joey_AI

# Then run with relative path
bash scripts/<script-name>.sh
```

### Permission denied
```bash
# For system-level scripts (like configure_ollama_jetson.sh)
sudo bash scripts/<script-name>.sh
```

---

## Script Maintenance

### Adding New Scripts

1. Create in `scripts/` directory
2. Add shebang: `#!/bin/bash`
3. Add descriptive header comment
4. Make executable: `chmod +x scripts/new_script.sh`
5. Update this README

### Testing Scripts

```bash
# Dry-run mode (if supported)
bash -n scripts/<script-name>.sh  # Syntax check

# With verbose output
bash -x scripts/<script-name>.sh  # Debug mode
```

---

## Related Documentation

- **`CPU_MODE_SETUP.md`** - Complete CPU-only mode guide
- **`OLLAMA_BINDING_FIX.md`** - Network binding troubleshooting
- **`502_FIX_SUMMARY.md`** - HTTP 502 error resolution
- **`IMPORT_PATH_FIX.md`** - Python import configuration

---

## Support

For issues with scripts:
1. Check script output for error messages
2. Review relevant documentation file
3. Verify prerequisites are installed
4. Check logs: `journalctl -u ollama` (Ollama) or `flask.log` (JoeyAI)

---

**Last Updated:** October 31, 2025
