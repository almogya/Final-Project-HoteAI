// server/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const reviewsRoute = require('./routes/reviewsRoute');
const responsesRoute = require('./routes/responsesRoute');
const analyzeResponseRoute = require('./routes/analyzeResponseRoute');
 //ניתוח ציוני איכות
const { analyzeUnscoredResponses } = require('./tasks/analyzeResponses');

analyzeUnscoredResponses();
setInterval(() => {
    console.log('🔄 Running scheduled response analysis...');
    analyzeUnscoredResponses().catch(err =>
        console.error('❌ Auto-analysis failed:', err)
    );
}, 10 * 60 * 1000);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reviews', reviewsRoute);
app.use('/api/responses', responsesRoute);
app.use('/api/analyze-response', analyzeResponseRoute);

// Health Check
app.get('/', (req, res) => {
    res.send('👋 Welcome to HoteAI server!');
});


// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
