const requireAuth = (req, res, next) => {

  console.log('🔐 REQUIRE AUTH - SESIÓN:', req.session);

  if (!req.session || !req.session.usuario) {
    return res.status(401).json({
      status: 'error',
      message: 'No autorizado'
    });
  }

  next();
};

module.exports = requireAuth;