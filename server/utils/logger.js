// server/utils/logger.js
const fs = require('fs');
const path = require('path');

function writeLog(filename, message) {
  const logPath = path.join(__dirname, '../logs', filename);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  fs.appendFile(logPath, line, err => {
    if (err) console.error('❌ Failed to write to log:', err.message);
  });
}

module.exports = {
  logSystem: (msg) => writeLog('system.log', msg),
  logGPT: (msg) => writeLog('chatgpt-errors.log', msg),
  logAnalysis: (msg) => writeLog('analyze-failures.log', msg),
};
