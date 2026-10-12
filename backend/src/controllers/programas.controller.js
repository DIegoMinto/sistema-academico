const programasService = require('../services/programas.service');

const obtenerProgramas = async (req, res) => {
  try {
    const programas = await programasService.obtenerProgramas();

    res.json(programas);
  } catch (error) {
    console.error('❌ Error consultando programas:', error);

    res.status(500).json({
      status: 'error',
      message: 'No se pudieron consultar los programas'
    });
  }
};

module.exports = {
  obtenerProgramas
};