
const cuentasZoomService = require('../services/cuentasZoom.service');

// =========================================================
// VALIDAR DATOS DE LA LICENCIA
// =========================================================

const validarDatosLicencia = ({
  fecha_pago,
  fecha_caducidad,
  importe_usd
}) => {
  const fechaValida = (valor) => {
    if (valor == null || valor === '') {
      return true;
    }

    if (typeof valor !== 'string') {
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return false;
    }

    const fecha = new Date(`${valor}T00:00:00Z`);

    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha.toISOString().slice(0, 10) === valor
    );
  };

  if (
    !fechaValida(fecha_pago) ||
    !fechaValida(fecha_caducidad)
  ) {
    return 'Las fechas deben ser válidas.';
  }

  if (
    importe_usd != null &&
    importe_usd !== '' &&
    (
      !/^\d+(\.\d{1,2})?$/.test(String(importe_usd)) ||
      !Number.isFinite(Number(importe_usd)) ||
      Number(importe_usd) < 0 ||
      Number(importe_usd) > 99999999.99
    )
  ) {
    return 'El importe en dólares debe ser un número no negativo con hasta dos decimales.';
  }

  return null;
};


// =========================================================
// OBTENER TODAS LAS CUENTAS
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
// OBTENER UNA CUENTA
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

    // Nunca enviamos la contraseña cifrada al frontend.
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
// CREAR CUENTA
// =========================================================

const crearCuenta = async (req, res) => {
  try {
    const {
      nombre,
      correo,
      password,
      fecha_pago,
      fecha_caducidad,
      importe_usd
    } = req.body;

    // Validar campos obligatorios.
    if (!nombre || !correo || !password) {
      return res.status(400).json({
        status: 'error',
        message:
          'Nombre, correo y contraseña son obligatorios'
      });
    }

    // Validar fechas e importe.
    const errorLicencia = validarDatosLicencia(req.body);

    if (errorLicencia) {
      return res.status(400).json({
        status: 'error',
        message: errorLicencia
      });
    }

    const cuenta =
      await cuentasZoomService.crearCuenta(
        nombre,
        correo,
        password,
        fecha_pago,
        fecha_caducidad,
        importe_usd
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
// ACTUALIZAR CUENTA
// =========================================================

const actualizarCuenta = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      correo,
      password,
      fecha_pago,
      fecha_caducidad,
      importe_usd
    } = req.body;

    // Validar campos obligatorios.
    if (!nombre || !correo) {
      return res.status(400).json({
        status: 'error',
        message: 'Nombre y correo son obligatorios'
      });
    }

    // Validar fechas e importe.
    const errorLicencia = validarDatosLicencia(req.body);

    if (errorLicencia) {
      return res.status(400).json({
        status: 'error',
        message: errorLicencia
      });
    }

    const cuenta =
      await cuentasZoomService.actualizarCuenta(
        id,
        nombre,
        correo,
        password,
        fecha_pago,
        fecha_caducidad,
        importe_usd
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
// ACTIVAR / DESACTIVAR CUENTA
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
// ELIMINAR CUENTA
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


// =========================================================
// EXPORTAR CONTROLADORES
// =========================================================

module.exports = {
  obtenerCuentas,
  obtenerCuenta,
  crearCuenta,
  actualizarCuenta,
  actualizarEstado,
  eliminarCuenta
};
