require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración PostgreSQL/PostGIS
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'siac_tr_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Multer para fotos de incidentes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Middleware de autenticación
const autenticar = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Token requerido' });
  jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'siac_secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.usuario = decoded;
    next();
  });
};

// ==================== ENDPOINTS ====================

// 1. AUTENTICACIÓN
app.post('/api/auth/registro', async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (id, nombre, email, password_hash, telefono, direccion, rol) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nombre, email, rol',
      [uuidv4(), nombre, email, hash, telefono, direccion, 'vecino']
    );
    res.status(201).json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET || 'siac_secret_key', { expiresIn: '7d' });
    res.json({ success: true, token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. REPORTAR INCIDENTE (con georreferenciación)
app.post('/api/incidentes', autenticar, upload.single('foto'), async (req, res) => {
  try {
    const { tipo, descripcion, latitud, longitud, direccion_texto } = req.body;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      `INSERT INTO incidentes (id, usuario_id, tipo, descripcion, ubicacion, latitud, longitud, direccion_texto, foto_url, estado)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $5, $6, $7, $8, 'activo')
       RETURNING *`,
      [uuidv4(), req.usuario.id, tipo, descripcion, longitud, latitud, direccion_texto, foto_url]
    );
    const incidente = result.rows[0];
    // Emitir a todos los clientes conectados (simulación de notificación en tiempo real)
    io.emit('nuevo_incidente', incidente);
    res.status(201).json({ success: true, incidente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. OBTENER INCIDENTES CERCANOS (consulta espacial PostGIS)
app.get('/api/incidentes/cercanos', async (req, res) => {
  try {
    const { lat, lng, radio = 1000 } = req.query; // radio en metros
    const result = await pool.query(
      `SELECT id, tipo, descripcion, latitud, longitud, direccion_texto, foto_url, estado, fecha_reporte,
              ST_Distance(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distancia_metros
       FROM incidentes
       WHERE ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       AND estado = 'activo'
       ORDER BY distancia_metros`,
      [lng, lat, radio]
    );
    res.json({ success: true, count: result.rows.length, incidentes: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. OBTENER TODOS LOS INCIDENTES (para mapa de calor)
app.get('/api/incidentes', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, tipo, latitud, longitud, fecha_reporte, estado FROM incidentes WHERE estado = $1 ORDER BY fecha_reporte DESC', ['activo']);
    res.json({ success: true, incidentes: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. CONFIRMAR / DESCARTAR INCIDENTE
app.patch('/api/incidentes/:id/estado', autenticar, async (req, res) => {
  try {
    const { estado } = req.body; // 'confirmado', 'descartado', 'resuelto'
    await pool.query('UPDATE incidentes SET estado = $1 WHERE id = $2', [estado, req.params.id]);
    res.json({ success: true, message: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. CHAT VECINAL (mensajes por zona)
app.post('/api/chat', autenticar, async (req, res) => {
  try {
    const { mensaje, zona } = req.body;
    const result = await pool.query(
      'INSERT INTO mensajes_chat (id, usuario_id, usuario_nombre, mensaje, zona) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [uuidv4(), req.usuario.id, req.usuario.nombre || 'Vecino', mensaje, zona || 'general']
    );
    io.emit('nuevo_mensaje', result.rows[0]);
    res.status(201).json({ success: true, mensaje: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat', async (req, res) => {
  try {
    const { zona = 'general' } = req.query;
    const result = await pool.query(
      'SELECT * FROM mensajes_chat WHERE zona = $1 ORDER BY fecha_envio DESC LIMIT 50',
      [zona]
    );
    res.json({ success: true, mensajes: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. ESTADÍSTICAS (para análisis de patrones)
app.get('/api/estadisticas', async (req, res) => {
  try {
    const porTipo = await pool.query('SELECT tipo, COUNT(*) as total FROM incidentes WHERE estado = $1 GROUP BY tipo', ['activo']);
    const porFecha = await pool.query("SELECT DATE(fecha_reporte) as fecha, COUNT(*) as total FROM incidentes WHERE estado = 'activo' GROUP BY DATE(fecha_reporte) ORDER BY fecha DESC LIMIT 7");
    res.json({ success: true, por_tipo: porTipo.rows, por_fecha: porFecha.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'SIAC-TR API funcionando', trl: 5, fecha: new Date() }));

// Socket.io para tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 SIAC-TR Backend corriendo en puerto ${PORT}`));
