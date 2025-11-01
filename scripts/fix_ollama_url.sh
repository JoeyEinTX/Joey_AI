#!/bin/bash
# ============================================================================
# Ollama URL Auto-Fix Script for JoeyAI
# ============================================================================
# Automatically detects and fixes the OLLAMA_BASE_URL configuration
# ============================================================================

set -e

echo "=========================================="
echo "Ollama URL Auto-Fix"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo "$1"
}

PROJECT_DIR="$HOME/Projects/Joey_AI"
ENV_FILE="$PROJECT_DIR/.env"

# Check if Ollama is running
if ! systemctl is-active --quiet ollama; then
    print_error "Ollama service is not running"
    echo "Start with: sudo systemctl start ollama"
    exit 1
fi

# Test both URLs
LOCALHOST_URL="http://127.0.0.1:11434"
HOST_IP=$(hostname -I | awk '{print $1}')
HOSTIP_URL="http://$HOST_IP:11434"

print_info "Testing connectivity..."

# Test localhost
if curl -s --max-time 2 "$LOCALHOST_URL/api/tags" > /dev/null 2>&1; then
    print_success "Localhost connection works"
    RECOMMENDED_URL="$LOCALHOST_URL"
    WORKS=true
elif curl -s --max-time 2 "$HOSTIP_URL/api/tags" > /dev/null 2>&1; then
    print_success "Host IP connection works"
    RECOMMENDED_URL="$HOSTIP_URL"
    WORKS=true
else
    print_error "Neither localhost nor host IP connections work"
    echo "Check Ollama service: sudo systemctl status ollama"
    exit 1
fi

echo ""
print_info "Recommended URL: $RECOMMENDED_URL"
echo ""

# Update .env file
if [ -f "$ENV_FILE" ]; then
    # Backup .env
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "Backed up .env file"
    
    # Update OLLAMA_BASE_URL
    if grep -q "^OLLAMA_BASE_URL=" "$ENV_FILE"; then
        sed -i "s|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=$RECOMMENDED_URL|" "$ENV_FILE"
        print_success "Updated OLLAMA_BASE_URL in .env"
    else
        echo "OLLAMA_BASE_URL=$RECOMMENDED_URL" >> "$ENV_FILE"
        print_success "Added OLLAMA_BASE_URL to .env"
    fi
    
    echo ""
    print_success "Configuration updated successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart JoeyAI:"
    echo "     cd $PROJECT_DIR"
    echo "     source venv/bin/activate"
    echo "     python backend/app.py"
    echo ""
else
    print_error ".env file not found at $ENV_FILE"
    exit 1
fi
