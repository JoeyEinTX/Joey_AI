"""
User settings management routes.
Allows users to configure and save system-wide options.
"""
from flask import Blueprint, jsonify, request
import json
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

settings_bp = Blueprint('settings', __name__)

# Default settings
DEFAULT_SETTINGS = {
    "model": "qwen2.5:7b-instruct",
    "temperature": 0.7,
    "auto_save": True,
    "theme": "dark",
    "memory_limit": 10,
    "last_active_conversation_id": None
}

# Settings file path
SETTINGS_FILE = Path(__file__).resolve().parent.parent / "settings.json"


def load_settings():
    """
    Load settings from file or return defaults if file doesn't exist.
    
    Returns:
        dict: Current settings
    """
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
                logger.info("[USER_SETTINGS] Loaded settings from file")
                return settings
        else:
            logger.info("[USER_SETTINGS] Loaded defaults")
            save_settings(DEFAULT_SETTINGS)
            return DEFAULT_SETTINGS.copy()
    except Exception as e:
        logger.error(f"[USER_SETTINGS] Error loading settings: {e}")
        return DEFAULT_SETTINGS.copy()


def save_settings(settings):
    """
    Save settings to file.
    
    Args:
        settings (dict): Settings to save
    """
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        logger.info("[USER_SETTINGS] Saved settings to file")
    except Exception as e:
        logger.error(f"[USER_SETTINGS] Error saving settings: {e}")


def validate_settings(settings):
    """
    Validate settings values.
    
    Args:
        settings (dict): Settings to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    # Validate temperature
    if "temperature" in settings:
        try:
            temp = float(settings["temperature"])
            if not (0 <= temp <= 1):
                return False, "Temperature must be between 0 and 1"
        except (ValueError, TypeError):
            return False, "Temperature must be a number"
    
    # Validate auto_save
    if "auto_save" in settings:
        if not isinstance(settings["auto_save"], bool):
            return False, "auto_save must be a boolean"
    
    # Validate theme
    if "theme" in settings:
        if settings["theme"] not in ["dark", "light", "system"]:
            return False, "theme must be 'dark', 'light', or 'system'"
    
    # Validate memory_limit
    if "memory_limit" in settings:
        try:
            limit = int(settings["memory_limit"])
            if not (1 <= limit <= 50):
                return False, "memory_limit must be between 1 and 50"
        except (ValueError, TypeError):
            return False, "memory_limit must be an integer"
    
    # Validate model (just check it's a string)
    if "model" in settings:
        if not isinstance(settings["model"], str):
            return False, "model must be a string"
    
    # Validate last_active_conversation_id
    if "last_active_conversation_id" in settings:
        if settings["last_active_conversation_id"] is not None:
            try:
                int(settings["last_active_conversation_id"])
            except (ValueError, TypeError):
                return False, "last_active_conversation_id must be an integer or null"
    
    return True, None


@settings_bp.route('/api/settings', methods=['GET'])
def get_settings():
    """
    Get current settings.
    
    Returns:
        JSON: Current settings
    """
    try:
        settings = load_settings()
        return jsonify(settings), 200
    except Exception as e:
        logger.error(f"[USER_SETTINGS] Error getting settings: {e}")
        return jsonify({"error": str(e)}), 500


@settings_bp.route('/api/settings', methods=['POST'])
def update_settings():
    """
    Update one or more settings fields.
    
    Request Body:
        JSON object with settings to update
        
    Returns:
        JSON: Updated full settings object
    """
    try:
        # Get current settings
        current_settings = load_settings()
        
        # Get updates from request
        updates = request.get_json()
        
        if not updates:
            return jsonify({"error": "No settings provided"}), 400
        
        # Validate updates
        is_valid, error_msg = validate_settings(updates)
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        
        # Merge updates with current settings
        for key, value in updates.items():
            if key in DEFAULT_SETTINGS:
                old_value = current_settings.get(key)
                current_settings[key] = value
                logger.info(f"[USER_SETTINGS] Updated: {key} → {value} (was: {old_value})")
        
        # Save updated settings
        save_settings(current_settings)
        
        return jsonify(current_settings), 200
    
    except Exception as e:
        logger.error(f"[USER_SETTINGS] Error updating settings: {e}")
        return jsonify({"error": str(e)}), 500


@settings_bp.route('/api/settings/reset', methods=['POST'])
def reset_settings():
    """
    Reset settings to factory defaults.
    
    Returns:
        JSON: Default settings
    """
    try:
        logger.info("[USER_SETTINGS] Reset to defaults")
        save_settings(DEFAULT_SETTINGS)
        return jsonify(DEFAULT_SETTINGS), 200
    except Exception as e:
        logger.error(f"[USER_SETTINGS] Error resetting settings: {e}")
        return jsonify({"error": str(e)}), 500
