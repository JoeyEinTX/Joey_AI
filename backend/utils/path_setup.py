"""
Path Setup Utility for JoeyAI Backend

This module provides a centralized way to add the project root to Python's sys.path,
enabling absolute imports to work correctly when running backend scripts directly
(e.g., `python backend/app.py`) instead of as a module (`python -m backend.app`).

Usage:
    from backend.utils.path_setup import setup_project_path
    setup_project_path()

This should be called at the very top of any entry point script before other imports.
"""

import sys
import os
from pathlib import Path


def setup_project_path():
    """
    Add the project root directory to sys.path if not already present.
    
    This allows absolute imports like 'from backend.routes import ...' to work
    when scripts are executed directly (e.g., python backend/app.py).
    
    The project root is determined by going up two directories from this file's location:
    - This file: backend/utils/path_setup.py
    - Parent 1: backend/
    - Parent 2: Joey_AI/ (project root)
    
    Returns:
        Path: The project root path that was added to sys.path
    """
    # Get the absolute path to this file
    current_file = Path(__file__).resolve()
    
    # Project root is two levels up: backend/utils/path_setup.py -> backend/ -> Joey_AI/
    project_root = current_file.parent.parent.parent
    
    # Convert to string for sys.path
    project_root_str = str(project_root)
    
    # Only add if not already in sys.path
    if project_root_str not in sys.path:
        sys.path.insert(0, project_root_str)  # Insert at beginning for priority
        
    return project_root


def get_project_root():
    """
    Get the project root directory path.
    
    Returns:
        Path: The project root directory (Joey_AI/)
    """
    current_file = Path(__file__).resolve()
    return current_file.parent.parent.parent


# Optional: Auto-setup on import (can be disabled if unwanted)
# Uncomment the line below to automatically setup path when this module is imported
# setup_project_path()
