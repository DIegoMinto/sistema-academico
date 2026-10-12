require('dotenv').config();

const pool = require('../config/database');

const crearAdmin = async () => {
  try {
    const usuario = process.env.ADMIN_USER || 'admin';
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const rol = process.env.ADMIN_ROLE || 'admin';

    if (!passwordHash) {
      throw new Error(
        'ADMIN_PASSWORD_HASH no está definido en .env'
      );
    }

    await pool.query(`
      INSERT INTO usuarios (
        usuario,
        password_hash,
        rol
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (usuario)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        rol = EXCLUDED.rol,
        activo = TRUE,
        updated_at = CURRENT_TIMESTAMP
    `, [usuario, passwordHash, rol]);

    console.log(`✅ Usuario administrador "${usuario}" creado/actualizado`);

  } catch (error) {
    console.error('❌ Error creando administrador:', error);
    process.exitCode = 1;

  } finally {
    await pool.end();
  }
};

crearAdmin();