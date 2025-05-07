// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Bust cache for responsesRoute
delete require.cache[require.resolve('./routes/responsesRoute')];

const reviewsRoute = require('./routes/reviewsRoute');
const responsesRoute = require('./routes/responsesRoute');
const analyzeResponseRoute = require('./routes/analyzeResponseRoute');
const { analyzeUnscoredResponses } = require('./tasks/analyzeResponses');
const { scrapeBookingWithPuppeteer } = require("./services/puppeteerService");
const { insertReview } = require("./db/insertReview");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());


(async () => {
    try {
        // קרא את page.html => קבל מערך ביקורות
        const reviews = await scrapeBookingWithPuppeteer();
        console.log("🧾 scraped", reviews.length, "reviews");
        // שמור אותן במסד
        for (const r of reviews) await insertReview(r);
    } catch (e) {
        console.error("❌ scrape init failed:", e);
    }
})();



try {
    // Routes
    app.use('/api/reviews', reviewsRoute);
    app.use('/api/responses', responsesRoute);
    app.use('/api/analyze-response', analyzeResponseRoute);
    console.log('✅ Routes mounted successfully');
} catch (err) {
    console.error('❌ Error mounting routes:', err);
    process.exit(1);
}

// Health Check
app.get('/', (req, res) => {
    res.send('👋 Welcome to HoteAI server!');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // Initialize and schedule response analysis
    analyzeUnscoredResponses().catch(err =>
        console.error('❌ Initial analysis failed:', err)
    );
    setInterval(() => {
        console.log('🔄 Running scheduled response analysis...');
        analyzeUnscoredResponses().catch(err =>
            console.error('❌ Auto-analysis failed:', err)
        );
    }, 10 * 60 * 1000); // Run every 10 minutes
});