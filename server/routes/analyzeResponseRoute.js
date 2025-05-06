// server/routes/analyzeResponseRoute.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { Configuration, OpenAIApi } = require('openai');

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// POST /api/analyze-response
router.post('/', async (req, res) => {
  const { review_id } = req.body;
  if (!review_id) return res.status(400).json({ error: 'Missing review_id' });

  try {
    // שליפת תגובת המלון מהביקורת
    const { rows } = await pool.query(
      'SELECT hotel_response FROM guest_reviews WHERE review_id = $1',
      [review_id]
    );

    const response = rows[0]?.hotel_response;
    if (!response) return res.status(404).json({ error: 'Hotel response not found' });

    // יצירת פרומפט להערכת איכות
    const prompt = `Evaluate the quality of this hotel response based on:
1. Professional tone
2. Addressing guest concerns
3. Use of Hebrew + English (if applicable)
4. Closure or hotel signature

Give a numeric score from 0 to 100 only. Hotel Response: "${response}"`;

    console.log("🔍 GPT Prompt:\n", prompt);

    const gpt = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const raw = gpt.data.choices[0].message.content.trim();
    console.log("🧠 GPT Response:", raw);

    const match = raw.match(/\d{1,3}/);
    const score = match ? parseFloat(match[0]) : null;

    if (score === null) return res.status(500).json({ error: 'Failed to extract score from GPT response' });

    await pool.query(
      'UPDATE guest_reviews SET response_quality_score = $1 WHERE review_id = $2',
      [score, review_id]
    );

    res.json({ review_id, score });
  } catch (error) {
    console.error('Error analyzing response quality:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
