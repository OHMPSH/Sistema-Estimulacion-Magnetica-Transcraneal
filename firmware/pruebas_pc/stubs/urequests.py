# `requests` de MicroPython sobre urllib (solo lo que usa el firmware)
import json as _json
import urllib.error
import urllib.request


class Respuesta:
    def __init__(self, status, cuerpo):
        self.status_code = status
        self.content = cuerpo

    def json(self):
        return _json.loads(self.content)

    def close(self):
        pass


def post(url, data=None, headers=None, timeout=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return Respuesta(r.status, r.read())
    except urllib.error.HTTPError as e:
        return Respuesta(e.code, e.read())
