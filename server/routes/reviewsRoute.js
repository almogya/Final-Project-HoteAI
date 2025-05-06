const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // connection to PostgreSQL

// GET /api/reviews?hotel_id=1&chain_id=2&from=2024-01-01&to=2024-12-31
router.get('/', async (req, res) => {
    try {
        const { hotel_id, chain_id, from, to } = req.query;
        const conditions = [];
        const values = [];

        // Dynamic WHERE clause building
        if (hotel_id) {
            values.push(hotel_id);
            conditions.push(`gr.hotel_id = $${values.length}`);
        }

        if (chain_id) {
            values.push(chain_id);
            conditions.push(`h.chain_id = $${values.length}`);
        }

        if (from) {
            values.push(from);
            conditions.push(`gr.created_at >= $${values.length}`);
        }

        if (to) {
            values.push(to);
            conditions.push(`gr.created_at <= $${values.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
      SELECT 
        gr.review_id,
        gr.review_text,
        gr.rating,
        gr.hotel_response,
        gr.response_quality_score,
        gr.created_at,
        h.name AS hotel_name,
        hc.chain_name AS hotel_chain
      FROM Guest_Reviews gr
      JOIN Hotels h ON gr.hotel_id = h.hotel_id
      JOIN Hotel_Chains hc ON h.chain_id = hc.chain_id
      ${whereClause}
      ORDER BY gr.created_at DESC
    `;

        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    
});

router.get('/response-quality-over-time', async (req, res) => {
    const { hotel_id, chain_id, start_date, end_date } = req.query;

    const values = [];
    const conditions = ['response_quality_score IS NOT NULL'];

    if (hotel_id) {
        values.push(hotel_id);
        conditions.push(`hotel_id = $${values.length}`);
    }

    if (chain_id) {
        values.push(chain_id);
        conditions.push(`hotel_id IN (SELECT hotel_id FROM hotels WHERE chain_id = $${values.length})`);
    }

    if (start_date) {
        values.push(start_date);
        conditions.push(`created_at >= $${values.length}`);
    }

    if (end_date) {
        values.push(end_date);
        conditions.push(`created_at <= $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const result = await pool.query(`
      SELECT
        DATE(created_at) AS review_date,
        AVG(response_quality_score) AS avg_quality
      FROM guest_reviews
      ${where}
      GROUP BY review_date
      ORDER BY review_date;
    `, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
