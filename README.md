#  SAVD | Sistema Automatizado de Adquisición y Visualización de Datos

Plataforma *Full-Stack IoT* de telemetría distribuida diseñada para la caracterización tridimensional de campos electromagnéticos inducidos por equipos de Estimulación Magnética Transcraneal (TMS). 

Este proyecto resuelve el problema de alta latencia inherente a las arquitecturas de adquisición secuenciales. Al implementar un paradigma de digitalización concurrente y procesamiento en el borde (*Edge Computing*), el SAVD reduce el ciclo de mapeo topográfico de tres horas a treinta minutos, proveyendo a los investigadores de herramientas de monitoreo en tiempo real sobre modelos físicos (*phantoms* de solución salina).

---

##  Arquitectura del Sistema

El proyecto se divide en tres capas funcionales, integrando hardware de adquisición concurrente, una base de datos relacional de grado industrial y una interfaz web reactiva.

| Capa Arquitectónica | Tecnología / Hardware | Descripción Técnica |
| :--- | :--- | :--- |
| **Instrumentación y Adquisición** | Raspberry Pi Pico 2W (C++ / MicroPython) | Digitalización simultánea de los tres ejes espaciales. El muestreo analógico está orquestado por una **instancia** dedicada bajo el paradigma de Programación Orientada a Objetos, garantizando concurrencia. |
| **Acondicionamiento Analógico** | Filtro Activo MFB de Bessel | Acondicionamiento de señal con respuesta de fase lineal para la supresión de ruido electromagnético de alta frecuencia, previniendo distorsiones transitorias. |
| **Servidor Central (Backend)** | SBC Raspberry Pi 5 + Node.js (Express) | Nodo maestro de la red local (LAN) que expone una API REST para procesar las tramas JSON recibidas vía Wi-Fi (TCP/HTTP) desde la capa de adquisición. |
| **Persistencia de Datos** | MariaDB (Motor InnoDB) | Base de datos relacional estructurada en la Tercera Forma Normal (3FN), garantizando el cumplimiento ACID para la protección e integridad del historial métrico. |
| **Telemetría y Visualización** | React.js + Vite | Interfaz Gráfica de Usuario (*Dashboard*) que consume la API REST para renderizar los vectores electromagnéticos dinámicamente, eliminando la carencia de retroalimentación en tiempo real. |

---

##  Características Principales

* **Digitalización Simultánea (3-DOF):** Captura concurrente de las componentes vectoriales espaciales para erradicar el cuello de botella del hardware genérico secuencial.
* **Telemetría Distribuida:** Monitoreo multiplataforma que independiza la supervisión del ensayo de la estación de trabajo física.
* **Integridad Transaccional:** Almacenamiento riguroso de cada lectura con *timestamps* de alta precisión y coordenadas milimétricas, blindado ante fallos de energía.
* **Diseño Escalable:** Arquitectura Modelo-Vista-Controlador (MVC) en el *backend*, preparada para futuras integraciones de algoritmos de control de lazo cerrado.

---

##  Instalación y Despliegue Local

**1. Clonar el repositorio:**
git clone https://github.com/tu-usuario/savd-tms-iot.git

**2. Configuración de la Base de Datos (MariaDB):**
Ejecutar el script de aprovisionamiento en la SBC Raspberry Pi 5:
sudo mysql -u root < database/setup_db.sql

**3. Despliegue del Servidor (Node.js):**
cd backend
npm install
npm run start

**4. Compilación del Dashboard Web (React):**
cd frontend
npm install
npm run build
npm run preview
