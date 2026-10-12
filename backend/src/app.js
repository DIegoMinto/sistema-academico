
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

require('dotenv').config();

const pool = require('./config/database');

const personalRoutes = require('./routes/personal.routes');
const authRoutes = require('./routes/auth.routes');
const cuentasZoomRoutes = require('./routes/cuentasZoom.routes');
const programasRoutes = require('./routes/programas.routes');
const modulosRoutes = require('./routes/modulos.routes');
const asignacionZoomRoutes = require('./routes/asignacionZoom.routes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Render utiliza un proxy HTTPS delante de la aplicación.
if (isProduction) {
  app.set('trust proxy', 1);
}

// Dominios autorizados para acceder al backend.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(isProduction ? [] : ['http://localhost:5173'])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite solicitudes sin Origin, por ejemplo, comprobaciones del servidor.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no autorizado por CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// En producción, no iniciar sesiones con un secreto ausente.
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('Falta configurar SESSION_SECRET en el entorno');
}

// Sesiones persistidas en PostgreSQL.
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'sesiones'
  }),
  name: 'sistema.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// Comprobación de disponibilidad.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sistema academico funcionando'
  });
});

// Rutas de la API.
app.use('/api/auth', authRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/cuentas-zoom', cuentasZoomRoutes);
app.use('/api/programas', programasRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/asignacion-zoom', asignacionZoomRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend activo en el puerto ${PORT}`);
});
