// server/routes/responsesRoute.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { Configuration, OpenAIApi } = require('openai');

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

router.post('/', async (req, res) => {
    const { reviewId, customMessage } = req.body;

    try {
        const { rows } = await pool.query(
            'SELECT * FROM reviews WHERE id = $1',
            [reviewId]
        );
        const review = rows[0];
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const prompt = `
    A guest left this review: "${review.review_text}".
    Write a polite, professional hotel manager response.
    Start with: "${customMessage}".
    `;

        const completion = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        const aiReply = completion.data.choices[0].message.content.trim();

        // Save to DB
        await pool.query(
            'UPDATE reviews SET response_text = $1 WHERE id = $2',
            [aiReply, reviewId]
        );

        res.json({ response_text: aiReply });
    } catch (error) {
        console.error('AI response error:', error);
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

module.exports = router;
