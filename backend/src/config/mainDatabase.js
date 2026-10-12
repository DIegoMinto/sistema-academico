const { Pool } = require('pg');

const mainPool = new Pool({
  connectionString: process.env.MAIN_DATABASE_URL
});

mainPool.on('connect', () => {
  console.log('Conectado a la BD principal');
});

mainPool.on('error', (error) => {
  console.error('Error en la BD principal:', error);
});

module.exports = mainPool;