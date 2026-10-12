const cuentasZoomService = require('../services/cuentasZoom.service');


// =========================================================
// OBTENER TODAS
// =========================================================

const obtenerCuentas = async (req, res) => {
  try {
    const cuentas =
      await cuentasZoomService.obtenerCuentas();

    res.json(cuentas);

  } catch (error) {
    console.error(
      '❌ Error obteniendo cuentas Zoom:',
      error
    );

    res.status(500).json({
      status: 'error',
      message: 'No se pudieron obtener las cuentas Zoom'
    });
  }
};


// =========================================================
// OBTENER UNA
// =========================================================

const obtenerCuenta = async (req, res) => {
  try {
    const { id } = req.params;

    const cuenta =
      await cuentasZoomService.obtenerCuentaPorId(id);

    if (!cuenta) {
      return res.status(404).json({
        status: 'error',
        message: 'Cuenta Zoom no encontrada'
      });
    }

    // Nunca enviamos la contraseña cifrada
    delete cuenta.password_encriptada;

    res.json(cuenta);

  } catch (error) {
    console.error(
      '❌ Error obteniendo cuenta Zoom:',
      error
    );

    res.status(500).json({
      status: 'error',
      message: 'No se pudo obtener la cuenta Zoom'
    });
  }
};


// =========================================================
// CREAR
// =========================================================

const crearCuenta = async (req, res) => {
  try {
    const {
      nombre,
      correo,
      password
    } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({
        status: 'error',
        message:
          'Nombre, correo y contraseña son obligatorios'
      });
    }

    const cuenta =
      await cuentasZoomService.crearCuenta(
        nombre,
        correo,
        password
      );

    res.status(201).json({
      status: 'ok',
      message: 'Cuenta Zoom creada correctamente',
      cuenta
    });

  } catch (error) {
    console.error(
      '❌ Error creando cuenta Zoom:',
      error
    );

    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'El correo ya está registrado'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'No se pudo crear la cuenta Zoom'
    });
  }
};


// =========================================================
// ACTUALIZAR
// =========================================================

const actualizarCuenta = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      correo,
      password
    } = req.body;

    if (!nombre || !correo) {
      return res.status(400).json({
        status: 'error',
        message:
          'Nombre y correo son obligatorios'
      });
    }

    const cuenta =
      await cuentasZoomService.actualizarCuenta(
        id,
        nombre,
        correo,
        password
      );

    if (!cuenta) {
      return res.status(404).json({
        status: 'error',
        message: 'Cuenta Zoom no encontrada'
      });
    }

    res.json({
      status: 'ok',
      message: 'Cuenta Zoom actualizada correctamente',
      cuenta
    });

  } catch (error) {
    console.error(
      '❌ Error actualizando cuenta Zoom:',
      error
    );

    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'El correo ya está registrado'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'No se pudo actualizar la cuenta Zoom'
    });
  }
};


// =========================================================
// ACTIVAR / DESACTIVAR
// =========================================================

const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activa } = req.body;

    if (typeof activa !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'activa debe ser true o false'
      });
    }

    const cuenta =
      await cuentasZoomService.actualizarEstado(
        id,
        activa
      );

    if (!cuenta) {
      return res.status(404).json({
        status: 'error',
        message: 'Cuenta Zoom no encontrada'
      });
    }

    res.json({
      status: 'ok',
      message: activa
        ? 'Cuenta Zoom activada'
        : 'Cuenta Zoom desactivada',
      cuenta
    });

  } catch (error) {
    console.error(
      '❌ Error actualizando estado:',
      error
    );

    res.status(500).json({
      status: 'error',
      message: 'No se pudo actualizar el estado'
    });
  }
};


// =========================================================
// ELIMINAR
// =========================================================

const eliminarCuenta = async (req, res) => {
  try {
    const { id } = req.params;

    const cuenta =
      await cuentasZoomService.eliminarCuenta(id);

    if (!cuenta) {
      return res.status(404).json({
        status: 'error',
        message: 'Cuenta Zoom no encontrada'
      });
    }

    res.json({
      status: 'ok',
      message: 'Cuenta Zoom eliminada correctamente'
    });

  } catch (error) {
    console.error(
      '❌ Error eliminando cuenta Zoom:',
      error
    );

    res.status(500).json({
      status: 'error',
      message: 'No se pudo eliminar la cuenta Zoom'
    });
  }
};


module.exports = {
  obtenerCuentas,
  obtenerCuenta,
  crearCuenta,
  actualizarCuenta,
  actualizarEstado,
  eliminarCuenta
};