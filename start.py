#!/usr/bin/env python3
"""
JoeyAI - Project-level startup script

This script provides a convenient way to start JoeyAI from the project root.
It imports and calls the main() function from backend.app.

Usage:
    python start.py

This is equivalent to:
    python backend/app.py
    python -m backend.app
"""

from backend.app import main

if __name__ == "__main__":
    main()
