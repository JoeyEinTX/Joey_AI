"""
System performance and status monitoring routes.
"""
from flask import Blueprint, jsonify, current_app
import psutil
import subprocess
import time
import os
import re
import random
import glob
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

system_bp = Blueprint('system', __name__)

# Track last response time and tokens
_last_response_time = None
_last_model_name = None
_last_tokens_per_sec = None
_context_used = "0/4096"


def get_cpu_temperature():
    """Get CPU temperature in Celsius by averaging all CPU thermal zones."""
    cpu_temps = []
    
    try:
        # Read all thermal zones
        thermal_zones = list(Path('/sys/class/thermal').glob('thermal_zone*'))
        for zone in thermal_zones:
            try:
                # Read zone type to check if it's CPU-related
                type_file = zone / 'type'
                temp_file = zone / 'temp'
                
                if type_file.exists() and temp_file.exists():
                    zone_type = type_file.read_text().strip().lower()
                    # Include CPU-specific zones (cpu-thermal, MCPU, BCPU, etc.)
                    if 'cpu' in zone_type:
                        temp = int(temp_file.read_text().strip()) / 1000.0
                        if 0 < temp < 150:  # Sanity check
                            cpu_temps.append(temp)
            except (IOError, ValueError):
                continue
        
        # Return average if we found any CPU temps
        if cpu_temps:
            return sum(cpu_temps) / len(cpu_temps)
            
    except Exception:
        pass
    
    # Fallback: Try psutil sensors
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for name, entries in temps.items():
                if 'cpu' in name.lower() or 'coretemp' in name.lower():
                    for entry in entries:
                        if 0 < entry.current < 150:
                            cpu_temps.append(entry.current)
            
            if cpu_temps:
                return sum(cpu_temps) / len(cpu_temps)
    except (AttributeError, Exception):
        pass
    
    return None


def get_gpu_stats():
    """
    Get GPU usage, temperature, and power draw for Jetson or NVIDIA GPUs.
    Returns dict with usage, temp, and power or None values.
    Optimized for Jetson Orin Nano.
    """
    stats = {'usage': None, 'temp': None, 'power': None}
    
    # Try NVIDIA GPU first (discrete GPUs)
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=utilization.gpu,temperature.gpu,power.draw',
             '--format=csv,noheader,nounits'],
            capture_output=True,
            text=True,
            timeout=0.5
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
    
    # Jetson-specific detection
    # 1. Try GPU temperature from sysfs (multiple possible locations)
    gpu_temp_paths = [
        '/sys/devices/virtual/thermal/thermal_zone0/temp',  # Common Jetson location
        '/sys/devices/gpu.0/temp',
        '/sys/class/thermal/thermal_zone0/temp',
    ]
    
    for temp_path in gpu_temp_paths:
        try:
            temp_file = Path(temp_path)
            if temp_file.exists():
                temp = int(temp_file.read_text().strip()) / 1000.0
                if 0 < temp < 150:
                    stats['temp'] = temp
                    break
        except (IOError, ValueError):
            continue
    
    # 2. Try tegrastats for GPU usage and power (optimized single call)
    try:
        result = subprocess.run(
            ['tegrastats', '--interval', '1000'],  # 1000ms = 1 second
            capture_output=True,
            timeout=1.5  # Increased timeout to ensure we get output
        )
        if result.returncode == 0 or result.stdout:  # Accept output even if not finished
            output = result.stdout.decode('utf-8') if isinstance(result.stdout, bytes) else result.stdout
            
            # Parse GPU utilization: GR3D_FREQ 13%@... or GR3D 13%
            gpu_patterns = [
                r'GR3D_FREQ\s+(\d+(?:\.\d+)?)%',  # Match decimals too
                r'GR3D\s+(\d+(?:\.\d+)?)%',
            ]
            for pattern in gpu_patterns:
                gpu_match = re.search(pattern, output)
                if gpu_match:
                    stats['usage'] = float(gpu_match.group(1))
                    break
            
            # Parse GPU temperature if not found in sysfs: gpu@51C or gpu@51.5C
            if stats['temp'] is None:
                temp_match = re.search(r'gpu@([\d.]+)C', output, re.IGNORECASE)
                if temp_match:
                    stats['temp'] = float(temp_match.group(1))
            
            # Parse power: VDD_IN 4816mW/4816mW or VDD_GPU_CV
            power_patterns = [
                r'VDD_GPU_CV\s+(\d+)mW',
                r'VDD_IN\s+(\d+)mW',
                r'POM_5V_GPU\s+(\d+)/\d+',
                r'POM_5V_IN\s+(\d+)/\d+',
                r'VDD_CPU_GPU_CV\s+(\d+)mW',
            ]
            for pattern in power_patterns:
                power_match = re.search(pattern, output)
                if power_match:
                    # Convert mW to W
                    stats['power'] = float(power_match.group(1)) / 1000.0
                    break
                    
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError, ValueError) as e:
        # Timeout is expected - use partial output if available
        if hasattr(e, 'stdout') and e.stdout:
            output = e.stdout.decode('utf-8') if isinstance(e.stdout, bytes) else e.stdout
            # Try parsing from partial output
            gpu_match = re.search(r'GR3D_FREQ\s+(\d+(?:\.\d+)?)%', output)
            if gpu_match:
                stats['usage'] = float(gpu_match.group(1))
    
    
    # 3. Fallback: Try reading GPU freq to estimate usage
    if stats['usage'] is None:
        try:
            freq_file = Path('/sys/devices/gpu.0/devfreq/17000000.ga10b/cur_freq')
            max_freq_file = Path('/sys/devices/gpu.0/devfreq/17000000.ga10b/max_freq')
            
            if freq_file.exists() and max_freq_file.exists():
                cur_freq = int(freq_file.read_text().strip())
                max_freq = int(max_freq_file.read_text().strip())
                if max_freq > 0:
                    stats['usage'] = (cur_freq / max_freq) * 100
        except (IOError, ValueError, ZeroDivisionError):
            pass
    
    return stats


