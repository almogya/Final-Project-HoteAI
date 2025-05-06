// server/tasks/analyzeResponses.js
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// פונקציה פשוטה לזיהוי אם טקסט הוא בעברית
function isHebrew(text) {
  return /[֐-׿]/.test(text);
}

async function analyzeUnscoredResponses() {
  try {
    const { rows } = await pool.query(`
      SELECT review_id, review_text, hotel_response FROM guest_reviews 
      WHERE hotel_response IS NOT NULL AND response_quality_score IS NULL
    `);

    for (const row of rows) {
      const { review_id, review_text, hotel_response } = row;

      const reviewLang = isHebrew(review_text) ? 'Hebrew' : 'English';

      const prompt = `
You are an AI tasked with scoring hotel responses. 
The guest wrote a review in ${reviewLang}:
"""
${review_text}
"""

The hotel responded:
"""
${hotel_response}
"""

Evaluate the hotel response and return a numeric score (0-100) based on:
1. Professional tone
2. Empathy to the guest
3. Addressing the concerns raised
4. Language appropriateness:
   - If the review is in Hebrew: full score is acceptable with a Hebrew response
   - If the review is in English: full score requires the hotel to respond in both English and Hebrew
5. Presence of a sign-off with the hotel name or representative.

Return ONLY the score (numeric value).
      `;

      try {
        const completion = await openai.createChatCompletion({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        });

        const content = completion.data.choices[0].message.content;
        const score = parseFloat(content.match(/\d+(\.\d+)?/)[0]);

        await pool.query(
          `UPDATE guest_reviews SET response_quality_score = $1 WHERE review_id = $2`,
          [score, review_id]
        );

        console.log(`✔️ Updated review ${review_id} with score ${score}`);
      } catch (err) {
        const logPath = path.join(__dirname, '../logs/analyze-failures.log');
        const { logAnalysis } = require('../utils/logger');
        logAnalysis(`❌ Failed to score review_id=${review_id} → ${err.message}`);
        console.error(`🔥 Failed to update review ${review_id}`, err.message);
      }
    }

    console.log('✅ Done analyzing all unscored responses.');
  } catch (err) {
    console.error('🔥 General failure:', err);
  }
  const { logSystem } = require('../utils/logger');
  logSystem('✅ Finished running analyzeResponses loop');
}

module.exports = { analyzeUnscoredResponses };
