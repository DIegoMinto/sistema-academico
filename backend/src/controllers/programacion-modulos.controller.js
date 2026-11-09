
const programacionService = require(
  '../services/programacion-modulos.service'
);

const crearMultiplesModulos = async (req, res) => {
  try {
    const { idCurso } = req.params;
    const { modulos } = req.body;

    if (!/^\d+$/.test(idCurso) || BigInt(idCurso) <= 0n) {
      return res.status(400).json({
        message: 'El ID del curso no es válido.'
      });
    }

    if (!Array.isArray(modulos) || modulos.length === 0) {
      return res.status(400).json({
        message: 'Debes enviar al menos un módulo.'
      });
    }

    const resultado = await programacionService.crearMultiplesModulos(
      idCurso,
      modulos
    );

    return res.status(201).json({
      success: true,
      message: 'Módulos y sesiones creados correctamente.',
      modulos: resultado
    });
  } catch (error) {
    console.error('Error al crear módulos y sesiones:', error);

    if (error.code === '23503') {
      return res.status(404).json({
        message: 'El curso indicado no existe.'
      });
    }

    if (error.code) {
      return res.status(500).json({
        message: 'Error de base de datos al guardar la programación.'
      });
    }

    return res.status(400).json({
      message: error.message || 'No se pudo guardar la programación.'
    });
  }
};


const reprogramarSesion = async (req, res) => {
  try {
    const { idSesion } = req.params;
    const { fecha } = req.body;

    if (!/^\d+$/.test(idSesion) || BigInt(idSesion) <= 0n) {
      return res.status(400).json({
        message: 'El ID de la sesión no es válido.'
      });
    }

    if (typeof fecha !== 'string') {
      return res.status(400).json({
        message: 'Debes indicar la nueva fecha.'
      });
    }

    const sesion = await programacionService.reprogramarSesion(
      idSesion,
      fecha
    );

    return res.status(200).json({
      success: true,
      message: 'Sesión reprogramada correctamente.',
      sesion
    });
  } catch (error) {
    console.error('Error al reprogramar sesión:', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: 'No se pudo reprogramar la sesión.'
    });
  }
};


// Validar el identificador del módulo
const validarIdModulo = (idModulo) => {
  return /^\d+$/.test(idModulo || '') && BigInt(idModulo) > 0n;
};


// Previsualizar la reprogramación completa
const previsualizarReprogramacionModulo = async (req, res) => {
  try {
    const { idModulo } = req.params;
    const { fecha_inicio } = req.body;

    if (!validarIdModulo(idModulo)) {
      return res.status(400).json({
        message: 'El ID del módulo no es válido.'
      });
    }

    if (typeof fecha_inicio !== 'string') {
      return res.status(400).json({
        message: 'Debes indicar la nueva fecha de inicio.'
      });
    }

    const plan = await programacionService.previsualizarReprogramacionModulo(
      idModulo,
      fecha_inicio
    );

    return res.status(200).json({
      success: true,
      message: 'Previsualización generada correctamente.',
      plan
    });

  } catch (error) {
    console.error('Error al previsualizar reprogramación:', error);

    return res.status(error.status || 500).json({
      message: error.message || 'No se pudo generar la previsualización.',
      conflictos: error.conflictos || []
    });
  }
};


// Confirmar la reprogramación completa
const reprogramarModulo = async (req, res) => {
  try {
    const { idModulo } = req.params;
    const { fecha_inicio } = req.body;

    if (!validarIdModulo(idModulo)) {
      return res.status(400).json({
        message: 'El ID del módulo no es válido.'
      });
    }

    if (typeof fecha_inicio !== 'string') {
      return res.status(400).json({
        message: 'Debes indicar la nueva fecha de inicio.'
      });
    }

    const resultado = await programacionService.reprogramarModulo(
      idModulo,
      fecha_inicio
    );

    return res.status(200).json({
      success: true,
      message: 'Módulo y todas sus sesiones reprogramados correctamente.',
      ...resultado
    });

  } catch (error) {
    console.error('Error al reprogramar módulo:', error);

    return res.status(error.status || 500).json({
      message: error.message || 'No se pudo reprogramar el módulo.',
      conflictos: error.conflictos || []
    });
  }
};


// Cambiar monitora de un módulo
const cambiarMonitoraModulo = async (req, res) => {
  try {
    const { idModulo } = req.params;
    const { id_persona_asesora } = req.body;

    if (!validarIdModulo(idModulo)) {
      return res.status(400).json({
        message: 'El ID del módulo no es válido.'
      });
    }

    if (
      id_persona_asesora === undefined ||
      !/^\d+$/.test(String(id_persona_asesora)) ||
      BigInt(id_persona_asesora) <= 0n
    ) {
      return res.status(400).json({
        message: 'Debes seleccionar una monitora válida.'
      });
    }

    const modulo = await programacionService.cambiarMonitoraModulo(
      idModulo,
      String(id_persona_asesora)
    );

    return res.status(200).json({
      success: true,
      message: 'Monitora cambiada correctamente.',
      modulo
    });

  } catch (error) {
    console.error('Error al cambiar monitora del módulo:', error);

    return res.status(error.status || 500).json({
      message: error.message || 'No se pudo cambiar la monitora.',
      conflictos: error.conflictos || []
    });
  }
};

module.exports = {
  crearMultiplesModulos,
  reprogramarSesion,
  previsualizarReprogramacionModulo,
  reprogramarModulo,
  cambiarMonitoraModulo
};