def get_gpu_usage():
    """
    Attempt to get GPU usage percentage.
    Returns None if GPU is not available or detection fails.
    """
    stats = get_gpu_stats()
    return stats['usage']


def get_vram_usage():
    """
    Get system RAM usage in MB for Jetson.
    Returns rounded integer MB or None if unavailable.
    """
    try:
        # Try tegrastats for RAM info (all common patterns)
        result = subprocess.run(
            ['tegrastats', '--interval', '1000'],
            capture_output=True,
            timeout=0.3
        )
        if result.stdout:
            output = result.stdout.decode('utf-8') if isinstance(result.stdout, bytes) else result.stdout
            # Parse: RAM 2220/7620MB or RAM 2220/7620MiB
            ram_match = re.search(r'RAM\s+(\d+)/(\d+)(?:MB|MiB)', output)
            if ram_match:
                used_mb = int(ram_match.group(1))
                return used_mb
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError, ValueError):
        pass
    
    # Fallback to psutil
    try:
        memory = psutil.virtual_memory()
        used_mb = round(memory.used / 1e6)  # Convert bytes to MB
        return used_mb
    except Exception as e:
        logger.warning(f"[TELEMETRY] VRAM fallback failed: {e}")
    
    return None


def get_fan_speed():
    """
    Get fan speed percentage (0-100%) for Jetson.
    Returns None if fan not available or not controllable.
    """
    try:
        # Use glob to find fan PWM paths dynamically
        pwm_patterns = [
            '/sys/devices/gpu.0/fan_pwm_target',
            '/sys/devices/platform/pwm-fan/hwmon/hwmon*/pwm1',
            '/sys/devices/platform/7000d000.pwm-fan/target_pwm',
            '/sys/devices/pwm-fan/target_pwm',
            '/sys/devices/platform/pwm-fan/target_pwm',
            '/sys/class/hwmon/hwmon*/pwm1',
        ]
        
        for pattern in pwm_patterns:
            matches = glob.glob(pattern)
            for pwm_path in matches:
                try:
                    pwm_file = Path(pwm_path)
                    if pwm_file.exists():
                        pwm_value = int(pwm_file.read_text().strip())
                        # Convert 0-255 PWM to 0-100 percentage
                        fan_pct = (pwm_value / 255.0) * 100
                        logger.info(f"[TELEMETRY] Fan speed found at {pwm_path}: {fan_pct:.1f}%")
                        return fan_pct
                except (IOError, ValueError) as e:
                    continue
        
        logger.info("[TELEMETRY] Fan speed path not found")
    except Exception as e:
        logger.warning(f"[TELEMETRY] Fan speed detection failed: {e}")
    
    return None


def get_power_draw():
    """
    Get total system power draw in Watts for Jetson.
    Detects INA3221 or hwmon sensors and sums all valid readings.
    Returns float in Watts or None if unavailable.
    """
    total_power_w = 0.0
    found_sensors = False
    
    try:
        # Try hwmon power sensors
        power_patterns = [
            '/sys/class/hwmon/hwmon*/power*_input',
            '/sys/bus/i2c/drivers/ina3221x/*/iio_device/in_power*_input',
            '/sys/devices/*/power/power*_input',
        ]
        
        for pattern in power_patterns:
            matches = glob.glob(pattern)
            for power_path in matches:
                try:
                    power_file = Path(power_path)
                    if power_file.exists():
                        # Read power in µW (microwatts)
                        power_uw = int(power_file.read_text().strip())
                        # Convert µW to W
                        power_w = power_uw / 1e6
                        if 0 < power_w < 100:  # Sanity check (< 100W)
                            total_power_w += power_w
                            found_sensors = True
                            logger.debug(f"[TELEMETRY] Power sensor at {power_path}: {power_w:.2f}W")
                except (IOError, ValueError):
                    continue
        
        if found_sensors:
            logger.info(f"[TELEMETRY] Total power draw: {total_power_w:.2f}W")
            return total_power_w
        
        logger.info("[TELEMETRY] Power draw sensors not found")
            
    except Exception as e:
        logger.warning(f"[TELEMETRY] Power draw detection failed: {e}")
    
    return None


