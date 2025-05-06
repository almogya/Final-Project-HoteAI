const cron = require('node-cron');
const { analyzeUnscoredResponses } = require('./analyzeResponses');

// תריץ כל 10 דקות
cron.schedule('*/10 * * * *', async () => {
  console.log('⏰ Running scheduled response analysis...');
  await analyzeUnscoredResponses();
});