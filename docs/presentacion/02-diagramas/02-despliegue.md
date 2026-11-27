# 02 · Despliegue

Dónde corre cada pieza y por qué puerto se habla. La red es la Wi-Fi del laboratorio (o el hotspot de un iPhone). La Pico y la app móvil van directo al puerto 4000 de Express; los navegadores entran por Nginx (HTTPS), que quita el prefijo `/api`. Hoy el servidor es la laptop de desarrollo; la Raspberry Pi 5 está prevista y, al instalarla, hay que decidir si el puerto 4000 queda abierto a la red (lo necesitan la Pico y la app).

**Fuente:** `nginx/tms.conf` (no se toca), `server/.env.example`, `COMANDOS.md`; CLAUDE.md §0.5, §0.6 y §2.

```mermaid
flowchart LR
  subgraph RED["Red Wi-Fi"]
    PICO["Pico 2 W<br/>cliente HTTP"]
    subgraph HOST["Servidor"]
      NGX["Nginx :443<br/>HTTPS · quita /api"]
      EXP["Express :4000<br/>HOST 0.0.0.0 en las pruebas"]
      DB[("MariaDB :3306<br/>solo 127.0.0.1")]
    end
    LAP["Laptops<br/>navegador"]
    TEL["Teléfonos<br/>navegador o app"]
  end
  PICO -- "POST /api/dispositivo/... :4000" --> EXP
  LAP -- HTTPS --> NGX
  TEL -- HTTPS --> NGX
  NGX -- "proxy_pass 127.0.0.1:4000" --> EXP
  TEL -- "app TMS Monitor · HTTP :4000" --> EXP
  EXP --> DB
```
