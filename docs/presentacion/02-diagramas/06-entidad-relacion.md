# 06 · Modelo entidad-relación

Las seis tablas de `tms_db` (esquema de la migración 009). `mediciones` cuelga de `sesiones` con borrado en cascada y la restricción `UNIQUE(sesion_id, seq)`, que hace idempotentes los lotes de la Pico. `dispositivos` no tiene llaves foráneas: la Pico se autentica con su token (se guarda su SHA-256). Posiciones en mm del sistema, campo en µT, horas en UTC.

**Fuente:** `server/setup_db.sql`, `server/migrations/002` a `009`.

```mermaid
erDiagram
  usuarios ||--o{ sesiones_login : "abre"
  usuarios |o--o{ sesiones : "inicia"
  usuarios |o--o{ configuracion : "actualiza"
  sesiones ||--o{ mediciones : "contiene"
  usuarios {
    int id PK
    varchar usuario UK
    varchar nombre
    enum rol "admin, operador, observador"
    varchar hash_password "scrypt"
    bool activo
    bool debe_cambiar_password
    json preferencias
  }
  sesiones_login {
    char id PK "SHA-256 del token"
    int usuario_id FK
    datetime expira_en
    datetime ultimo_uso
    varchar ip
  }
  sesiones {
    int id PK
    int usuario_id FK
    enum modo "DC, AC"
    enum origen "sim, hw"
    decimal paso_mm
    enum medio
    decimal zona_x_mm
    decimal zona_y_mm
    decimal zona_z_mm
    datetime iniciada_en
    datetime terminada_en
    int puntos_esperados
    int puntos_recibidos
    json huecos
    json config_sensor "copia al iniciar"
    json config_general "punto de inicio"
    varchar version_firmware
    datetime eliminada_en "borrado lógico"
  }
  mediciones {
    int id PK
    int sesion_id FK
    int seq "UNIQUE con sesion_id"
    double x_mm
    double y_mm
    double z_mm
    double bx "µT"
    double by "µT"
    double bz "µT"
    double magnitud "µT"
    smallint raw_x "cuentas crudas"
    smallint raw_y
    smallint raw_z
    bool saturado
    datetime timestamp "servidor, UTC"
    datetime ts_dispositivo "Pico, UTC"
  }
  configuracion {
    varchar clave PK
    json valor
    datetime actualizado_en
    int actualizado_por FK
  }
  dispositivos {
    int id PK
    varchar nombre UK
    char token_hash UK "SHA-256"
    bool activo
    datetime ultimo_latido
    varchar firmware
    smallint rssi
  }
```
