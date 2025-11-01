#!/bin/bash
# ============================================================================
# Ollama Network Binding Diagnostic Script for JoeyAI
# ============================================================================
# This script diagnoses Ollama's network binding configuration and provides
# recommendations for JoeyAI's OLLAMA_BASE_URL setting.
# ============================================================================

set -e

echo "=========================================="
echo "Ollama Network Binding Diagnostic"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Step 1: Check if Ollama service is running
echo "Step 1: Checking Ollama service status..."
if systemctl is-active --quiet ollama; then
    print_success "Ollama service is running"
    OLLAMA_PID=$(systemctl show --property MainPID --value ollama)
    print_info "PID: $OLLAMA_PID"
else
    print_error "Ollama service is not running"
    echo "   Start with: sudo systemctl start ollama"
    exit 1
fi
echo ""

# Step 2: Check network binding
echo "Step 2: Detecting Ollama network binding..."
BINDING=$(sudo ss -tuln | grep ':11434' || echo "")

if [ -z "$BINDING" ]; then
    print_error "Ollama is not listening on port 11434"
    echo "   Check Ollama logs: sudo journalctl -u ollama -n 50"
    exit 1
fi

print_info "Network binding detected:"
echo "$BINDING" | sed 's/^/   /'
echo ""

# Parse binding address
if echo "$BINDING" | grep -q '127.0.0.1:11434'; then
    BIND_TYPE="localhost"
    BIND_ADDR="127.0.0.1"
    print_warning "Ollama is bound to localhost only (127.0.0.1)"
elif echo "$BINDING" | grep -q '0.0.0.0:11434'; then
    BIND_TYPE="all"
    BIND_ADDR="0.0.0.0"
    print_success "Ollama is bound to all interfaces (0.0.0.0)"
elif echo "$BINDING" | grep -q '\*:11434'; then
    BIND_TYPE="all"
    BIND_ADDR="0.0.0.0"
    print_success "Ollama is bound to all interfaces (*)"
else
    BIND_TYPE="unknown"
    BIND_ADDR="unknown"
    print_warning "Unknown binding pattern"
fi
echo ""

# Step 3: Get host IP
echo "Step 3: Detecting host IP address..."
HOST_IP=$(hostname -I | awk '{print $1}')
print_info "Host IP: $HOST_IP"
echo ""

# Step 4: Test connectivity
echo "Step 4: Testing Ollama connectivity..."

# Test localhost
echo "   Testing http://127.0.0.1:11434/api/tags..."
if curl -s --max-time 2 http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    print_success "Localhost (127.0.0.1) connection works"
    LOCALHOST_WORKS=true
else
    print_error "Localhost (127.0.0.1) connection failed"
    LOCALHOST_WORKS=false
fi

# Test host IP
echo "   Testing http://$HOST_IP:11434/api/tags..."
if curl -s --max-time 2 http://$HOST_IP:11434/api/tags > /dev/null 2>&1; then
    print_success "Host IP ($HOST_IP) connection works"
    HOSTIP_WORKS=true
else
    print_error "Host IP ($HOST_IP) connection failed"
    HOSTIP_WORKS=false
fi
echo ""

# Step 5: Recommendations
echo "Step 5: Configuration Recommendations"
echo "=========================================="
echo ""

PROJECT_DIR="$HOME/Projects/Joey_AI"
ENV_FILE="$PROJECT_DIR/.env"

# Determine recommended URL
if [ "$BIND_TYPE" = "localhost" ]; then
    RECOMMENDED_URL="http://127.0.0.1:11434"
    print_info "Ollama is bound to localhost only"
    echo "   Both JoeyAI and Ollama are on the same machine"
    echo "   You MUST use: $RECOMMENDED_URL"
elif [ "$BIND_TYPE" = "all" ]; then
    if [ "$LOCALHOST_WORKS" = true ]; then
        RECOMMENDED_URL="http://127.0.0.1:11434"
        print_info "Ollama accepts all interfaces, but localhost is preferred"
        echo "   Using localhost is faster and more secure"
        echo "   Recommended: $RECOMMENDED_URL"
        echo "   Alternative: http://$HOST_IP:11434"
    else
        RECOMMENDED_URL="http://$HOST_IP:11434"
        print_warning "Localhost connection failed, use host IP"
        echo "   Recommended: $RECOMMENDED_URL"
    fi
else
    RECOMMENDED_URL="http://127.0.0.1:11434"
    print_warning "Could not determine binding type"
    echo "   Try: $RECOMMENDED_URL"
fi
echo ""

# Step 6: Check current configuration
echo "Step 6: Checking Current Configuration"
echo "=========================================="
echo ""

if [ -f "$ENV_FILE" ]; then
    CURRENT_URL=$(grep "^OLLAMA_BASE_URL=" "$ENV_FILE" | cut -d'=' -f2)
    print_info "Current .env setting:"
    echo "   OLLAMA_BASE_URL=$CURRENT_URL"
    echo ""
    
    if [ "$CURRENT_URL" = "$RECOMMENDED_URL" ]; then
        print_success "Configuration is correct!"
    else
        print_warning "Configuration needs update"
        echo ""
        echo "   Current:     $CURRENT_URL"
        echo "   Recommended: $RECOMMENDED_URL"
        echo ""
        echo "   To fix, run:"
        echo "   sed -i 's|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=$RECOMMENDED_URL|' $ENV_FILE"
    fi
else
    print_error ".env file not found at $ENV_FILE"
fi
echo ""

# Step 7: Summary
echo "=========================================="
echo "Diagnostic Summary"
echo "=========================================="
echo ""
echo "Ollama Status:"
echo "  - Service: Running (PID $OLLAMA_PID)"
echo "  - Binding: $BIND_ADDR:11434 ($BIND_TYPE)"
echo "  - Localhost works: $LOCALHOST_WORKS"
echo "  - Host IP works: $HOSTIP_WORKS"
echo ""
echo "Recommended Configuration:"
echo "  OLLAMA_BASE_URL=$RECOMMENDED_URL"
echo ""

if [ "$CURRENT_URL" != "$RECOMMENDED_URL" ]; then
    echo "Action Required:"
    echo "  1. Update .env file:"
    echo "     sed -i 's|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=$RECOMMENDED_URL|' $ENV_FILE"
    echo ""
    echo "  2. Restart JoeyAI:"
    echo "     cd $PROJECT_DIR"
    echo "     source venv/bin/activate"
    echo "     python backend/app.py"
    echo ""
else
    echo "✓ Configuration is correct. If you're still seeing 502 errors:"
    echo "  1. Restart Ollama: sudo systemctl restart ollama"
    echo "  2. Restart JoeyAI: cd $PROJECT_DIR && source venv/bin/activate && python backend/app.py"
    echo ""
fi

# Save diagnostic results to file
DIAG_FILE="$PROJECT_DIR/ollama_binding_diagnosis.txt"
cat > "$DIAG_FILE" << EOF
Ollama Network Binding Diagnosis
Generated: $(date)

Service Status: Running (PID $OLLAMA_PID)
Binding Type: $BIND_TYPE
Bind Address: $BIND_ADDR:11434
Host IP: $HOST_IP

Connectivity Tests:
- Localhost (127.0.0.1): $LOCALHOST_WORKS
- Host IP ($HOST_IP): $HOSTIP_WORKS

Recommended Configuration:
OLLAMA_BASE_URL=$RECOMMENDED_URL

Current Configuration:
OLLAMA_BASE_URL=$CURRENT_URL

Network Binding Details:
$BINDING
EOF

print_info "Diagnostic results saved to: $DIAG_FILE"
echo ""
