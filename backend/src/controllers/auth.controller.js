const authService = require('../services/auth.service');

const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Usuario y contraseña son obligatorios'
      });
    }

    const usuarioAutenticado =
      await authService.verificarCredenciales(usuario, password);

    if (!usuarioAutenticado) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    req.session.usuario = {
      id: usuarioAutenticado.id,
      usuario: usuarioAutenticado.usuario,
      rol: usuarioAutenticado.rol
    };

    res.json({
      status: 'ok',
      message: 'Inicio de sesión exitoso',
      usuario: req.session.usuario
    });

  } catch (error) {
    console.error('❌ Error en login:', error);

    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor'
    });
  }
};


const logout = (req, res) => {
  req.session.destroy((error) => {

    if (error) {
      console.error('❌ Error cerrando sesión:', error);

      return res.status(500).json({
        status: 'error',
        message: 'No se pudo cerrar la sesión'
      });
    }

    res.clearCookie('connect.sid');

    res.json({
      status: 'ok',
      message: 'Sesión cerrada'
    });
  });
};


const checkSession = (req, res) => {

  if (!req.session.usuario) {
    return res.status(401).json({
      status: 'error',
      message: 'No hay una sesión activa'
    });
  }

  res.json({
    status: 'ok',
    usuario: req.session.usuario
  });
};


module.exports = {
  login,
  logout,
  checkSession
};