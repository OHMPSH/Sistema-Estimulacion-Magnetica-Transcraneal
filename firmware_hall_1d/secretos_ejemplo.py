# Copia este archivo como secretos.py (en la Pico y en esta carpeta) y complétalo.
# secretos.py está en el .gitignore de esta carpeta: nunca lo subas a git.

# La red Wi-Fi a la que está conectada la laptop (la misma para los dos).
# La Pico W solo usa redes de 2,4 GHz. Las mayúsculas cuentan.
WIFI_SSID = "nombre-de-tu-red"
WIFI_PASSWORD = "contraseña-de-tu-red"

# Token del dispositivo: lo genera un admin en el dashboard,
# Configuración › Dispositivo › Generar token (se muestra UNA sola vez).
TOKEN = "pega-aquí-el-token"

# La laptop con `HOST=0.0.0.0 npm run dev` en server/: su IP en esa red y el
# puerto 4000 (el backend directo, sin Nginx ni Vite). Saca la IP con
#   hostname -I
# Ejemplo: "http://192.168.1.70:4000"
SERVIDOR = "http://192.168.1.70:4000"
