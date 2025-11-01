#!/bin/bash
# ============================================================================
# Configure Ollama for CPU-only mode on Jetson Orin Nano (10.0.0.32)
# ============================================================================
# This script should be run ON THE JETSON DEVICE (10.0.0.32)
# It configures Ollama to run entirely on CPU to avoid CUDA buffer errors
# ============================================================================

set -e  # Exit on any error

echo "=========================================="
echo "Ollama CPU-Only Configuration Script"
echo "Jetson Orin Nano @ 10.0.0.32"
echo "=========================================="
echo ""

# Configuration variables
OLLAMA_CONFIG_DIR="/etc/ollama"
OLLAMA_CONFIG_FILE="$OLLAMA_CONFIG_DIR/config.toml"
OLLAMA_SERVICE_NAME="ollama"

# Check if running with sufficient privileges
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: This script requires root privileges."
    echo "Please run with: sudo bash configure_ollama_jetson.sh"
    exit 1
fi

echo "Step 1: Creating Ollama configuration directory..."
mkdir -p "$OLLAMA_CONFIG_DIR"
echo "✓ Directory created: $OLLAMA_CONFIG_DIR"
echo ""

echo "Step 2: Creating Ollama configuration file..."
cat > "$OLLAMA_CONFIG_FILE" << 'EOF'
# Ollama Server Configuration
# Force CPU-only mode to prevent CUDA buffer allocation errors

[server]
# Disable GPU usage - run entirely on CPU
num_gpu = 0

# Optional: Set number of CPU threads (adjust based on your Jetson)
# num_threads = 4

# Optional: Memory limits (in MB)
# max_memory = 4096
EOF

echo "✓ Configuration written to: $OLLAMA_CONFIG_FILE"
echo ""
echo "Configuration contents:"
cat "$OLLAMA_CONFIG_FILE"
echo ""

echo "Step 3: Setting file permissions..."
chmod 644 "$OLLAMA_CONFIG_FILE"
echo "✓ Permissions set: 644"
echo ""

echo "Step 4: Restarting Ollama service..."
if systemctl restart "$OLLAMA_SERVICE_NAME"; then
    echo "✓ Ollama service restarted successfully"
else
    echo "⚠ Warning: Failed to restart Ollama service via systemctl"
    echo "   You may need to restart it manually"
fi
echo ""

echo "Step 5: Verifying service status..."
sleep 2
if systemctl is-active --quiet "$OLLAMA_SERVICE_NAME"; then
    echo "✓ Ollama service is running"
    systemctl status "$OLLAMA_SERVICE_NAME" --no-pager | head -n 5
else
    echo "⚠ Warning: Ollama service is not running"
    echo "   Check logs with: journalctl -u ollama -n 50"
fi
echo ""

echo "=========================================="
echo "Configuration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test Ollama with: ollama run qwen2.5:7b-instruct --cpu"
echo "2. Monitor for CUDA errors in: journalctl -u ollama -f"
echo "3. On your JoeyAI machine, restart the application"
echo ""
echo "Troubleshooting:"
echo "- View config: cat $OLLAMA_CONFIG_FILE"
echo "- Check logs: journalctl -u ollama -n 100"
echo "- Service status: systemctl status ollama"
echo ""
