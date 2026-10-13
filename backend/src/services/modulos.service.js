
const mainPool = require('../config/mainDatabase');

// Listar los módulos de un curso

const obtenerModulos = async (idCurso) => {
  const result = await mainPool.query(
    `SELECT
       pm.id_modulo,
       pm.id_curso,
       pm.nombre,
       pm.descripcion,
       pm.orden,
       pm.estado,
       pm.id_persona_asesora,
       CASE
         WHEN p.id_persona IS NOT NULL THEN
           CONCAT_WS(
             ' ',
             NULLIF(TRIM(p.nombre), ''),
             NULLIF(TRIM(p.apellido_p), ''),
             NULLIF(TRIM(p.apellido_m), '')
           )
         ELSE NULL
       END AS nombre_monitora,
       pm.fecha_inicio::text AS fecha_inicio,
       pm.dias_clase,
       pm.cantidad_sesiones,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'titulo', ps.titulo,
               'fecha', ps.fecha::text,
               'hora_inicio', ps.hora_inicio::text,
               'hora_fin', ps.hora_fin::text
             )
             ORDER BY ps.fecha, ps.hora_inicio
           )
           FROM public.programa_sesiones ps
           WHERE ps.id_modulo = pm.id_modulo
             AND ps.estado <> 'cancelada'
         ),
         '[]'::json
       ) AS sesiones
     FROM public.programa_modulos pm
     LEFT JOIN public.persona p
       ON p.id_persona = pm.id_persona_asesora
     WHERE pm.id_curso = $1
     ORDER BY pm.orden ASC, pm.id_modulo ASC`,
    [idCurso]
  );

  return result.rows;
};


// Crear un módulo
const crearModulo = async ({
  idCurso,
  nombre,
  descripcion,
  orden
}) => {
  const result = await mainPool.query(
    `INSERT INTO public.programa_modulos
       (id_curso, nombre, descripcion, orden)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [idCurso, nombre, descripcion || null, orden ?? 1]
  );

  return result.rows[0];
};

// Editar un módulo
const actualizarModulo = async (
  idModulo,
  { nombre, descripcion, orden, estado }
) => {
  const result = await mainPool.query(
    `UPDATE public.programa_modulos
     SET nombre = $1,
         descripcion = $2,
         orden = $3,
         estado = $4,
         actualizado_en = NOW()
     WHERE id_modulo = $5
     RETURNING *`,
    [nombre, descripcion || null, orden, estado, idModulo]
  );

  return result.rows[0] || null;
};

// Eliminar un módulo
const eliminarModulo = async (idModulo) => {
  const result = await mainPool.query(
    `DELETE FROM public.programa_modulos
     WHERE id_modulo = $1
     RETURNING id_modulo`,
    [idModulo]
  );

  return result.rowCount > 0;
};

module.exports = {
  obtenerModulos,
  crearModulo,
  actualizarModulo,
  eliminarModulo
};