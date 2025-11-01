#!/bin/bash
# ============================================================================
# Verify CPU-Only Configuration for JoeyAI + Ollama
# ============================================================================
# Run this script on the JoeyAI machine to verify the CPU-only setup
# ============================================================================

set -e

echo "=========================================="
echo "JoeyAI CPU-Only Configuration Verifier"
echo "=========================================="
echo ""

# Configuration
OLLAMA_HOST="10.0.0.32"
OLLAMA_PORT="11434"
OLLAMA_BASE_URL="http://${OLLAMA_HOST}:${OLLAMA_PORT}"
PROJECT_DIR="$HOME/Projects/Joey_AI"
ENV_FILE="$PROJECT_DIR/.env"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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
    echo "ℹ $1"
}

# Step 1: Check .env file
echo "Step 1: Checking .env configuration..."
if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found at: $ENV_FILE"
    exit 1
fi

print_success ".env file found"

# Check for required settings
if grep -q "OLLAMA_NUM_GPU=0" "$ENV_FILE"; then
    print_success "OLLAMA_NUM_GPU=0 is set"
else
    print_error "OLLAMA_NUM_GPU=0 not found in .env"
    echo "   Add: OLLAMA_NUM_GPU=0"
    exit 1
fi

if grep -q "OLLAMA_BASE_URL=$OLLAMA_BASE_URL" "$ENV_FILE"; then
    print_success "OLLAMA_BASE_URL is correctly set"
else
    print_warning "OLLAMA_BASE_URL might not match expected value"
    echo "   Expected: OLLAMA_BASE_URL=$OLLAMA_BASE_URL"
fi

if grep -q "OLLAMA_TIMEOUT=60" "$ENV_FILE"; then
    print_success "OLLAMA_TIMEOUT is set to 60 seconds (recommended for CPU)"
else
    print_warning "OLLAMA_TIMEOUT not set to 60 (recommended for CPU mode)"
fi
echo ""

# Step 2: Check connection to Ollama
echo "Step 2: Testing connection to Ollama server..."
if curl -s --max-time 5 "$OLLAMA_BASE_URL/api/tags" > /dev/null 2>&1; then
    print_success "Successfully connected to Ollama at $OLLAMA_BASE_URL"
else
    print_error "Cannot connect to Ollama at $OLLAMA_BASE_URL"
    echo "   Make sure Ollama is running on the Jetson"
    echo "   Check with: ssh user@$OLLAMA_HOST 'systemctl status ollama'"
    exit 1
fi
echo ""

# Step 3: List available models
echo "Step 3: Checking available models..."
MODELS_RESPONSE=$(curl -s "$OLLAMA_BASE_URL/api/tags" 2>/dev/null)
if echo "$MODELS_RESPONSE" | grep -q "qwen2.5:7b-instruct"; then
    print_success "Model qwen2.5:7b-instruct is available"
else
    print_warning "Model qwen2.5:7b-instruct not found"
    echo "   Available models:"
    echo "$MODELS_RESPONSE" | grep -oP '"name":\s*"\K[^"]+' || echo "   (None found)"
fi
echo ""

# Step 4: Test CPU-only inference
echo "Step 4: Testing CPU-only inference..."
print_info "Sending test prompt to Ollama..."

TEST_PAYLOAD='{"model":"qwen2.5:7b-instruct","prompt":"Say hello in one word.","stream":false,"options":{"num_gpu":0}}'
RESPONSE=$(curl -s -X POST "$OLLAMA_BASE_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD" 2>/dev/null)

if [ $? -eq 0 ] && echo "$RESPONSE" | grep -q '"response"'; then
    print_success "Inference test successful"
    RESPONSE_TEXT=$(echo "$RESPONSE" | grep -oP '"response":\s*"\K[^"]+' | head -1)
    echo "   Response: $RESPONSE_TEXT"
else
    print_error "Inference test failed"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

# Step 5: Check Python environment
echo "Step 5: Checking Python environment..."
cd "$PROJECT_DIR"

if [ -d "venv" ]; then
    print_success "Virtual environment found"
else
    print_error "Virtual environment not found at $PROJECT_DIR/venv"
    echo "   Create with: python3 -m venv venv"
    exit 1
fi

if [ -f "venv/bin/activate" ]; then
    print_success "Virtual environment activation script found"
else
    print_error "Cannot find venv/bin/activate"
    exit 1
fi
echo ""

# Step 6: Verify backend configuration
echo "Step 6: Verifying backend configuration..."
if [ -f "backend/config.py" ]; then
    if grep -q "NUM_GPU" "backend/config.py"; then
        print_success "NUM_GPU configuration found in backend/config.py"
    else
        print_error "NUM_GPU not found in backend/config.py"
        exit 1
    fi
else
    print_error "backend/config.py not found"
    exit 1
fi

if [ -f "backend/services/ollama_service.py" ]; then
    if grep -q "num_gpu" "backend/services/ollama_service.py"; then
        print_success "num_gpu integration found in ollama_service.py"
    else
        print_warning "num_gpu might not be passed in requests"
    fi
else
    print_error "backend/services/ollama_service.py not found"
    exit 1
fi
echo ""

echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
echo ""
echo "All checks passed. Your system is configured for CPU-only mode."
echo ""
echo "To start JoeyAI:"
echo "  cd $PROJECT_DIR"
echo "  source venv/bin/activate"
echo "  python backend/app.py"
echo ""
echo "Or use the start script:"
echo "  bash scripts/start.sh"
echo ""
echo "Test URL: http://10.0.0.35:5000"
echo ""
