
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const hostname = connectionString
  ? new URL(connectionString).hostname
  : '';

const isLocal = ['localhost', '127.0.0.1'].includes(hostname);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('PostgreSQL conectado');
});

pool.on('error', (error) => {
  console.error('Error inesperado en PostgreSQL:', error);
});

module.exports = pool;
