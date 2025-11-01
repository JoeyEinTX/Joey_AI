#!/usr/bin/env python
"""Test script for system_stats endpoint"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Test import
try:
    from backend.routes.system_routes import system_bp
    print("[OK] Import successful")
    print(f"[OK] Blueprint name: {system_bp.name}")
    print(f"[OK] Blueprint has {len(system_bp.deferred_functions)} deferred functions")
    
    # List routes
    for rule in system_bp.deferred_functions:
        print(f"[OK] Route registered: {rule}")
    
except Exception as e:
    print(f"[ERROR] Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
