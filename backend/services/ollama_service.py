import requests
import time
import logging
from typing import Optional, Dict, Any
from ..config import OllamaConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OllamaService:
    """Service class for handling Ollama API interactions."""
    
    def __init__(self):
        """Initialize the Ollama service with configuration validation."""
        config_error = OllamaConfig.validate_config()
        if config_error:
            logger.error(f"Configuration error: {config_error}")
            raise ValueError(f"Invalid Ollama configuration: {config_error}")
        
        # Create a session for connection pooling and persistent connections
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Configure connection pooling
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=0  # We handle retries manually
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
    
    def _build_payload(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Build the request payload for Ollama API."""
        payload = {
            "model": OllamaConfig.MODEL,
            "prompt": prompt,
            "stream": False
        }
        # Allow override of default parameters
        payload.update(kwargs)
        return payload
    
    def _make_request(self, payload: Dict[str, Any]) -> requests.Response:
        """Make a single request to Ollama API using the session."""
        return self.session.post(
            OllamaConfig.get_api_url(),
            json=payload,
            timeout=OllamaConfig.TIMEOUT
        )
    
    def _extract_response(self, response_data: Dict[str, Any]) -> str:
        """Extract the generated text from Ollama response."""
        if 'response' in response_data:
            return response_data['response'].strip()
        else:
            logger.error(f"Unexpected response format: {response_data}")
            raise ValueError("Unexpected response format from Ollama")
    
    def send_prompt_with_retry(self, prompt: str, **kwargs) -> str:
        """
        Send a prompt to Ollama API with retry logic.
        
        Args:
            prompt (str): The prompt to send to the LLM
            **kwargs: Additional parameters for the Ollama API
            
        Returns:
            str: The generated response from Ollama or error message
        """
        if not prompt or not prompt.strip():
            return "Error: Empty prompt provided."
        
        payload = self._build_payload(prompt, **kwargs)
        
        for attempt in range(1, OllamaConfig.MAX_RETRIES + 1):
            try:
                logger.info(f"Attempt {attempt}/{OllamaConfig.MAX_RETRIES}: Sending prompt to Ollama")
                logger.debug(f"API URL: {OllamaConfig.get_api_url()}")
                logger.debug(f"Model: {OllamaConfig.MODEL}")
                
                response = self._make_request(payload)
                response.raise_for_status()
                
                response_data = response.json()
                generated_text = self._extract_response(response_data)
                
                logger.info(f"Successfully received response from Ollama (attempt {attempt})")
                return generated_text
                
            except requests.exceptions.ConnectionError as e:
                error_msg = f"Unable to connect to Ollama at {OllamaConfig.BASE_URL}. Is Ollama running?"
                logger.warning(f"Attempt {attempt} failed: {error_msg}")
                if attempt == OllamaConfig.MAX_RETRIES:
                    logger.error(f"All {OllamaConfig.MAX_RETRIES} attempts failed: Connection error")
                    return f"Error: {error_msg}"
                
            except requests.exceptions.Timeout as e:
                error_msg = "Request to Ollama timed out. The model may be processing a complex prompt."
                logger.warning(f"Attempt {attempt} failed: Timeout after {OllamaConfig.TIMEOUT}s")
                if attempt == OllamaConfig.MAX_RETRIES:
                    logger.error(f"All {OllamaConfig.MAX_RETRIES} attempts failed: Timeout")
                    return f"Error: {error_msg}"
                
            except requests.exceptions.HTTPError as e:
                error_msg = f"HTTP error from Ollama API: {e.response.status_code}"
                logger.error(f"Attempt {attempt} failed: {error_msg}")
                # Don't retry on 4xx errors (client errors)
                if 400 <= e.response.status_code < 500:
                    return f"Error: {error_msg}"
                if attempt == OllamaConfig.MAX_RETRIES:
                    return f"Error: {error_msg}"
                
            except (ValueError, KeyError) as e:
                error_msg = "Invalid JSON response from Ollama"
                logger.error(f"Attempt {attempt} failed: {error_msg} - {str(e)}")
                if attempt == OllamaConfig.MAX_RETRIES:
                    return f"Error: {error_msg}."
                
            except Exception as e:
                error_msg = f"Unexpected error: {str(e)}"
                logger.error(f"Attempt {attempt} failed: {error_msg}")
                if attempt == OllamaConfig.MAX_RETRIES:
                    return "Error: Unable to get response from Ollama."
            
            # Wait before retrying (except on last attempt)
            if attempt < OllamaConfig.MAX_RETRIES:
                wait_time = OllamaConfig.RETRY_DELAY * attempt  # Exponential backoff
                logger.info(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
        
        return "Error: Unable to get response from Ollama after multiple attempts."


# Global service instance
_ollama_service: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """Get or create the global Ollama service instance."""
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service


def send_prompt(prompt: str, **kwargs) -> str:
    """
    Legacy function to maintain backward compatibility.
    
    Args:
        prompt (str): The prompt to send to the LLM
        **kwargs: Additional parameters for the Ollama API
        
    Returns:
        str: The generated response from Ollama or error message
    """
    try:
        service = get_ollama_service()
        return service.send_prompt_with_retry(prompt, **kwargs)
    except Exception as e:
        logger.error(f"Failed to initialize Ollama service: {str(e)}")
        return "Error: Service initialization failed. Check configuration."
