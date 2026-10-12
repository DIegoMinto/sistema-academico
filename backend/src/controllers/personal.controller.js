const personalService = require('../services/personal.service');

const obtenerPersonal = async (req, res) => {
  try {
    const personal = await personalService.obtenerPersonal();

    res.json(personal);

  } catch (error) {
    console.error('❌ Error consultando personal:', error);

    res.status(500).json({
      status: 'error',
      message: 'No se pudo consultar el personal'
    });
  }
};

const actualizarMonitoreo = async (req, res) => {
  try {
    const { id_persona } = req.params;
    const { monitorea } = req.body;

    if (typeof monitorea !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'monitorea debe ser true o false'
      });
    }

    const personal =
      await personalService.actualizarMonitoreo(
        id_persona,
        monitorea
      );

    res.json({
      status: 'ok',
      personal
    });

  } catch (error) {
    console.error(
      '❌ Error actualizando monitoreo:',
      error
    );

    res.status(500).json({
      status: 'error',
      message: 'No se pudo actualizar el monitoreo'
    });
  }
};

module.exports = {
  obtenerPersonal,
  actualizarMonitoreo
};