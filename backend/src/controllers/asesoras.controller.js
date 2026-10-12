
const asesorasService = require('../services/asesoras.service');

const obtenerAsesorasMonitoras = async (req, res) => {
  try {
    const asesoras =
      await asesorasService.obtenerAsesorasMonitoras();

    res.json(asesoras);
  } catch (error) {
    console.error('Error al obtener asesoras monitoras:', error);

    res.status(500).json({
      message: 'No se pudieron obtener las asesoras habilitadas'
    });
  }
};

module.exports = {
  obtenerAsesorasMonitoras
};