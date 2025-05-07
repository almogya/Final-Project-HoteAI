require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const path = require('path');
const pool = require('../config/db');

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

async function analyzeUnscoredResponses() {
  try {
    const { rows } = await pool.query(`
      SELECT review_id,
             review_headline,
             review_positive,
             review_negative,
             hotel_response_content,
             review_lang
      FROM guest_reviews gr
      WHERE gr.hotel_response_content IS NOT NULL
        AND review_id NOT IN (SELECT review_id FROM insights)
    `);

    if (!rows.length) {
      console.log('⚠️ No reviews with responses found for analysis.');
      return;
    }

    for (const row of rows) {
      const {
        review_id,
        review_headline,
        review_positive,
        review_negative,
        hotel_response_content,
        review_lang
      } = row;

      const review_content = [review_headline, review_positive, review_negative]
        .filter(Boolean)
        .join('\n');

      const prompt = `
You are an AI tasked with evaluating hotel responses. The guest wrote a review in ${review_lang === 'he' ? 'Hebrew' : 'English'
        }:
"""
${review_content}
"""

The hotel responded:
"""
${hotel_response_content}
"""

Evaluate the hotel response and return ONLY a JSON object:
{
  "is_response": true/false,
  "is_right_lang": true/false,
  "is_answered_positive": true/false,
  "is_answered_negative": true/false,
  "is_include_guest_name": true/false,
  "is_include_hotelier_name": true/false,
  "is_kind": true/false,
  "is_concise": true/false,
  "is_gratitude": true/false,
  "is_include_come_back_asking": true/false,
  "is_syntax_right": true/false,
  "is_personal_tone_not_generic": true/false
}`;

      try {
        const completion = await openai.createChatCompletion({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }]
        });

        let content = completion.data.choices[0].message.content
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        let scores;
        let calculateScore = null;

        try {
          scores = JSON.parse(content);
          const positives = Object.values(scores).filter(Boolean).length;
          calculateScore = (positives / Object.keys(scores).length) * 100;
        } catch (e) {
          console.error(`JSON parse error for review ${review_id}:`, e.message);
          console.error('Received:', content);
          continue;
        }

        await pool.query(
          `
        INSERT INTO insights (
          review_id,
          is_response,
          is_right_lang,
          is_answered_positive,
          is_answered_negative,
          is_include_guest_name,
          is_include_hotelier_name,
          is_kind,
          is_concise,
          is_gratitude,
          is_include_come_back_asking,
          is_syntax_right,
          is_personal_tone_not_generic,
          calculate_score
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (review_id) DO UPDATE SET
          is_response                 = EXCLUDED.is_response,
          is_right_lang               = EXCLUDED.is_right_lang,
          is_answered_positive        = EXCLUDED.is_answered_positive,
          is_answered_negative        = EXCLUDED.is_answered_negative,
          is_include_guest_name       = EXCLUDED.is_include_guest_name,
          is_include_hotelier_name    = EXCLUDED.is_include_hotelier_name,
          is_kind                     = EXCLUDED.is_kind,
          is_concise                  = EXCLUDED.is_concise,
          is_gratitude                = EXCLUDED.is_gratitude,
          is_include_come_back_asking = EXCLUDED.is_include_come_back_asking,
          is_syntax_right             = EXCLUDED.is_syntax_right,
          is_personal_tone_not_generic= EXCLUDED.is_personal_tone_not_generic,
          calculate_score             = EXCLUDED.calculate_score
        `,
          [
            review_id,
            scores.is_response,
            scores.is_right_lang,
            scores.is_answered_positive,
            scores.is_answered_negative,
            scores.is_include_guest_name,
            scores.is_include_hotelier_name,
            scores.is_kind,
            scores.is_concise,
            scores.is_gratitude,
            scores.is_include_come_back_asking,
            scores.is_syntax_right,
            scores.is_personal_tone_not_generic,
            calculateScore
          ]
        );

        console.log(
          `✔️ review ${review_id} scored ${calculateScore.toFixed(2)}%`
        );
      } catch (err) {
        console.error(`🔥 review ${review_id} failed:`, err.message);
        const { logAnalysis } = require('../utils/logger');
        logAnalysis(`review ${review_id} → ${err.message}`);
      }
    }

    console.log('✅ Analysis loop completed.');
  } catch (err) {
    console.error('🔥 analyzeUnscoredResponses failed:', err.message);
  }

  const { logSystem } = require('../utils/logger');
  logSystem('analyzeResponses loop finished');
}
if (require.main === module) {
  // מריצים מיד אם הקובץ הופעל ישירות:  node tasks/analyzeResponses.js
  analyzeUnscoredResponses()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { analyzeUnscoredResponses };
