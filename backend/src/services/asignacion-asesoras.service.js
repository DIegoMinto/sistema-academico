
const dbAcademica = require('../config/database');
const mainPool = require('../config/mainDatabase');

// Obtiene las personas habilitadas para monitorear.
const obtenerCandidatas = async () => {
  const resultado = await dbAcademica.query(`
    SELECT id_persona
    FROM public.personal_academico
    WHERE monitorea = TRUE
    ORDER BY id_persona
  `);

  return resultado.rows.map(
    fila => String(fila.id_persona)
  );
};

// Comprueba si dos sesiones se superponen.
const hayCruce = (propuesta, existente) => {
  if (propuesta.fecha !== existente.fecha) {
    return false;
  }

  return (
    propuesta.hora_inicio < existente.hora_fin &&
    propuesta.hora_fin > existente.hora_inicio
  );
};

// Elige una monitora para un módulo completo.
//
// sesionesPropuestas:
// [
//   {
//     fecha: '2026-11-10',
//     hora_inicio: '19:00',
//     hora_fin: '21:00'
//   }
// ]
const asignarMonitora = async (sesionesPropuestas) => {
  if (
    !Array.isArray(sesionesPropuestas) ||
    sesionesPropuestas.length === 0
  ) {
    throw new Error(
      'Debes proporcionar las sesiones del módulo.'
    );
  }

  for (const sesion of sesionesPropuestas) {
    if (
      !sesion.fecha ||
      !sesion.hora_inicio ||
      !sesion.hora_fin ||
      sesion.hora_fin <= sesion.hora_inicio
    ) {
      throw new Error(
        'Cada sesión debe tener fecha y horario válido.'
      );
    }
  }

  // 1. Candidatas habilitadas en la base académica.
  const idsHabilitados = await obtenerCandidatas();

  if (idsHabilitados.length === 0) {
    return {
      id_persona_asesora: null,
      motivo: 'No hay monitoras habilitadas.'
    };
  }

  // 2. Consultar las sesiones existentes en la BD principal.
  // Requiere que programa_modulos tenga id_persona_asesora.
  const resultado = await mainPool.query(`
    SELECT
      pm.id_persona_asesora,
      ps.fecha::text AS fecha,
      ps.hora_inicio::text AS hora_inicio,
      ps.hora_fin::text AS hora_fin,
      ps.estado
    FROM public.programa_sesiones ps
    INNER JOIN public.programa_modulos pm
      ON pm.id_modulo = ps.id_modulo
    WHERE pm.id_persona_asesora IS NOT NULL
      AND ps.estado <> 'cancelada'
  `);

  const sesionesExistentes = resultado.rows;

  // 3. Descartar candidatas con cruces de horario.
  const disponibles = idsHabilitados.filter(idPersona => {
    const sesionesPersona = sesionesExistentes.filter(
      sesion =>
        String(sesion.id_persona_asesora) === idPersona
    );

    return !sesionesPropuestas.some(propuesta =>
      sesionesPersona.some(existente =>
        hayCruce(propuesta, existente)
      )
    );
  });

  if (disponibles.length === 0) {
    return {
      id_persona_asesora: null,
      motivo: 'Por definir (Suplente): todas tienen cruces.'
    };
  }

  // 4. Equilibrar la carga por cantidad total de sesiones.
  const candidatasEvaluadas = disponibles.map(idPersona => {
    const sesionesPersona = sesionesExistentes.filter(
      sesion =>
        String(sesion.id_persona_asesora) === idPersona
    );

    const carga = sesionesPersona.length;

    // Buscar la última sesión anterior al inicio del módulo.
    const primeraPropuesta = [...sesionesPropuestas].sort(
      (a, b) =>
        `${a.fecha} ${a.hora_inicio}`.localeCompare(
          `${b.fecha} ${b.hora_inicio}`
        )
    )[0];

    const inicioModulo =
      `${primeraPropuesta.fecha} ${primeraPropuesta.hora_inicio}`;

    const sesionesAnteriores = sesionesPersona.filter(
      sesion =>
        `${sesion.fecha} ${sesion.hora_fin}` < inicioModulo
    );

    const ultimaSesion = sesionesAnteriores
      .map(sesion =>
        `${sesion.fecha} ${sesion.hora_fin}`
      )
      .sort()
      .at(-1);

    return {
      id_persona_asesora: idPersona,
      carga,
      ultimaSesion: ultimaSesion || ''
    };
  });

  candidatasEvaluadas.sort((a, b) => {
    // Primero, menos sesiones asignadas.
    if (a.carga !== b.carga) {
      return a.carga - b.carga;
    }

    // En empate, quien lleve más tiempo sin monitorear.
    if (a.ultimaSesion !== b.ultimaSesion) {
      if (!a.ultimaSesion) return -1;
      if (!b.ultimaSesion) return 1;

      return a.ultimaSesion.localeCompare(b.ultimaSesion);
    }

    // Desempate determinista.
    return a.id_persona_asesora.localeCompare(
      b.id_persona_asesora,
      undefined,
      { numeric: true }
    );
  });

  return {
    id_persona_asesora:
      candidatasEvaluadas[0].id_persona_asesora,
    motivo: 'Asignación automática',
    cargaActual: candidatasEvaluadas[0].carga
  };
};

module.exports = {
  obtenerCandidatas,
  asignarMonitora
};