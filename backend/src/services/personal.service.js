const pool = require('../config/database');
const mainPool = require('../config/mainDatabase');

const obtenerPersonal = async () => {
  const personalResult = await mainPool.query(`
    SELECT
      p.id_persona,
      p.nombre,
      p.apellido_p,
      p.apellido_m
    FROM persona p
    INNER JOIN personal pe
      ON pe.id_persona = p.id_persona
    WHERE pe.es_vigente = true
    ORDER BY
      p.apellido_p,
      p.apellido_m,
      p.nombre
  `);

  const academicoResult = await pool.query(`
    SELECT
      id_persona,
      monitorea
    FROM personal_academico
  `);

  const academicos = new Map(
    academicoResult.rows.map(persona => [
      persona.id_persona,
      persona.monitorea
    ])
  );

  return personalResult.rows.map(persona => ({
    ...persona,
    monitorea: academicos.get(persona.id_persona) ?? false
  }));
};

const actualizarMonitoreo = async (
  id_persona,
  monitorea
) => {
  const result = await pool.query(`
    INSERT INTO personal_academico (
      id_persona,
      monitorea
    )
    VALUES ($1, $2)

    ON CONFLICT (id_persona)
    DO UPDATE SET
      monitorea = EXCLUDED.monitorea,
      updated_at = CURRENT_TIMESTAMP

    RETURNING *
  `, [
    id_persona,
    monitorea
  ]);

  return result.rows[0];
};

module.exports = {
  obtenerPersonal,
  actualizarMonitoreo
};