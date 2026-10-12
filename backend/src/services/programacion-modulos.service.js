
const dbAcademica = require('../config/database');
const mainPool = require('../config/mainDatabase');


function minutosHora(hora) {
  const [horas, minutos, segundos = '0'] = hora.split(':');

  return (
    Number(horas) * 3600 +
    Number(minutos) * 60 +
    Number(segundos)
  );
}

function compararFechaHora(fecha, hora) {
  return `${fecha} ${hora.padEnd(8, ':00')}`;
}

function hayCruce(a, b) {
  if (a.fecha !== b.fecha) return false;

  return (
    minutosHora(a.hora_inicio) < minutosHora(b.hora_fin) &&
    minutosHora(a.hora_fin) > minutosHora(b.hora_inicio)
  );
}

function validarSesiones(sesiones) {
  if (!Array.isArray(sesiones) || sesiones.length === 0) {
    throw new Error('Cada módulo debe tener al menos una sesión.');
  }

  for (const sesion of sesiones) {
    if (
      !sesion.fecha ||
      !sesion.titulo?.trim() ||
      !sesion.hora_inicio ||
      !sesion.hora_fin ||
      sesion.hora_fin <= sesion.hora_inicio
    ) {
      throw new Error(
        'Cada sesión necesita título, fecha y un horario válido.'
      );
    }
  }

  for (let i = 0; i < sesiones.length; i++) {
    for (let j = i + 1; j < sesiones.length; j++) {
      if (hayCruce(sesiones[i], sesiones[j])) {
        throw new Error(
          'Dos sesiones del mismo módulo se superponen. Corrige sus fechas u horarios.'
        );
      }
    }
  }
}

async function obtenerIdsHabilitados() {
  const resultado = await dbAcademica.query(`
    SELECT id_persona
    FROM public.personal_academico
    WHERE monitorea = TRUE
    ORDER BY id_persona
  `);

  return resultado.rows.map(
    fila => String(fila.id_persona)
  );
}

function elegirMonitora(sesionesPropuestas, candidatas, sesionesRegistradas) {
  if (candidatas.length === 0) {
    return {
      id_persona_asesora: null,
      motivo: 'No hay monitoras habilitadas.'
    };
  }

  const disponibles = candidatas.filter(idPersona => {
    const asignadas = sesionesRegistradas.filter(
      sesion =>
        String(sesion.id_persona_asesora) === idPersona
    );

    return !sesionesPropuestas.some(propuesta =>
      asignadas.some(existente => hayCruce(propuesta, existente))
    );
  });

  if (disponibles.length === 0) {
    return {
      id_persona_asesora: null,
      motivo: 'Por definir (Suplente): todas tienen cruces.'
    };
  }

  const primeraSesion = [...sesionesPropuestas].sort((a, b) =>
    compararFechaHora(a.fecha, a.hora_inicio).localeCompare(
      compararFechaHora(b.fecha, b.hora_inicio)
    )
  )[0];

  const evaluadas = disponibles.map(idPersona => {
    const sesionesPersona = sesionesRegistradas.filter(
      sesion =>
        String(sesion.id_persona_asesora) === idPersona
    );

    const anteriores = sesionesPersona
      .filter(sesion =>
        compararFechaHora(sesion.fecha, sesion.hora_fin) <
        compararFechaHora(primeraSesion.fecha, primeraSesion.hora_inicio)
      )
      .map(sesion => compararFechaHora(sesion.fecha, sesion.hora_fin))
      .sort();

    return {
      id_persona_asesora: idPersona,
      carga: sesionesPersona.length,
      ultimaSesion: anteriores.at(-1) || ''
    };
  });

  evaluadas.sort((a, b) => {
    if (a.carga !== b.carga) return a.carga - b.carga;

    if (a.ultimaSesion !== b.ultimaSesion) {
      if (!a.ultimaSesion) return -1;
      if (!b.ultimaSesion) return 1;
      return a.ultimaSesion.localeCompare(b.ultimaSesion);
    }

    return a.id_persona_asesora.localeCompare(
      b.id_persona_asesora,
      undefined,
      { numeric: true }
    );
  });

  return {
    id_persona_asesora: evaluadas[0].id_persona_asesora,
    motivo: 'Asignación automática',
    cargaActual: evaluadas[0].carga
  };
}

