# Copia este archivo como secretos.py (en la Pico y en firmware/) y complétalo.
# secretos.py está en .gitignore: nunca lo subas a git.

WIFI_SSID = "iPhone de ..."
WIFI_PASSWORD = "..."

# Token del dispositivo: lo genera un admin en Configuración › Dispositivo
# (se muestra una sola vez).
TOKEN = "..."

# Detrás de Nginx (producción):  "https://172.20.10.2"  (IP de la Raspberry Pi 5)
# Servidor de desarrollo sin Nginx: "http://<ip>:4000" (el backend debe escuchar en esa interfaz)
SERVIDOR = "https://172.20.10.2"
