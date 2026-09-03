import time
import psutil
from app.config import settings

def get_system_memory_mb() -> float:
    """Returns current process memory consumption in Megabytes."""
    try:
        process = psutil.Process()
        return process.memory_info().rss / (1024 * 1024)
    except Exception:
        return 0.0

def is_within_memory_budget() -> bool:
    """Checks whether the system memory usage is within the specified limit."""
    current_mb = get_system_memory_mb()
    return current_mb <= (settings.RAM_LIMIT_GB * 1024)

class PerformanceTimer:
    """High-resolution latency timer."""
    def __init__(self):
        self.start_time = 0.0
        self.elapsed_ms = 0.0

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_ms = (time.perf_counter() - self.start_time) * 1000.0
