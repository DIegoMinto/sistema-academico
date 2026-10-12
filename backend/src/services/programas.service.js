const mainPool = require('../config/mainDatabase');

const obtenerProgramas = async () => {
  const result = await mainPool.query(`
    SELECT
      id_curso,
      codigo_curso,
      nombre,
      estado,
      tipo
    FROM curso
    ORDER BY nombre ASC
  `);

  console.log('📚 Cursos encontrados:', result.rows.length);

  return result.rows;
};

module.exports = {
  obtenerProgramas
};