const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/insights', async (req, res) => {
  try {
    const { rows } = await pool.query(`
    SELECT gr.review_id, gr.review_headline, gr.review_positive, gr.review_negative, gr.hotel_response_content, gr.review_lang
    FROM guest_reviews gr
    LEFT JOIN insights i ON gr.review_id = i.review_id
    WHERE gr.hotel_response_content IS NOT NULL
      AND i.review_id IS NULL
  `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching insights:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;