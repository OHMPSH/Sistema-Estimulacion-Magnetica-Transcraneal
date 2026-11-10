STA_IF = 0


class WLAN:
    conectado = True      # las pruebas lo apagan para simular la caída del Wi-Fi

    def __init__(self, interfaz):
        pass

    def active(self, v=None):
        return True

    def config(self, **k):
        pass

    def connect(self, ssid, password):
        pass

    def isconnected(self):
        return WLAN.conectado

    def status(self, campo=None):
        return -52 if campo == "rssi" else 3

    def ifconfig(self):
        return ("127.0.0.1", "255.255.255.0", "127.0.0.1", "8.8.8.8")
