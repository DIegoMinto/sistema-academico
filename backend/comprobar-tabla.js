
require('dotenv').config();

const dbLocal = require('./src/config/database');
const dbPrincipal = require('./src/config/mainDatabase');

async function comprobarAsesoras() {
  try {
    const resultado = await dbLocal.query(`
      SELECT id, id_persona, monitorea
      FROM personal_academico
      ORDER BY id
    `);

    const personas = resultado.rows;

    if (personas.length === 0) {
      console.log('No hay registros en personal_academico.');
      return;
    }

    const ids = personas.map(p => p.id_persona);

    const nombres = await dbPrincipal.query(
      `
        SELECT
          id_persona,
          nombre,
          apellido_p,
          apellido_m
        FROM public.persona
        WHERE id_persona = ANY($1::bigint[])
        ORDER BY nombre
      `,
      [ids]
    );

    console.log(
      'Personas y estado de monitoreo:',
      JSON.stringify(
        personas.map(p => {
          const persona = nombres.rows.find(
            n => String(n.id_persona) === String(p.id_persona)
          );

          return {
            id_persona: p.id_persona,
            nombre: persona
              ? `${persona.nombre} ${persona.apellido_p || ''} ${persona.apellido_m || ''}`.trim()
              : 'Persona no encontrada',
            monitorea: p.monitorea
          };
        }),
        null,
        2
      )
    );
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await Promise.all([
      dbLocal.end(),
      dbPrincipal.end()
    ]);
  }
}

comprobarAsesoras();