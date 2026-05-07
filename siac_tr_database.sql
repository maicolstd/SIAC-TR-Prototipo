-- =====================================================
-- SIAC-TR: Base de Datos Espacial PostgreSQL + PostGIS
-- Proyecto de Grado - Fase 4
-- Autores: Michael Stivens Arguello Lotero
-- =====================================================

-- 1. Crear base de datos (ejecutar como superusuario si es necesario)
-- CREATE DATABASE siac_tr_db;

-- 2. Habilitar extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 3. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    rol VARCHAR(20) DEFAULT 'vecino' CHECK (rol IN ('vecino', 'moderador', 'administrador')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Incidentes (con columna geoespacial)
CREATE TABLE IF NOT EXISTS incidentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('hurto_persona', 'hurto_residencia', 'sospecha', 'ruido', 'vandalismo', 'otro')),
    descripcion TEXT,
    ubicacion GEOMETRY(Point, 4326), -- PostGIS: punto geográfico WGS84
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,
    direccion_texto VARCHAR(255),
    foto_url VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'confirmado', 'descartado', 'resuelto')),
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Mensajes de Chat Vecinal
CREATE TABLE IF NOT EXISTS mensajes_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(150),
    mensaje TEXT NOT NULL,
    zona VARCHAR(50) DEFAULT 'general',
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Índices espaciales para optimizar consultas de proximidad (PostGIS)
CREATE INDEX IF NOT EXISTS idx_incidentes_ubicacion ON incidentes USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_incidentes_estado ON incidentes(estado);
CREATE INDEX IF NOT EXISTS idx_incidentes_fecha ON incidentes(fecha_reporte DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_zona ON mensajes_chat(zona);

-- 7. Datos de prueba para demostración TRL 5 (Barrio Autopista Sur, Bogotá)
-- Coordenadas aproximadas del sector: Carreras 50-51 / Autopista Sur - Calle 38 Sur

INSERT INTO usuarios (id, nombre, email, password_hash, telefono, direccion, rol) VALUES
('11111111-1111-1111-1111-111111111111', 'Usuario Demo', 'demo@siac-tr.com', '$2a$10$fakehashfordemo', '3001234567', 'Carrera 50 # 38-20 Sur', 'vecino'),
('22222222-2222-2222-2222-222222222222', 'Líder Comunal', 'lider@siac-tr.com', '$2a$10$fakehashfordemo', '3007654321', 'Carrera 51 # 38-15 Sur', 'moderador');

INSERT INTO incidentes (id, usuario_id, tipo, descripcion, ubicacion, latitud, longitud, direccion_texto, estado, fecha_reporte) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'hurto_persona', 'Intento de hurto cerca de la esquina', 
 ST_SetSRID(ST_MakePoint(-74.12345678, 4.61234567), 4326), 4.61234567, -74.12345678, 'Carrera 50 con Calle 38 Sur', 'activo', NOW() - INTERVAL '2 hours'),
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'sospecha', 'Personas extrañas merodeando el parqueadero',
 ST_SetSRID(ST_MakePoint(-74.12400000, 4.61300000), 4326), 4.61300000, -74.12400000, 'Carrera 51 # 38-50 Sur', 'activo', NOW() - INTERVAL '5 hours'),
('a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'hurto_residencia', 'Robo a apartamento en segundo piso',
 ST_SetSRID(ST_MakePoint(-74.12280000, 4.61150000), 4326), 4.61150000, -74.12280000, 'Autopista Sur con Carrera 50', 'confirmado', NOW() - INTERVAL '1 day');

INSERT INTO mensajes_chat (id, usuario_id, usuario_nombre, mensaje, zona) VALUES
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Usuario Demo', 'Hola vecinos, acabo de reportar un incidente en la esquina', 'general'),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Líder Comunal', 'Gracias por el reporte, estamos atentos', 'general');

-- 8. Verificación de datos espaciales
SELECT 'Base de datos SIAC-TR creada exitosamente' AS estado;
SELECT PostGIS_Version();
