const crypto = require('crypto');

const pool = require('../config/database');

const ENCRYPTION_KEY = process.env.ZOOM_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    'ZOOM_ENCRYPTION_KEY no está definido en .env'
  );
}

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  return crypto
    .createHash('sha256')
    .update(ENCRYPTION_KEY)
    .digest();
};

const encriptarPassword = (password) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getKey(),
    iv
  );

  let encrypted = cipher.update(
    password,
    'utf8',
    'hex'
  );

  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
};

const desencriptarPassword = (passwordEncriptada) => {
  const [
    ivHex,
    authTagHex,
    encrypted
  ] = passwordEncriptada.split(':');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(
    Buffer.from(authTagHex, 'hex')
  );

  let decrypted = decipher.update(
    encrypted,
    'hex',
    'utf8'
  );

  decrypted += decipher.final('utf8');

  return decrypted;
};


// =========================================================
// OBTENER TODAS LAS CUENTAS
// =========================================================

const obtenerCuentas = async () => {
  const result = await pool.query(`
    SELECT
      id,
      nombre,
      correo,
      activa,
      fecha_pago,
      fecha_caducidad,
      importe_usd,
      created_at,
      updated_at
    FROM cuentas_zoom
    ORDER BY nombre
  `);

  return result.rows;
};


// =========================================================
// OBTENER UNA CUENTA
// =========================================================

const obtenerCuentaPorId = async (id) => {
  const result = await pool.query(`
    SELECT
      id,
      nombre,
      correo,
      password_encriptada,
      activa
    FROM cuentas_zoom
    WHERE id = $1
  `, [id]);

  return result.rows[0];
};


// =========================================================
// CREAR CUENTA
// =========================================================


const crearCuenta = async (
  nombre,
  correo,
  password,
  fechaPago,
  fechaCaducidad,
  importeUsd
) => {
  const passwordEncriptada = encriptarPassword(password);

  const result = await pool.query(`
    INSERT INTO cuentas_zoom (
      nombre,
      correo,
      password_encriptada,
      fecha_pago,
      fecha_caducidad,
      importe_usd
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      nombre,
      correo,
      activa,
      fecha_pago,
      fecha_caducidad,
      importe_usd,
      created_at,
      updated_at
  `, [
    nombre,
    correo,
    passwordEncriptada,
    fechaPago || null,
    fechaCaducidad || null,
    importeUsd === '' || importeUsd == null ? null : importeUsd
  ]);

  return result.rows[0];
};



// =========================================================
// ACTUALIZAR CUENTA
// =========================================================


const actualizarCuenta = async (
  id,
  nombre,
  correo,
  password,
  fechaPago,
  fechaCaducidad,
  importeUsd
) => {
  const parametros = [
    nombre,
    correo,
    fechaPago || null,
    fechaCaducidad || null,
    importeUsd === '' || importeUsd == null ? null : importeUsd
  ];

  let consulta;
  let valores;

  if (password) {
    const passwordEncriptada = encriptarPassword(password);

    consulta = `
      UPDATE cuentas_zoom
      SET
        nombre = $1,
        correo = $2,
        fecha_pago = $3,
        fecha_caducidad = $4,
        importe_usd = $5,
        password_encriptada = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING
        id,
        nombre,
        correo,
        activa,
        fecha_pago,
        fecha_caducidad,
        importe_usd,
        created_at,
        updated_at
    `;

    valores = [...parametros, passwordEncriptada, id];
  } else {
    consulta = `
      UPDATE cuentas_zoom
      SET
        nombre = $1,
        correo = $2,
        fecha_pago = $3,
        fecha_caducidad = $4,
        importe_usd = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING
        id,
        nombre,
        correo,
        activa,
        fecha_pago,
        fecha_caducidad,
        importe_usd,
        created_at,
        updated_at
    `;

    valores = [...parametros, id];
  }

  const result = await pool.query(consulta, valores);

  return result.rows[0];
};



// =========================================================
// ACTIVAR / DESACTIVAR
// =========================================================

const actualizarEstado = async (
  id,
  activa
) => {

  const result = await pool.query(`
    UPDATE cuentas_zoom
    SET
      activa = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING
      id,
      nombre,
      correo,
      activa,
      updated_at
  `, [
    activa,
    id
  ]);

  return result.rows[0];
};


// =========================================================
// ELIMINAR
// =========================================================

const eliminarCuenta = async (id) => {

  const result = await pool.query(`
    DELETE FROM cuentas_zoom
    WHERE id = $1
    RETURNING id
  `, [id]);

  return result.rows[0];
};


// =========================================================
// OBTENER CONTRASEÑA
// =========================================================

const obtenerPassword = async (id) => {

  const cuenta = await obtenerCuentaPorId(id);

  if (!cuenta) {
    return null;
  }

  return desencriptarPassword(
    cuenta.password_encriptada
  );
};


module.exports = {
  obtenerCuentas,
  obtenerCuentaPorId,
  crearCuenta,
  actualizarCuenta,
  actualizarEstado,
  eliminarCuenta,
  obtenerPassword
};