# Agrega a `time` y `sys` lo que MicroPython tiene y CPython no.
import sys
import time
import traceback

if not hasattr(time, "ticks_ms"):
    time.ticks_ms = lambda: int(time.monotonic() * 1000)
    time.ticks_us = lambda: int(time.monotonic() * 1_000_000)
    time.ticks_diff = lambda a, b: a - b
    time.ticks_add = lambda a, b: a + b
    time.sleep_ms = lambda ms: time.sleep(ms / 1000)
    time.sleep_us = lambda us: time.sleep(us / 1_000_000)
if not hasattr(sys, "print_exception"):
    sys.print_exception = lambda e: traceback.print_exception(e)

# El firmware usa `requests` de MicroPython; en el PC se usa el simulado
import urequests as _urequests
sys.modules["requests"] = _urequests
