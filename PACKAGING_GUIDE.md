# JoeyAI Packaging Guide

**Version:** 1.0.0  
**Date:** October 31, 2025  
**Status:** ✅ Complete - Ready for Distribution

---

## Overview

JoeyAI has been converted into a packaging-ready Python application with multiple startup methods and proper distribution support.

---

## Three Ways to Start JoeyAI

### Method 1: Project-Level Script (Recommended for Development)

**Usage:**
```bash
cd ~/Projects/Joey_AI
source venv/bin/activate
python start.py
```

**Advantages:**
- Simplest command
- Clear project-level entry point
- Works without installation

---

### Method 2: Direct Module Execution

**Usage:**
```bash
cd ~/Projects/Joey_AI
source venv/bin/activate
python backend/app.py
```

**Or as a module:**
```bash
python -m backend.app
```

**Advantages:**
- Traditional Python module execution
- Compatible with existing workflows
- No additional files needed

---

### Method 3: Installed Console Command (Production)

**Installation:**
```bash
cd ~/Projects/Joey_AI
pip install -e .  # Editable install for development
```

**Or for production:**
```bash
pip install .
```

**Usage:**
```bash
joeyai  # Can be run from anywhere!
```

**Advantages:**
- System-wide command
- No need to cd into project directory
- Production-ready
- Can be installed via pip from git or PyPI

---

## Expected Startup Output

All three methods should produce identical output:

```
[PATH_SETUP] sys.path[0]: /home/joey/Projects/Joey_AI
[PATH_SETUP] Project root: /home/joey/Projects/Joey_AI

[CONFIG] Ollama BASE_URL: http://127.0.0.1:11434
[CONFIG] Ollama MODEL: qwen2.5:7b-instruct
[CONFIG] Ollama NUM_GPU: 0 (CPU-only: True)
[CONFIG] Ollama TIMEOUT: 60s
[CONFIG] API URL: http://127.0.0.1:11434/api/generate

==================================================
🚀 Starting JoeyAI v1.0.0
📍 Server: http://0.0.0.0:5000
🔧 Debug mode: False
==================================================

 * Serving Flask app 'backend.app'
 * Running on http://0.0.0.0:5000
```

---

## Installation Methods

### Development Installation (Editable)

```bash
cd ~/Projects/Joey_AI
pip install -e .
```

**Benefits:**
- Changes to code immediately reflected
- No need to reinstall after edits
- Creates `joeyai` command
- Perfect for development

### Production Installation (From Directory)

```bash
cd ~/Projects/Joey_AI
pip install .
```

**Benefits:**
- Installs as a regular package
- Files copied to site-packages
- System-wide `joeyai` command
- Production deployment ready

### Installation from Git (Remote)

```bash
pip install git+https://github.com/JoeyEinTX/Joey_AI.git
```

**Benefits:**
- Direct installation from repository
- No need to clone first
- Great for automated deployments
- Version pinning with git tags

---

## Package Structure

```
Joey_AI/
├── backend/              # Main Python package
│   ├── __init__.py
│   ├── app.py           # Main entry point with main() function
│   ├── config.py
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/            # Web interface (included via MANIFEST.in)
│   ├── static/
│   └── templates/
├── scripts/             # Helper scripts
├── start.py            # Project-level entry point
├── setup.py            # Setuptools configuration
├── pyproject.toml      # Modern packaging metadata
├── MANIFEST.in         # Non-code files to include
├── requirements.txt    # Dependencies list
└── README.md           # Project documentation
```

---

## Files Created/Modified

### New Files:
1. **`start.py`** - Project-level startup script
2. **`setup.py`** - Setuptools packaging configuration
3. **`pyproject.toml`** - Modern Python packaging metadata
4. **`MANIFEST.in`** - Specifies non-code files to include
5. **`PACKAGING_GUIDE.md`** - This documentation

### Modified Files:
1. **`backend/app.py`** - Refactored with `main()` function
   - Added `__package__` resolution
   - Encapsulated Flask startup in `main()`
   - Enhanced startup banner

---

## Key Changes in backend/app.py

### Before:
```python
# Direct execution code at module level
app = Flask(__name__, ...)
app.register_blueprint(...)
if __name__ == '__main__':
    app.run(...)
```

### After:
```python
# PATH SETUP (stays first)
import sys
from pathlib import Path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Package resolution
if __package__ is None:
    __package__ = "backend"

# Main function encapsulation
def main():
    """Main entry point for JoeyAI application."""
    # All Flask setup code moved here
    app = Flask(__name__, ...)
    app.register_blueprint(...)
    app.run(...)

if __name__ == '__main__':
    main()
```

