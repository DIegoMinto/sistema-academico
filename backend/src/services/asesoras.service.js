
const dbAcademica = require('../config/database');
const mainPool = require('../config/mainDatabase');

const obtenerAsesorasMonitoras = async () => {
  // La tabla personal_academico está en DATABASE_URL.
  const resultado = await dbAcademica.query(`
    SELECT id_persona
    FROM public.personal_academico
    WHERE monitorea = TRUE
    ORDER BY id_persona ASC
  `);

  const idsPersonas = resultado.rows.map(
    persona => persona.id_persona
  );

  if (idsPersonas.length === 0) {
    return [];
  }

  // Los nombres están en la base principal.
  const personas = await mainPool.query(
    `
      SELECT
        id_persona,
        TRIM(
          CONCAT_WS(
            ' ',
            NULLIF(TRIM(nombre), ''),
            NULLIF(TRIM(apellido_p), ''),
            NULLIF(TRIM(apellido_m), '')
          )
        ) AS nombre
      FROM public.persona
      WHERE id_persona = ANY($1::bigint[])
      ORDER BY nombre ASC
    `,
    [idsPersonas]
  );

  return personas.rows;
};

module.exports = {
  obtenerAsesorasMonitoras
};