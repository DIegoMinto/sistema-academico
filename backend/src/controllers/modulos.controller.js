
const modulosService = require('../services/modulos.service');

const obtenerModulos = async (req, res) => {
  try {
    const { idCurso } = req.params;

    if (!/^\d+$/.test(idCurso) || BigInt(idCurso) <= 0n) {
      return res.status(400).json({
        message: 'El ID del curso no es válido'
      });
    }

    const modulos = await modulosService.obtenerModulos(idCurso);
    res.json(modulos);
  } catch (error) {
    console.error('Error al obtener módulos:', error);
    res.status(500).json({
      message: 'No se pudieron obtener los módulos'
    });
  }
};

const crearModulo = async (req, res) => {
  try {
    const { idCurso } = req.params;
    const { nombre, descripcion, orden } = req.body;

    if (!/^\d+$/.test(idCurso) || BigInt(idCurso) <= 0n) {
      return res.status(400).json({
        message: 'El ID del curso no es válido'
      });
    }

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        message: 'El nombre del módulo es obligatorio'
      });
    }

    if (nombre.trim().length > 150) {
      return res.status(400).json({
        message: 'El nombre no puede superar los 150 caracteres'
      });
    }

    const ordenNumero = orden === undefined ? 1 : Number(orden);

    if (!Number.isSafeInteger(ordenNumero) || ordenNumero < 1) {
      return res.status(400).json({
        message: 'El orden debe ser un entero positivo'
      });
    }

    const modulo = await modulosService.crearModulo({
      idCurso,
      nombre: nombre.trim(),
      descripcion,
      orden: ordenNumero
    });

    res.status(201).json(modulo);
  } catch (error) {
    console.error('Error al crear módulo:', error);

    if (error.code === '23503') {
      return res.status(404).json({
        message: 'El curso indicado no existe'
      });
    }

    res.status(500).json({
      message: 'No se pudo crear el módulo'
    });
  }
};

const actualizarModulo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, orden, estado } = req.body;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        message: 'El ID del módulo no es válido'
      });
    }

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        message: 'El nombre del módulo es obligatorio'
      });
    }

    const ordenNumero = Number(orden);

    if (!Number.isSafeInteger(ordenNumero) || ordenNumero < 1) {
      return res.status(400).json({
        message: 'El orden debe ser un entero positivo'
      });
    }

    if (!['activo', 'inactivo', 'finalizado'].includes(estado)) {
      return res.status(400).json({
        message: 'El estado no es válido'
      });
    }

    const modulo = await modulosService.actualizarModulo(id, {
      nombre: nombre.trim(),
      descripcion,
      orden: ordenNumero,
      estado
    });

    if (!modulo) {
      return res.status(404).json({
        message: 'No se encontró el módulo'
      });
    }

    res.json(modulo);
  } catch (error) {
    console.error('Error al actualizar módulo:', error);
    res.status(500).json({
      message: 'No se pudo actualizar el módulo'
    });
  }
};

const eliminarModulo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        message: 'El ID del módulo no es válido'
      });
    }

    const eliminado = await modulosService.eliminarModulo(id);

    if (!eliminado) {
      return res.status(404).json({
        message: 'No se encontró el módulo'
      });
    }

    res.json({ message: 'Módulo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar módulo:', error);
    res.status(500).json({
      message: 'No se pudo eliminar el módulo'
    });
  }
};

module.exports = {
  obtenerModulos,
  crearModulo,
  actualizarModulo,
  eliminarModulo
};