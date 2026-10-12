
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

module.exports = {
  crearMultiplesModulos
};