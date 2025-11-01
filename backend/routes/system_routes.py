"""
System performance and status monitoring routes.
"""
from flask import Blueprint, jsonify, current_app
import psutil
import subprocess
import time
import os
import re
from pathlib import Path

system_bp = Blueprint('system', __name__)

# Track last response time and tokens
_last_response_time = None
_last_model_name = None
_last_tokens_per_sec = None
_context_used = "0/4096"


def get_cpu_temperature():
    """Get CPU temperature in Celsius."""
    try:
        # Try thermal zones (Linux)
        thermal_zones = list(Path('/sys/class/thermal').glob('thermal_zone*'))
        if thermal_zones:
            for zone in thermal_zones:
                temp_file = zone / 'temp'
                if temp_file.exists():
                    temp = int(temp_file.read_text().strip()) / 1000.0
                    if temp > 0 and temp < 150:  # Sanity check
                        return temp
    except Exception:
        pass
    
    # Try psutil sensors (if available)
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for name, entries in temps.items():
                if entries:
                    return entries[0].current
    except (AttributeError, Exception):
        pass
    
    return None


def get_gpu_stats():
    """
    Get GPU usage, temperature, and power draw.
    Returns dict with usage, temp, and power or None values.
    """
    stats = {'usage': None, 'temp': None, 'power': None}
    
    # Try NVIDIA GPU first
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=utilization.gpu,temperature.gpu,power.draw',
             '--format=csv,noheader,nounits'],
            capture_output=True,
            text=True,
            timeout=1
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(',')
            if len(parts) >= 3:
                stats['usage'] = float(parts[0].strip())
                stats['temp'] = float(parts[1].strip())
                stats['power'] = float(parts[2].strip())
                return stats
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError, ValueError):
        pass
    
    # Try Jetson tegrastats
    try:
        # Read GPU temp from sysfs
        gpu_temp_file = Path('/sys/devices/gpu.0/temp')
        if gpu_temp_file.exists():
            temp = int(gpu_temp_file.read_text().strip()) / 1000.0
            stats['temp'] = temp
        
        # Try to get power from tegrastats (single shot)
        result = subprocess.run(
            ['tegrastats', '--interval', '100'],
            capture_output=True,
            text=True,
            timeout=0.3
        )
        if result.returncode == 0:
            output = result.stdout
            # Parse tegrastats: look for POM_5V_IN pattern
            power_match = re.search(r'POM_5V_IN\s+(\d+)/(\d+)', output)
            if power_match:
                stats['power'] = float(power_match.group(1)) / 1000.0  # Convert mW to W
            
            # Parse GPU usage: look for GR3D_FREQ pattern
            gpu_match = re.search(r'GR3D_FREQ\s+(\d+)%', output)
            if gpu_match:
                stats['usage'] = float(gpu_match.group(1))
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    return stats


def get_gpu_usage():
    """
    Attempt to get GPU usage percentage.
    Returns None if GPU is not available or detection fails.
    """
    stats = get_gpu_stats()
    return stats['usage']


@system_bp.route('/api/system_stats', methods=['GET'])
def get_system_stats():
    """
    Get current system performance statistics.
    
    Returns:
        JSON with CPU, memory, GPU usage, temperatures, power, model info, and connection status
    """
    global _last_response_time, _last_model_name, _last_tokens_per_sec, _context_used
    
    try:
        # Get CPU usage (average over 0.1 seconds for responsiveness)
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Get memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Get CPU temperature
        cpu_temp = get_cpu_temperature()
        
        # Get GPU stats (usage, temp, power)
        gpu_stats = get_gpu_stats()
        
        # Try to determine current model from Ollama
        model_name = _last_model_name or "qwen2.5:7b-instruct"
        
        # Check Ollama connection status
        status = "online"
        try:
            ollama_base = current_app.config.get("OLLAMA_BASE", "http://10.0.0.32:11434")
            import requests
            response = requests.get(f"{ollama_base}/api/tags", timeout=2)
            if response.status_code == 200:
                status = "online"
            else:
                status = "offline"
        except Exception:
            status = "offline"
        
        # Calculate latency (time since last response)
        latency = _last_response_time if _last_response_time else 0.0
        
        # Prepare response
        result = {
            "cpu": round(cpu_percent, 1),
            "memory": round(memory_percent, 1),
            "gpu": round(gpu_stats['usage'], 1) if gpu_stats['usage'] is not None else None,
            "cpu_temp": round(cpu_temp, 1) if cpu_temp is not None else None,
            "gpu_temp": round(gpu_stats['temp'], 1) if gpu_stats['temp'] is not None else None,
            "power_draw": round(gpu_stats['power'], 1) if gpu_stats['power'] is not None else None,
            "tokens_per_sec": round(_last_tokens_per_sec, 1) if _last_tokens_per_sec is not None else None,
            "context_used": _context_used,
            "model": model_name,
            "latency": round(latency, 2),
            "status": status
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            "error": str(e),
            "cpu": 0,
            "memory": 0,
            "gpu": None,
            "cpu_temp": None,
            "gpu_temp": None,
            "power_draw": None,
            "tokens_per_sec": None,
            "context_used": "0/4096",
            "status": "error",
            "latency": 0,
            "model": "unknown"
        }), 500


def update_response_metrics(response_time, model_name):
    """
    Update the tracked response time and model name.
    Call this from chat routes after receiving a response.
    
    Args:
        response_time: Time taken for the response in seconds
        model_name: Name of the model that generated the response
    """
    global _last_response_time, _last_model_name
    _last_response_time = response_time
    _last_model_name = model_name
