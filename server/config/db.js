// server/config/db.js
require('dotenv').config({ path: __dirname + '/../.env' }); // Load from project root
const { Pool } = require('pg');

console.log("✅ typeof DB_PASSWORD:", typeof process.env.DB_PASSWORD);
console.log("✅ DB_PASSWORD =", process.env.DB_PASSWORD);

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 5432
});

module.exports = pool;