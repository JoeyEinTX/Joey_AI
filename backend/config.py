"""Configuration settings for Joey_AI application."""
import os
from typing import Optional


class OllamaConfig:
    """Configuration for Ollama API integration."""
    
    BASE_URL: str = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    MODEL: str = os.getenv('OLLAMA_MODEL', 'llama2')
    TIMEOUT: int = int(os.getenv('OLLAMA_TIMEOUT', '30'))
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


class FlaskConfig:
    """Configuration for Flask application."""
    
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    HOST: str = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT: int = int(os.getenv('FLASK_PORT', '5000'))
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
