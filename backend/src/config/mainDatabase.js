
const { Pool } = require('pg');

const connectionString = process.env.MAIN_DATABASE_URL;
const hostname = connectionString
  ? new URL(connectionString).hostname
  : '';

const isLocal = ['localhost', '127.0.0.1'].includes(hostname);

const mainPool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

mainPool.on('connect', () => {
  console.log('Conexión a la base principal establecida');
});

mainPool.on('error', (error) => {
  console.error('Error inesperado en la base principal:', error);
});

module.exports = mainPool;