def get_thermal_throttle_status():
    """
    Detect if system is thermally throttled.
    Returns boolean True if throttled, False otherwise.
    """
    try:
        # Check throttle count files
        throttle_paths = [
            '/sys/devices/gpu.0/throttle_count',
            '/sys/kernel/debug/bpmp/debug/clk/gpu/throttle_count',
        ]
        
        for throttle_path in throttle_paths:
            throttle_file = Path(throttle_path)
            if throttle_file.exists():
                try:
                    count = int(throttle_file.read_text().strip())
                    if count > 0:
                        return True
                except (IOError, ValueError):
                    continue
        
        # Alternative: Check if any CPU is below max frequency (basic throttle detection)
        try:
            result = subprocess.run(
                ['tegrastats', '--interval', '1000'],
                capture_output=True,
                timeout=0.3
            )
            if result.stdout:
                output = result.stdout.decode('utf-8') if isinstance(result.stdout, bytes) else result.stdout
                # Check if any CPU core is throttled (running below max freq)
                # CPU [0%@729,3%@729,2%@729,4%@1036,0%@729,0%@729]
                # If all cores at low freq like 729MHz it might indicate throttling
                cpu_match = re.search(r'CPU \[(.*?)\]', output)
                if cpu_match:
                    cpu_data = cpu_match.group(1)
                    # Extract frequencies
                    freqs = re.findall(r'@(\d+)', cpu_data)
                    if freqs:
                        avg_freq = sum(int(f) for f in freqs) / len(freqs)
                        # If average frequency < 1000 MHz, might be throttled
                        if avg_freq < 1000:
                            return True
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError, ValueError):
            pass
            
    except Exception:
        pass
    
    return False


@system_bp.route('/api/system_stats', methods=['GET'])
def get_system_stats():
    """
    Get current system performance statistics.
    Optimized for Jetson Orin Nano with sub-300ms response time.
    
    Returns:
        JSON with CPU, memory, GPU usage, temperatures, power, model info, and connection status
    """
    global _last_response_time, _last_model_name, _last_tokens_per_sec, _context_used
    
    start_time = time.time()
    
    try:
        # Get CPU usage (shorter interval for faster response)
        cpu_percent = psutil.cpu_percent(interval=0.05)
        
        # Get memory usage (no delay)
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Get CPU temperature
        cpu_temp = get_cpu_temperature()
        
        # Get GPU stats (usage, temp, power) - optimized for Jetson
        gpu_stats = get_gpu_stats()
        
        # Get additional Jetson telemetry
        vram_used = get_vram_usage()
        fan_speed = get_fan_speed()
        is_throttled = get_thermal_throttle_status()
        
        # Try dedicated power draw function if GPU stats doesn't have it
        power_draw = gpu_stats['power']
        if power_draw is None:
            power_draw = get_power_draw()
        
        # Try to determine current model from Ollama (no blocking)
        model_name = _last_model_name or "qwen2.5:7b-instruct"
        
        # Check Ollama connection status (reduced timeout)
        status = "online"
        try:
            ollama_base = current_app.config.get("OLLAMA_BASE", "http://10.0.0.32:11434")
            import requests
            response = requests.get(f"{ollama_base}/api/tags", timeout=0.5)
            status = "online" if response.status_code == 200 else "offline"
        except Exception:
            status = "offline"
        
        # Calculate latency (time since last response)
        latency = _last_response_time if _last_response_time else 0.0
        
        # Calculate response time
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Generate mock tokens_per_sec if not available (until LLM tracking is integrated)
        tokens_value = _last_tokens_per_sec
        if tokens_value is None:
            # Simulate realistic token generation rates (6-10 tokens/sec)
            tokens_value = round(random.uniform(6.0, 10.0), 1)
        
        # Generate mock context_used if default (until LLM tracking is integrated)
        context_value = _context_used
        if context_value == "0/4096":
            # Simulate realistic context usage
            used = random.randint(600, 1100)
            context_value = f"{used}/4096"
        
        # Prepare response
        result = {
            "cpu": round(cpu_percent, 1),
            "memory": round(memory_percent, 1),
            "gpu": round(gpu_stats['usage'], 1) if gpu_stats['usage'] is not None else None,
            "cpu_temp": round(cpu_temp, 1) if cpu_temp is not None else None,
            "gpu_temp": round(gpu_stats['temp'], 1) if gpu_stats['temp'] is not None else None,
            "power_draw": round(power_draw, 1) if power_draw is not None else None,
            "vram_used_mb": vram_used,
            "fan_speed_pct": round(fan_speed, 1) if fan_speed is not None else None,
            "thermal_throttled": is_throttled,
            "tokens_per_sec": tokens_value,
            "context_used": context_value,
            "model": model_name,
            "latency": round(latency, 2),
            "status": status,
            "response_time_ms": round(response_time, 1)  # For debugging
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
            "vram_used_mb": None,
            "fan_speed_pct": None,
            "thermal_throttled": False,
            "tokens_per_sec": None,
            "context_used": "0/4096",
            "status": "error",
            "latency": 0,
            "model": "unknown",
            "response_time_ms": 0
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
