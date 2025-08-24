import json
import os
import time
import requests
import logging
from flask import Blueprint, request, jsonify, Response, stream_template, current_app
from typing import Dict, Any, Generator
from dotenv import find_dotenv

logger = logging.getLogger(__name__)
llm_bp = Blueprint('llm_bp', __name__)

# Environment variables
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Store last request body for debug endpoint
last_request_body = None
last_resolved_info = None

def resolve_ollama_base():
    """Resolve OLLAMA_BASE with proper precedence: ENV > config > default"""
    if "OLLAMA_BASE" in os.environ:
        return os.environ["OLLAMA_BASE"], "env"
    elif current_app.config.get("OLLAMA_BASE"):
        return current_app.config["OLLAMA_BASE"], "config"
    else:
        return "http://127.0.0.1:11434", "default"

@llm_bp.route('/v1/debug/env', methods=['GET'])
def debug_env():
    """Debug endpoint to inspect environment/config"""
    base, source = resolve_ollama_base()
    
    return jsonify({
        "cwd": os.getcwd(),
        "env": {"OLLAMA_BASE": os.environ.get("OLLAMA_BASE")},
        "config": {"OLLAMA_BASE": current_app.config.get("OLLAMA_BASE")},
        "resolved": {"base": base, "source": source},
        "dotenv": {"path": find_dotenv() or None}
    })

@llm_bp.route('/v1/debug/echo', methods=['GET'])
def debug_echo():
    """Debug endpoint to return last POST body and resolved info"""
    global last_request_body, last_resolved_info
    
    return jsonify({
        "last_body": last_request_body,
        "resolved": last_resolved_info or {"base": "unknown", "source": "unknown"}
    })

@llm_bp.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    """OpenAI-compatible chat completions endpoint that proxies to Ollama or Anthropic"""
    global last_request_body, last_resolved_info
    
    try:
        data = request.get_json(force=True)
        
        # Store request body for debug endpoint
        last_request_body = data
        
        # Extract parameters with defaults
        model = data.get('model', 'qwen2.5-coder:7b')
        messages = data.get('messages', [])
        temperature = data.get('temperature', 0.2)
        stream = data.get('stream', False)
        provider = data.get('provider', 'ollama')
        
        # Log precise gateway info
        remote_addr = request.remote_addr or 'unknown'
        json_length = len(json.dumps(data))
        logger.info(f"[LLM IN] ip={remote_addr} provider={provider} model={model} stream={stream} temp={temperature} len={json_length}")
        
        if not messages:
            return jsonify({'error': 'messages field is required'}), 400
            
        if provider == 'anthropic':
            return handle_anthropic_request(model, messages, temperature, stream)
        else:
            return handle_ollama_request(model, messages, temperature, stream)
            
    except Exception as e:
        logger.error(f"[LLM ERR] status=502 msg={str(e)}")
        return jsonify({'error': f'Request processing failed: {str(e)}'}), 502

def handle_ollama_request(model: str, messages: list, temperature: float, stream: bool):
    """Handle request to Ollama"""
    global last_resolved_info
    
    # Resolve base URL and store for debug endpoint
    base, source = resolve_ollama_base()
    last_resolved_info = {"base": base, "source": source}
    
    provider = "ollama"
    
    # Log base/source after resolve_ollama_base()
    logger.info(f"base={base} source={source}")
    
    ollama_payload = {
        'model': model,
        'messages': messages,
        'stream': stream,
        'options': {
            'temperature': temperature
        }
    }
    
    try:
        response = requests.post(
            f'{base}/api/chat',
            json=ollama_payload,
            timeout=60,
            stream=stream
        )
        response.raise_for_status()
        
        if stream:
            # For streaming, we can't easily count tokens, so log success without token count
            logger.info(f"[LLM OK] provider={provider} tokens=?")
            return Response(
                stream_ollama_response(response),
                mimetype='text/plain',
                headers={'Cache-Control': 'no-cache'}
            )
        else:
            ollama_response = response.json()
            content = ollama_response.get('message', {}).get('content', '')
            
            # Log success with content length as token approximation
            logger.info(f"[LLM OK] provider={provider} tokens={len(content)}")
            
            # Convert Ollama response to OpenAI format
            openai_response = {
                'choices': [{
                    'message': {
                        'role': 'assistant',
                        'content': content
                    },
                    'finish_reason': 'stop'
                }],
                'model': model,
                'object': 'chat.completion'
            }
            return jsonify(openai_response)
            
    except Exception as e:
        logger.error(f"[LLM ERR] status=502 msg={str(e)}")
        return jsonify({'error': 'Ollama request failed', 'base': base}), 502

