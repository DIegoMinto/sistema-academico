const { Pool } = require('pg');

const connectionString = process.env.MAIN_DATABASE_URL;
const hostname = connectionString
  ? new URL(connectionString).hostname
  : '';

const isLocal = ['localhost', '127.0.0.1'].includes(hostname);

const mainPool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

mainPool.on('connect', () => {
  console.log('Conexión a la base principal establecida');
});

mainPool.on('error', (error) => {
  console.error('Error inesperado en la base principal:', error);
});

// Diagnóstico temporal
(async () => {
  try {
    const { rows } = await mainPool.query(`
      SELECT
        current_database() AS base_datos,
        current_schema() AS esquema,
        current_user AS usuario
    `);

    console.log('BASE PRINCIPAL:', rows[0]);

    const columnas = await mainPool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'programa_modulos',
          'programa_sesiones'
        )
      ORDER BY table_name, ordinal_position
    `);

    console.log('ESTRUCTURA DE PROGRAMACIÓN:', columnas.rows);

  } catch (error) {
    console.error('Error en diagnóstico:', error);
  }
})();

module.exports = mainPool;