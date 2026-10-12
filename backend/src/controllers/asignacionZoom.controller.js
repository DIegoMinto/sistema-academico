
const asignacionZoomService = require('../services/asignacionZoom.service');

const obtenerId = (valor) => {
  const texto = String(valor ?? '');

  if (!/^[1-9]\d*$/.test(texto)) {
    return null;
  }

  return texto;
};

const manejarError = (res, error) => {
  console.error('Error en asignación Zoom:', error.message);

  return res.status(error.status || 500).json({
    message: error.status
      ? error.message
      : 'Ocurrió un error al procesar la asignación Zoom.',
    conflictos: error.conflictos || []
  });
};

const obtenerAsignaciones = async (req, res) => {
  try {
    const asignaciones =
      await asignacionZoomService.obtenerAsignaciones();

    res.json(asignaciones);
  } catch (error) {
    manejarError(res, error);
  }
};

const previsualizarAsignacion = async (req, res) => {
  try {
    const idModulo = obtenerId(req.body.idModulo);
    const idCuentaZoom = obtenerId(req.body.idCuentaZoom);

    if (!idModulo || !idCuentaZoom) {
      return res.status(400).json({
        message: 'Debes indicar un módulo y una cuenta Zoom válidos.'
      });
    }

    const resultado =
      await asignacionZoomService.previsualizarAsignacion(
        idModulo,
        idCuentaZoom
      );

    res.json({
      message: resultado.conflictos.length
        ? 'Se encontraron conflictos de horario.'
        : 'No se encontraron conflictos de horario.',
      cuenta: resultado.cuenta,
      conflictos: resultado.conflictos,
      disponible: resultado.conflictos.length === 0
    });
  } catch (error) {
    manejarError(res, error);
  }
};

const guardarAsignacion = async (req, res) => {
  try {
    const idModulo = obtenerId(req.params.idModulo);
    const idCuentaZoom = obtenerId(req.body.idCuentaZoom);

    if (!idModulo || !idCuentaZoom) {
      return res.status(400).json({
        message: 'Debes indicar un módulo y una cuenta Zoom válidos.'
      });
    }

    const asignacion =
      await asignacionZoomService.guardarAsignacion(
        idModulo,
        idCuentaZoom
      );

    res.json({
      message: 'Cuenta Zoom asignada correctamente.',
      asignacion
    });
  } catch (error) {
    manejarError(res, error);
  }
};

const eliminarAsignacion = async (req, res) => {
  try {
    const idModulo = obtenerId(req.params.idModulo);

    if (!idModulo) {
      return res.status(400).json({
        message: 'El módulo indicado no es válido.'
      });
    }

    const eliminada =
      await asignacionZoomService.eliminarAsignacion(idModulo);

    if (!eliminada) {
      return res.status(404).json({
        message: 'El módulo no tiene una asignación Zoom.'
      });
    }

    res.json({
      message: 'Asignación Zoom eliminada correctamente.'
    });
  } catch (error) {
    manejarError(res, error);
  }
};

module.exports = {
  obtenerAsignaciones,
  previsualizarAsignacion,
  guardarAsignacion,
  eliminarAsignacion
};
