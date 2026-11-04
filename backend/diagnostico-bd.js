
require('dotenv').config({ path: './backend/.env' });

const db = require('./src/config/database');
const main = require('./src/config/mainDatabase');

async function diagnosticar() {
  try {
    console.log('\n========== ESTRUCTURA ACADÉMICA ==========');

    const estructura = await main.query(`
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

    console.table(estructura.rows);

    console.log('\n========== ÚLTIMOS MÓDULOS ==========');

    const modulos = await main.query(`
      SELECT
        id_modulo,
        nombre,
        fecha_inicio,
        dias_clase,
        cantidad_sesiones
      FROM public.programa_modulos
      ORDER BY id_modulo DESC
      LIMIT 5
    `);

    console.table(modulos.rows);

    console.log('\n========== SESIONES DEL MÓDULO 31 ==========');

    const sesiones = await main.query(`
      SELECT
        id_sesion,
        id_modulo,
        titulo,
        fecha,
        hora_inicio,
        hora_fin,
        estado
      FROM public.programa_sesiones
      WHERE id_modulo = 31
      ORDER BY fecha, hora_inicio
    `);

    console.table(sesiones.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
    await main.end();
  }
}

diagnosticar();
