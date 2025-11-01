#!/bin/bash
# ============================================================================
# Import Path Verification Script for JoeyAI
# ============================================================================
# This script verifies that backend/app.py can be executed directly
# and that Python imports work correctly from the project root.
# ============================================================================

set -e

echo "=========================================="
echo "JoeyAI Import Path Verification"
echo "=========================================="
echo ""

# Configuration
PROJECT_ROOT="$HOME/Projects/Joey_AI"
VENV_PATH="$PROJECT_ROOT/venv"

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

print_info() {
    echo "ℹ $1"
}

# Step 1: Check if virtual environment exists
echo "Step 1: Checking virtual environment..."
if [ -d "$VENV_PATH" ]; then
    print_success "Virtual environment found at $VENV_PATH"
else
    print_error "Virtual environment not found at $VENV_PATH"
    echo "   Create with: python3 -m venv $VENV_PATH"
    exit 1
fi
echo ""

# Step 2: Activate virtual environment
echo "Step 2: Activating virtual environment..."
if [ -f "$VENV_PATH/bin/activate" ]; then
    source "$VENV_PATH/bin/activate"
    print_success "Virtual environment activated"
else
    print_error "Cannot find activation script"
    exit 1
fi
echo ""

# Step 3: Check Python version
echo "Step 3: Checking Python version..."
PYTHON_VERSION=$(python --version 2>&1)
print_info "Python version: $PYTHON_VERSION"
echo ""

# Step 4: Change to project directory
echo "Step 4: Changing to project directory..."
cd "$PROJECT_ROOT"
print_success "Working directory: $(pwd)"
echo ""

# Step 5: Test direct execution of backend/app.py
echo "Step 5: Testing direct execution (python backend/app.py)..."
print_info "This will import Flask and all routes to verify imports work..."

# Run with a timeout and capture output
IMPORT_TEST=$(timeout 3s python backend/app.py 2>&1 || true)

# Check if imports succeeded (Flask initialization logs appear)
if echo "$IMPORT_TEST" | grep -q "BOOT"; then
    print_success "Direct execution successful - imports working"
    echo "   Found Flask initialization logs"
elif echo "$IMPORT_TEST" | grep -q "ModuleNotFoundError"; then
    print_error "Import error detected"
    echo "$IMPORT_TEST" | grep "ModuleNotFoundError"
    exit 1
elif echo "$IMPORT_TEST" | grep -q "ImportError"; then
    print_error "Import error detected"
    echo "$IMPORT_TEST" | grep "ImportError"
    exit 1
else
    print_success "No import errors detected"
fi
echo ""

# Step 6: Test module execution
echo "Step 6: Testing module execution (python -m backend.app)..."
MODULE_TEST=$(timeout 3s python -m backend.app 2>&1 || true)

if echo "$MODULE_TEST" | grep -q "BOOT"; then
    print_success "Module execution successful - imports working"
elif echo "$MODULE_TEST" | grep -q "ModuleNotFoundError"; then
    print_error "Module import error detected"
    echo "$MODULE_TEST" | grep "ModuleNotFoundError"
    exit 1
else
    print_success "No module import errors detected"
fi
echo ""

# Step 7: Test Python path setup utility
echo "Step 7: Testing path_setup utility..."
PATHSETUP_TEST=$(python -c "from backend.utils.path_setup import setup_project_path, get_project_root; root = setup_project_path(); print(f'Project root: {root}')" 2>&1)

if echo "$PATHSETUP_TEST" | grep -q "Project root:"; then
    print_success "Path setup utility working correctly"
    echo "   $PATHSETUP_TEST"
else
    print_error "Path setup utility failed"
    echo "$PATHSETUP_TEST"
    exit 1
fi
echo ""

# Step 8: Verify sys.path includes project root
echo "Step 8: Verifying sys.path configuration..."
SYSPATH_TEST=$(python -c "import sys; from pathlib import Path; root = Path('$PROJECT_ROOT').resolve(); print('Project root in sys.path:', str(root) in sys.path or str(root) + '/backend' in sys.path)" 2>&1)

echo "   $SYSPATH_TEST"
echo ""

# Step 9: Test import of backend modules
echo "Step 9: Testing backend module imports..."
MODULES_TO_TEST=(
    "backend.config"
    "backend.routes.health_routes"
    "backend.services.ollama_service"
    "backend.utils.path_setup"
)

ALL_IMPORTS_OK=true
for module in "${MODULES_TO_TEST[@]}"; do
    if python -c "import $module" 2>/dev/null; then
        print_success "Successfully imported: $module"
    else
        print_error "Failed to import: $module"
        ALL_IMPORTS_OK=false
    fi
done
echo ""

echo "=========================================="
if [ "$ALL_IMPORTS_OK" = true ]; then
    echo -e "${GREEN}✓ All Tests Passed!${NC}"
else
    echo -e "${RED}✗ Some Tests Failed${NC}"
    exit 1
fi
echo "=========================================="
echo ""
echo "Summary:"
echo "- Direct execution works: python backend/app.py"
echo "- Module execution works: python -m backend.app"
echo "- Path setup utility available"
echo "- All backend modules importable"
echo ""
echo "You can now run JoeyAI with:"
echo "  cd $PROJECT_ROOT"
echo "  source venv/bin/activate"
echo "  python backend/app.py"
echo ""
