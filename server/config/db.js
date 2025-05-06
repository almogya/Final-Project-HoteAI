require('dotenv').config();
const { Pool } = require('pg');

console.log("✅ typeof DB_PASS:", typeof process.env.DB_PASS);
console.log("✅ DB_PASS =", process.env.DB_PASS);


const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 5432
});

module.exports = pool;
