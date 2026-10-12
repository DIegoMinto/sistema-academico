
const db = require('../config/database');
const mainPool = require('../config/mainDatabase');

const obtenerAsignaciones = async () => {
  const [modulosResult, asignacionesResult] = await Promise.all([
    mainPool.query(`
      SELECT
        pm.id_modulo,
        pm.id_curso,
        c.nombre AS nombre_curso,
        pm.nombre AS nombre_modulo,
        pm.orden,
        pm.estado,
        COALESCE(
          json_agg(
            json_build_object(
              'id_sesion', ps.id_sesion,
              'titulo', ps.titulo,
              'fecha', ps.fecha::text,
              'hora_inicio', ps.hora_inicio::text,
              'hora_fin', ps.hora_fin::text,
              'estado', ps.estado
            )
            ORDER BY ps.fecha, ps.hora_inicio
          ) FILTER (WHERE ps.id_sesion IS NOT NULL),
          '[]'::json
        ) AS sesiones
      FROM public.programa_modulos pm
      JOIN public.curso c ON c.id_curso = pm.id_curso
      LEFT JOIN public.programa_sesiones ps
        ON ps.id_modulo = pm.id_modulo
       AND ps.estado <> 'cancelada'
      GROUP BY
        pm.id_modulo,
        pm.id_curso,
        c.nombre,
        pm.nombre,
        pm.orden,
        pm.estado
      ORDER BY c.nombre, pm.orden, pm.id_modulo
    `),

    db.query(`
      SELECT
        azm.id_modulo,
        cz.id AS id_cuenta_zoom,
        cz.nombre AS nombre_cuenta_zoom,
        cz.correo AS correo_cuenta_zoom
      FROM public.asignaciones_zoom_modulos azm
      JOIN public.cuentas_zoom cz
        ON cz.id = azm.id_cuenta_zoom
    `)
  ]);

  const asignaciones = new Map(
    asignacionesResult.rows.map((a) => [
      String(a.id_modulo),
      a
    ])
  );

  return modulosResult.rows.map((modulo) => {
    const asignacion = asignaciones.get(String(modulo.id_modulo));

    return {
      ...modulo,
      asignacion: asignacion
        ? {
            id_cuenta_zoom: asignacion.id_cuenta_zoom,
            nombre: asignacion.nombre_cuenta_zoom,
            correo: asignacion.correo_cuenta_zoom
          }
        : null
    };
  });
};

const obtenerSesionesModulos = async (idsModulos) => {
  if (!idsModulos.length) return [];

  const result = await mainPool.query(`
    SELECT
      ps.id_sesion,
      ps.id_modulo,
      pm.nombre AS nombre_modulo,
      pm.id_curso,
      c.nombre AS nombre_curso,
      ps.titulo,
      ps.fecha::text AS fecha,
      ps.hora_inicio::text AS hora_inicio,
      ps.hora_fin::text AS hora_fin
    FROM public.programa_sesiones ps
    JOIN public.programa_modulos pm
      ON pm.id_modulo = ps.id_modulo
    JOIN public.curso c
      ON c.id_curso = pm.id_curso
    WHERE ps.id_modulo = ANY($1::bigint[])
      AND ps.estado <> 'cancelada'
    ORDER BY ps.fecha, ps.hora_inicio
  `, [idsModulos]);

  return result.rows;
};

const hayCruce = (a, b) => {
  return (
    a.fecha === b.fecha &&
    a.hora_inicio < b.hora_fin &&
    a.hora_fin > b.hora_inicio
  );
};

const detectarConflictos = async (idModulo, idCuentaZoom) => {
  const moduloResult = await mainPool.query(`
    SELECT id_modulo, nombre, id_curso
    FROM public.programa_modulos
    WHERE id_modulo = $1
  `, [idModulo]);

  if (!moduloResult.rowCount) {
    const error = new Error('El módulo seleccionado no existe.');
    error.status = 404;
    throw error;
  }

  const sesionesObjetivo = await obtenerSesionesModulos([idModulo]);

  if (!sesionesObjetivo.length) {
    return [];
  }

  const asignacionesResult = await db.query(`
    SELECT id_modulo
    FROM public.asignaciones_zoom_modulos
    WHERE id_cuenta_zoom = $1
      AND id_modulo <> $2
  `, [idCuentaZoom, idModulo]);

  const idsOcupados = asignacionesResult.rows.map(
    (row) => String(row.id_modulo)
  );

  if (!idsOcupados.length) {
    return [];
  }

  const sesionesOcupadas = await obtenerSesionesModulos(idsOcupados);
  const conflictos = [];

  for (const nueva of sesionesObjetivo) {
    for (const existente of sesionesOcupadas) {
      if (hayCruce(nueva, existente)) {
        conflictos.push({
          curso: existente.nombre_curso,
          modulo: existente.nombre_modulo,
          id_modulo: existente.id_modulo,
          sesion: existente.titulo,
          fecha: existente.fecha,
          hora_inicio: existente.hora_inicio,
          hora_fin: existente.hora_fin,
          sesion_nueva: nueva.titulo,
          fecha_nueva: nueva.fecha,
          hora_inicio_nueva: nueva.hora_inicio,
          hora_fin_nueva: nueva.hora_fin
        });
      }
    }
  }

  return conflictos;
};

const validarAsignacion = async (idModulo, idCuentaZoom) => {
  const cuentaResult = await db.query(`
    SELECT id, nombre, correo, activa
    FROM public.cuentas_zoom
    WHERE id = $1
  `, [idCuentaZoom]);

  if (!cuentaResult.rowCount) {
    const error = new Error('La cuenta Zoom seleccionada no existe.');
    error.status = 404;
    throw error;
  }

  if (!cuentaResult.rows[0].activa) {
    const error = new Error('No puedes asignar una cuenta Zoom inactiva.');
    error.status = 400;
    throw error;
  }

  const conflictos = await detectarConflictos(idModulo, idCuentaZoom);

  return {
    cuenta: cuentaResult.rows[0],
    conflictos
  };
};

const previsualizarAsignacion = async (idModulo, idCuentaZoom) => {
  return validarAsignacion(idModulo, idCuentaZoom);
};

const guardarAsignacion = async (idModulo, idCuentaZoom) => {
  const { cuenta, conflictos } = await validarAsignacion(
    idModulo,
    idCuentaZoom
  );

  if (conflictos.length) {
    const error = new Error(
      'La cuenta Zoom tiene conflictos de horario con otro módulo.'
    );
    error.status = 409;
    error.conflictos = conflictos;
    throw error;
  }

  const result = await db.query(`
    INSERT INTO public.asignaciones_zoom_modulos
      (id_modulo, id_cuenta_zoom)
    VALUES ($1, $2)
    ON CONFLICT (id_modulo)
    DO UPDATE SET
      id_cuenta_zoom = EXCLUDED.id_cuenta_zoom,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, id_modulo, id_cuenta_zoom, created_at, updated_at
  `, [idModulo, idCuentaZoom]);

  return {
    ...result.rows[0],
    cuenta: {
      id: cuenta.id,
      nombre: cuenta.nombre,
      correo: cuenta.correo
    }
  };
};

const eliminarAsignacion = async (idModulo) => {
  const result = await db.query(`
    DELETE FROM public.asignaciones_zoom_modulos
    WHERE id_modulo = $1
    RETURNING id_modulo
  `, [idModulo]);

  return result.rowCount > 0;
};

module.exports = {
  obtenerAsignaciones,
  previsualizarAsignacion,
  guardarAsignacion,
  eliminarAsignacion
};
