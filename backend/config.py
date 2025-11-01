"""Configuration settings for Joey_AI application."""
import os
from typing import Optional


class OllamaConfig:
    """Configuration for Ollama API integration."""
    
    BASE_URL: str = os.getenv('OLLAMA_BASE_URL', os.getenv('OLLAMA_BASE', 'http://127.0.0.1:11434'))
    MODEL: str = os.getenv('OLLAMA_MODEL', 'qwen2.5:7b-instruct')
    NUM_GPU: int = int(os.getenv('OLLAMA_NUM_GPU', '0'))
    TIMEOUT: int = int(os.getenv('OLLAMA_TIMEOUT', '60'))
    MAX_RETRIES: int = int(os.getenv('OLLAMA_MAX_RETRIES', '3'))
    RETRY_DELAY: float = float(os.getenv('OLLAMA_RETRY_DELAY', '1.0'))
    
    @classmethod
    def get_api_url(cls) -> str:
        """Get the complete API endpoint URL."""
        return f"{cls.BASE_URL.rstrip('/')}/api/generate"
    
    @classmethod
    def validate_config(cls) -> Optional[str]:
        """Validate configuration and return error message if invalid."""
        if not cls.BASE_URL:
            return "OLLAMA_BASE_URL cannot be empty"
        if not cls.MODEL:
            return "OLLAMA_MODEL cannot be empty"
        if cls.TIMEOUT <= 0:
            return "OLLAMA_TIMEOUT must be positive"
        return None
    
    @classmethod
    def print_config(cls) -> None:
        """Print configuration for debugging."""
        print(f"[CONFIG] Ollama BASE_URL: {cls.BASE_URL}")
        print(f"[CONFIG] Ollama MODEL: {cls.MODEL}")
        print(f"[CONFIG] Ollama NUM_GPU: {cls.NUM_GPU} (CPU-only: {cls.NUM_GPU == 0})")
        print(f"[CONFIG] Ollama TIMEOUT: {cls.TIMEOUT}s")
        print(f"[CONFIG] API URL: {cls.get_api_url()}")


class FlaskConfig:
    """Configuration for Flask application."""
    
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    HOST: str = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT: int = int(os.getenv('FLASK_PORT', '5000'))
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')


class JoeyAIConfig:
    """General Joey_AI settings."""
    
    AUTO_SAVE_CHATS: bool = os.getenv('AUTO_SAVE_CHATS', 'True').lower() == 'true'