async function crearMultiplesModulos(idCurso, modulos) {
  if (!Array.isArray(modulos) || modulos.length === 0) {
    throw new Error('Debes enviar al menos un módulo.');
  }

  const candidatas = await obtenerIdsHabilitados();

  // Validar todos los módulos antes de iniciar la transacción.
  for (const modulo of modulos) {
    if (
      typeof modulo.nombre !== 'string' ||
      !modulo.nombre.trim() ||
      modulo.nombre.trim().length > 150
    ) {
      throw new Error(
        'Cada módulo necesita un nombre de hasta 150 caracteres.'
      );
    }

    if (!Number.isSafeInteger(Number(modulo.orden)) ||
        Number(modulo.orden) < 1) {
      throw new Error('El orden de cada módulo debe ser positivo.');
    }

    validarSesiones(modulo.sesiones);
  }

  const client = await mainPool.connect();

  try {
    await client.query('BEGIN');

    const existentes = await client.query(`
      SELECT
        pm.id_persona_asesora,
        ps.fecha::text AS fecha,
        ps.hora_inicio::text AS hora_inicio,
        ps.hora_fin::text AS hora_fin
      FROM public.programa_sesiones ps
      INNER JOIN public.programa_modulos pm
        ON pm.id_modulo = ps.id_modulo
      WHERE pm.id_persona_asesora IS NOT NULL
        AND ps.estado <> 'cancelada'
      FOR UPDATE OF ps
    `);

    // Incluye las sesiones existentes y las que asignemos
    // durante esta misma operación.
    const sesionesRegistradas = existentes.rows.map(s => ({
      ...s,
      id_persona_asesora: String(s.id_persona_asesora)
    }));

    const resultadoModulos = [];

    // Asignar en orden cronológico para que los módulos
    // de esta operación también se consideren entre sí.
    const ordenados = modulos.map((modulo, indice) => ({
      modulo,
      indice,
      primeraFecha: [...modulo.sesiones]
        .map(s => `${s.fecha} ${s.hora_inicio}`)
        .sort()[0]
    })).sort((a, b) =>
      a.primeraFecha.localeCompare(b.primeraFecha)
    );

    for (const item of ordenados) {
      const modulo = item.modulo;
      const sesiones = modulo.sesiones;

      let asignacion;

      if (modulo.id_persona_asesora) {
        const idElegido = String(modulo.id_persona_asesora);

        if (!candidatas.includes(idElegido)) {
          throw new Error(
            `La monitora seleccionada para "${modulo.nombre}" no está habilitada.`
          );
        }

        const tieneCruce = sesiones.some(propuesta =>
          sesionesRegistradas.some(existente =>
            String(existente.id_persona_asesora) === idElegido &&
            hayCruce(propuesta, existente)
          )
        );

        if (tieneCruce) {
          throw new Error(
            `La monitora elegida para "${modulo.nombre}" tiene un cruce de horario.`
          );
        }

        asignacion = {
          id_persona_asesora: idElegido,
          motivo: 'Asignación manual'
        };
      } else {
        asignacion = elegirMonitora(
          sesiones,
          candidatas,
          sesionesRegistradas
        );
      }

      const fechaInicio = modulo.fecha_inicio ||
        [...sesiones].map(s => s.fecha).sort()[0];

      const insertado = await client.query(
        `INSERT INTO public.programa_modulos
          (
            id_curso,
            nombre,
            descripcion,
            orden,
            fecha_inicio,
            dias_clase,
            cantidad_sesiones,
            id_persona_asesora
          )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          idCurso,
          modulo.nombre.trim(),
          modulo.descripcion?.trim() || null,
          Number(modulo.orden),
          fechaInicio,
          modulo.dias_clase || null,
          sesiones.length,
          asignacion.id_persona_asesora
        ]
      );

      const moduloCreado = insertado.rows[0];
      const sesionesCreadas = [];

      for (const sesion of sesiones) {
        const insertSesion = await client.query(
          `INSERT INTO public.programa_sesiones
            (
              id_modulo,
              titulo,
              fecha,
              hora_inicio,
              hora_fin
            )
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            moduloCreado.id_modulo,
            sesion.titulo.trim(),
            sesion.fecha,
            sesion.hora_inicio,
            sesion.hora_fin
          ]
        );

        sesionesCreadas.push(insertSesion.rows[0]);

        // La nueva sesión afecta a la carga y disponibilidad
        // de esta persona para los siguientes módulos.
        if (asignacion.id_persona_asesora) {
          sesionesRegistradas.push({
            id_persona_asesora: asignacion.id_persona_asesora,
            fecha: sesion.fecha,
            hora_inicio: sesion.hora_inicio,
            hora_fin: sesion.hora_fin
          });
        }
      }

      resultadoModulos[item.indice] = {
        modulo: moduloCreado,
        sesiones: sesionesCreadas,
        asignacion
      };
    }

    await client.query('COMMIT');

    return resultadoModulos;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  crearMultiplesModulos
};