def stream_ollama_response(response) -> Generator[str, None, None]:
    """Convert Ollama streaming response to OpenAI SSE format"""
    try:
        # Check if response is valid before trying to iterate
        if not hasattr(response, 'iter_lines') or response.status_code != 200:
            raise Exception(f"Invalid response: {response.status_code}")
            
        for line in response.iter_lines(decode_unicode=True):
            if line:
                try:
                    ollama_chunk = json.loads(line)
                    content = ollama_chunk.get('message', {}).get('content', '')
                    
                    if content:
                        # OpenAI-style streaming chunk
                        openai_chunk = {
                            'object': 'chat.completion.chunk',
                            'choices': [{
                                'delta': {
                                    'content': content
                                },
                                'finish_reason': None
                            }]
                        }
                        yield f"data: {json.dumps(openai_chunk)}\n\n"
                    
                    # Check if this is the final chunk
                    if ollama_chunk.get('done', False):
                        # Send final chunk with finish_reason
                        final_chunk = {
                            'object': 'chat.completion.chunk',
                            'choices': [{
                                'delta': {},
                                'finish_reason': 'stop'
                            }]
                        }
                        yield f"data: {json.dumps(final_chunk)}\n\n"
                        yield "data: [DONE]\n\n"
                        break
                        
                except json.JSONDecodeError:
                    continue
                    
    except Exception as e:
        error_chunk = {
            'object': 'chat.completion.chunk',
            'choices': [{
                'delta': {
                    'content': f'[Error: Connection failed to Ollama]'
                },
                'finish_reason': 'stop'
            }]
        }
        yield f"data: {json.dumps(error_chunk)}\n\n"
        yield "data: [DONE]\n\n"

def handle_anthropic_request(model: str, messages: list, temperature: float, stream: bool):
    """Handle request to Anthropic Claude API"""
    if not ANTHROPIC_API_KEY:
        return jsonify({'error': 'ANTHROPIC_API_KEY environment variable is required'}), 400
    
    try:
        # Convert OpenAI messages to Anthropic format
        anthropic_messages = []
        system_content = None
        
        for msg in messages:
            if msg.get('role') == 'system':
                system_content = msg.get('content', '')
            elif msg.get('role') in ['user', 'assistant']:
                anthropic_messages.append({
                    'role': msg.get('role'),
                    'content': msg.get('content', '')
                })
        
        # Prepare Anthropic API payload
        anthropic_payload = {
            'model': model,
            'max_tokens': 2048,
            'temperature': temperature,
            'messages': anthropic_messages
        }
        
        if system_content:
            anthropic_payload['system'] = system_content
        
        # Make request to Anthropic API
        headers = {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        }
        
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            json=anthropic_payload,
            headers=headers,
            timeout=60
        )
        response.raise_for_status()
        
        anthropic_response = response.json()
        
        # Convert Anthropic response to OpenAI format
        content_blocks = anthropic_response.get('content', [])
        content_text = ''
        
        # Concatenate all text blocks
        for block in content_blocks:
            if block.get('type') == 'text':
                content_text += block.get('text', '')
        
        openai_response = {
            'choices': [{
                'message': {
                    'role': 'assistant',
                    'content': content_text
                },
                'finish_reason': 'stop'
            }],
            'model': model,
            'object': 'chat.completion'
        }
        
        # For streaming requests, return non-streamed response for now (as per requirements)
        if stream:
            # Still return 200 with full response (no SSE needed per requirements)
            return jsonify(openai_response)
        else:
            return jsonify(openai_response)
            
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            return jsonify({'error': 'Invalid Anthropic API key'}), 400
        elif e.response.status_code == 400:
            return jsonify({'error': 'Invalid request to Anthropic API'}), 400
        else:
            return jsonify({'error': f'Anthropic API error: {e.response.status_code}'}), 502
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request to Anthropic API timed out'}), 502
        
    except Exception as e:
        return jsonify({'error': f'Anthropic request failed: {str(e)}'}), 502
