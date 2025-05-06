// checkEnv.js
require('dotenv').config();
console.log("🔐 DB_PASS is:", process.env.DB_PASS);
console.log("🧪 TYPE:", typeof process.env.DB_PASS);
