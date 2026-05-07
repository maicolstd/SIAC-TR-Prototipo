# SIAC-TR-Prototipo

SIAC-TR: Sistema Inteligente de Alertas Comunitarias en Tiempo Real
Proyecto de Grado - Fase 4: Desarrollo del Componente Práctico
Universidad Nacional Abierta y a Distancia (UNAD)
Programa: Ingeniería de Sistemas | Curso: 202016907 - Proyecto de Grado Autores: Michael Stivens Arguello Lotero 
Tutor: Orlando Gómez Barboza Fecha: Mayo 2026

Descripción del Prototipo
SIAC-TR es un sistema móvil multiplataforma para la gestión de alertas comunitarias en el barrio Autopista Sur (Localidad Puente Aranda, Bogotá), integrando georreferenciación en tiempo real, análisis de patrones espacio-temporales y comunicación vecinal instantánea.
Nivel de Madurez Tecnológica: TRL 5 (Validación en entorno relevante con usuarios reales)

Arquitectura del Sistema
•	Frontend: React Native 0.72+ con Expo SDK 49 (multiplataforma iOS/Android)
•	Backend: Node.js 18 LTS + Express.js 4.x + Socket.io (WebSockets)
•	Base de Datos: PostgreSQL 15 + PostGIS 3.3 (datos espaciales)
•	Notificaciones: Firebase Cloud Messaging (FCM) + WebSockets en tiempo real
•	Georreferenciación: Google Maps API v3 / OpenStreetMap (fallback)
•	Autenticación: JWT (JSON Web Tokens) + bcrypt

Instalación Rápida (3 pasos)
Paso 1: Base de Datos PostgreSQL/PostGIS
# Instalar PostgreSQL y PostGIS (Windows/Mac/Linux)
# O usar Docker:
docker run --name siac-postgis -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgis/postgis:15-3.3

# Crear base de datos y tablas
psql -U postgres -f siac_tr_database.sql
Paso 2: Backend
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales PostgreSQL
npm start
# Servidor corriendo en http://localhost:3000
Paso 3: Frontend (React Native / Expo)
cd frontend
# Renombrar frontend_package.json a package.json
mv frontend_package.json package.json
npm install
npx expo start
# Escanear QR con app Expo Go en tu celular

Estructura del Repositorio
siac-tr-prototipo/
├── backend/
│   ├── server.js          # API RESTful + WebSockets
│   ├── package.json
│   ├── .env.example
│   └── uploads/           # Fotos de incidentes
├── frontend/
│   ├── App.js             # Aplicación React Native
│   └── package.json
├── database/
│   └── siac_tr_database.sql
└── README.md

Credenciales de Demo
•	Email: demo@siac-tr.com
•	Password: 123456

Endpoints API Principales
Método	Endpoint	Descripción
POST	/api/auth/registro	Registro de vecinos
POST	/api/auth/login	Autenticación JWT
POST	/api/incidentes	Reportar incidente con GPS
GET	/api/incidentes	Listar incidentes (mapa de calor)
GET	/api/incidentes/cercanos	Consulta espacial PostGIS (radio configurable)
PATCH	/api/incidentes/:id/estado	Confirmar/descartar incidente
POST	/api/chat	Enviar mensaje vecinal
GET	/api/chat	Obtener chat por zona
GET	/api/estadisticas	Análisis descriptivo de patrones

Funcionalidades TRL 5 Implementadas
1.	✅ Autenticación con verificación de residencia (JWT + roles)
2.	✅ Reporte georreferenciado de incidentes (GPS automático + foto)
3.	✅ Mapa interactivo con visualización de incidentes cercanos
4.	✅ Sistema de notificaciones en tiempo real (WebSockets + geofencing simulado)
5.	✅ Chat vecinal organizado por micro-territorios
6.	✅ Análisis estadístico descriptivo de patrones espacio-temporales

Licencia
Proyecto académico UNAD 2026. Uso educativo.
