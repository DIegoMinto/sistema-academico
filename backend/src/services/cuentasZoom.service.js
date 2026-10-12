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
  password
) => {
  const passwordEncriptada =
    encriptarPassword(password);

  const result = await pool.query(`
    INSERT INTO cuentas_zoom (
      nombre,
      correo,
      password_encriptada
    )
    VALUES ($1, $2, $3)
    RETURNING
      id,
      nombre,
      correo,
      activa,
      created_at,
      updated_at
  `, [
    nombre,
    correo,
    passwordEncriptada
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
  password
) => {

  if (password) {

    const passwordEncriptada =
      encriptarPassword(password);

    const result = await pool.query(`
      UPDATE cuentas_zoom
      SET
        nombre = $1,
        correo = $2,
        password_encriptada = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING
        id,
        nombre,
        correo,
        activa,
        created_at,
        updated_at
    `, [
      nombre,
      correo,
      passwordEncriptada,
      id
    ]);

    return result.rows[0];
  }


  const result = await pool.query(`
    UPDATE cuentas_zoom
    SET
      nombre = $1,
      correo = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING
      id,
      nombre,
      correo,
      activa,
      created_at,
      updated_at
  `, [
    nombre,
    correo,
    id
  ]);

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