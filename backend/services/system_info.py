import psutil
import os
import subprocess


def get_cpu_load():
    try:
        return psutil.cpu_percent(interval=0.1)
    except:
        return 0.0


def get_ram_info():
    try:
        mem = psutil.virtual_memory()
        return {
            'used_gb': round(mem.used / (1024 ** 3), 2),
            'total_gb': round(mem.total / (1024 ** 3), 2)
        }
    except:
        return {'used_gb': 0.0, 'total_gb': 0.0}


def get_gpu_load():
    try:
        with open('/sys/devices/gpu.0/load', 'r') as f:
            load = int(f.read().strip()) / 10  # Assuming scale 0-1000
        return load
    except:
        try:
            # Fallback to tegrastats parsing
            result = subprocess.run(['tegrastats', '--one-shot'], capture_output=True, text=True, timeout=5)
            # Parse for GPU load, e.g. "GR3D_FREQ 0%@[320]"
            # This is simplified; real parsing needed
            lines = result.stdout.split('\n')
            for line in lines:
                if 'GR3D_FREQ' in line:
                    # Extract percentage, rough
                    if '%' in line:
                        return float(line.split('%')[0].split()[-1])
        except:
            pass
        return None


def get_gpu_mode():
    try:
        with open('/sys/devices/gpu.0/pstate', 'r') as f:
            pstate = int(f.read().strip())
        # Mapping pstate to mode, approximate
        modes = {
            0: "MaxN",
            1: "5W",
            2: "10W",
            3: "15W"
        }
        return modes.get(pstate, str(pstate))
    except:
        return None


def get_temps():
    temps = {}
    try:
        # CPU thermal
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temps['CPU'] = int(f.read().strip()) / 1000
        # GPU thermal
        try:
            with open('/sys/devices/virtual/thermal/thermal_zone1/temp', 'r') as f:
                temps['GPU'] = int(f.read().strip()) / 1000
        except:
            pass
    except:
        pass
    return temps


def get_power_mode():
    try:
        with open('/sys/devices/gpu.0/pstate', 'r') as f:
            return int(f.read().strip())
    except:
        return 0


def set_power_mode(mode):
    try:
        subprocess.run(['sudo', 'nvpmodel', '-m', str(mode)], check=True)
        subprocess.run(['sudo', 'jetson_clocks'], check=True)
        return True
    except subprocess.CalledProcessError:
        return False