**Benefits:**
- Consistent imports across all execution methods
- Proper package resolution
- Entry point for console_scripts
- Maintains backward compatibility

---

## Console Command Setup

The `setup.py` defines a console command:

```python
entry_points={
    "console_scripts": [
        "joeyai=backend.app:main",
    ],
},
```

This creates a `joeyai` command that:
1. Runs `backend.app:main()` function
2. Works from any directory
3. Activates in virtual environment automatically
4. Perfect for systemd services

---

## Systemd Service Example

Create `/etc/systemd/system/joeyai.service`:

```ini
[Unit]
Description=JoeyAI Chat Application
After=network.target ollama.service

[Service]
Type=simple
User=joey
WorkingDirectory=/home/joey/Projects/Joey_AI
Environment="PATH=/home/joey/Projects/Joey_AI/venv/bin"
ExecStart=/home/joey/Projects/Joey_AI/venv/bin/joeyai
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable joeyai
sudo systemctl start joeyai
```

---

## Testing All Methods

### Test Script

Create `test_startup.sh`:
```bash
#!/bin/bash
cd ~/Projects/Joey_AI
source venv/bin/activate

echo "=== Testing Method 1: start.py ==="
timeout 3 python start.py || true
echo ""

echo "=== Testing Method 2: backend/app.py ==="
timeout 3 python backend/app.py || true
echo ""

echo "=== Testing Method 3: -m backend.app ==="
timeout 3 python -m backend.app || true
echo ""

if command -v joeyai &> /dev/null; then
    echo "=== Testing Method 4: joeyai command ==="
    timeout 3 joeyai || true
else
    echo "=== joeyai command not installed ==="
    echo "Run: pip install -e ."
fi
```

---

## Distribution Options

### 1. GitHub Releases
```bash
# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Users can install with:
pip install git+https://github.com/JoeyEinTX/Joey_AI.git@v1.0.0
```

### 2. PyPI (Python Package Index)
```bash
# Build distribution
python -m build

# Upload to PyPI
python -m twine upload dist/*

# Users can install with:
pip install joeyai
```

### 3. Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install .
CMD ["joeyai"]
```

---

## Dependencies

### Runtime Dependencies:
- Flask >= 3.0.0
- requests >= 2.31.0
- urllib3 >= 2.0.7
- python-dotenv >= 1.0.0
- gunicorn >= 21.2.0

### Development Dependencies:
- pytest >= 7.0.0
- black >= 23.0.0
- flake8 >= 6.0.0

**Install dev dependencies:**
```bash
pip install -e ".[dev]"
```

---

## Troubleshooting

### Issue: `joeyai` command not found
**Solution:**
```bash
# Ensure package is installed
pip install -e .

# Verify installation
pip list | grep joeyai

# Check console_scripts
pip show joeyai
```

### Issue: Import errors when using `joeyai` command
**Solution:**
```bash
# Reinstall package
pip uninstall joeyai
pip install -e .

# Verify PATH SETUP logs appear
joeyai
```

### Issue: Frontend files not found
**Solution:**
```bash
# Check MANIFEST.in includes frontend/
cat MANIFEST.in

# Reinstall with --force-reinstall
pip install --force-reinstall -e .
```

---

## Best Practices

### Development Workflow:
1. Use editable install: `pip install -e .`
2. Use `python start.py` for quick testing
3. Use `joeyai` command to test as users will

### Production Deployment:
1. Use regular install: `pip install .`
2. Use `joeyai` command via systemd
3. Set environment variables in systemd service file

### Version Management:
1. Update version in `setup.py` and `pyproject.toml`
2. Tag releases in git
3. Build and distribute with updated version

---

## Future Enhancements

### Potential Additions:
- [ ] Add `joeyai --version` flag
- [ ] Add `joeyai --config` to show configuration
- [ ] Add `joeyai init` to create .env file
- [ ] Add `joeyai diagnose` to run diagnostics
- [ ] Support multiple configuration profiles

---

## Summary

JoeyAI is now a fully packaging-ready Python application with:

✅ Three startup methods (start.py, module execution, console command)  
✅ Proper setuptools configuration (setup.py)  
✅ Modern packaging metadata (pyproject.toml)  
✅ Frontend file inclusion (MANIFEST.in)  
✅ Consistent import resolution across all methods  
✅ Production-ready console command  
✅ Systemd service compatibility  
✅ Ready for PyPI distribution  

**All startup methods produce identical output and work reliably.** 🎉

---

**Last Updated:** October 31, 2025
