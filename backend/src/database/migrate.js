require('dotenv').config();

const fs = require('fs');
const path = require('path');

const pool = require('../config/database');

const migrationsPath = path.resolve(
  __dirname,
  '../../../database/migrations'
);

const ejecutarMigraciones = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Ejecutando migraciones...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const archivos = fs
      .readdirSync(migrationsPath)
      .filter(archivo => archivo.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {

      const existe = await client.query(
        `
          SELECT 1
          FROM schema_migrations
          WHERE filename = $1
        `,
        [archivo]
      );

      if (existe.rowCount > 0) {
        console.log(`⏭️  Ya aplicada: ${archivo}`);
        continue;
      }

      console.log(`▶️  Aplicando: ${archivo}`);

      const sql = fs.readFileSync(
        path.join(migrationsPath, archivo),
        'utf8'
      );

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          `
            INSERT INTO schema_migrations (filename)
            VALUES ($1)
          `,
          [archivo]
        );

        await client.query('COMMIT');

        console.log(`✅ Aplicada: ${archivo}\n`);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('🎉 Migraciones completadas');

  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);

    process.exitCode = 1;

  } finally {
    client.release();
    await pool.end();
  }
};

ejecutarMigraciones();