
const asignacionService = require('../services/asignacion-asesoras.service');

const previsualizarAsignacion = async (req, res) => {
  try {
    const { sesiones } = req.body;

    if (!Array.isArray(sesiones) || sesiones.length === 0) {
      return res.status(400).json({
        message: 'Debes enviar al menos una sesión para evaluar.'
      });
    }

    const asignacion =
      await asignacionService.asignarMonitora(sesiones);

    return res.json({
      success: true,
      ...asignacion
    });
  } catch (error) {
    console.error('Error al previsualizar la asignación:', error);

    return res.status(500).json({
      message: 'No se pudo evaluar la asignación.',
      error: error.message
    });
  }
};

module.exports = { previsualizarAsignacion };