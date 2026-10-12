const bcrypt = require('bcrypt');

const pool = require('../config/database');

const buscarUsuario = async (usuario) => {
  const result = await pool.query(`
    SELECT
      id,
      usuario,
      password_hash,
      rol,
      activo
    FROM usuarios
    WHERE usuario = $1
    LIMIT 1
  `, [usuario]);

  return result.rows[0];
};

const verificarCredenciales = async (usuario, password) => {
  const usuarioDB = await buscarUsuario(usuario);

  if (!usuarioDB) {
    return null;
  }

  if (!usuarioDB.activo) {
    return null;
  }

  const passwordCorrecta = await bcrypt.compare(
    password,
    usuarioDB.password_hash
  );

  if (!passwordCorrecta) {
    return null;
  }

  return {
    id: usuarioDB.id,
    usuario: usuarioDB.usuario,
    rol: usuarioDB.rol
  };
};

module.exports = {
  buscarUsuario,
  verificarCredenciales
};