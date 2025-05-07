const express = require('express')
const router = express.Router()
const pool = require('../config/db')

router.get('/', async (req, res) => {
    try {
        const { hotel_id, chain_id, from, to } = req.query
        const conditions = []
        const values = []

        if (hotel_id) { values.push(hotel_id); conditions.push(`gr.hotel_id  = $${values.length}`) }
        if (chain_id) { values.push(chain_id); conditions.push(`h.chain_id   = $${values.length}`) }
        if (from) { values.push(from); conditions.push(`gr.created_at >= $${values.length}`) }
        if (to) { values.push(to); conditions.push(`gr.created_at <= $${values.length}`) }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

        const query = `
      SELECT
        gr.review_id,
        gr.hotel_id,
        gr.source_id,
        gr.rating,
        gr.hotel_response_content AS hotel_response,
        gr.created_at,
        CONCAT_WS(' ', gr.review_headline, gr.review_positive, gr.review_negative) AS review_text,
        gr.reviewer_name,
        gr.reviewer_country,
        gr.review_lang,
        h.name        AS hotel_name,
        hc.chain_name AS hotel_chain,
        i.calculate_score
      FROM guest_reviews gr
      JOIN hotels        h  ON gr.hotel_id  = h.hotel_id
      JOIN hotel_chains  hc ON h.chain_id   = hc.chain_id
      LEFT JOIN insights i  ON gr.review_id = i.review_id
      ${whereClause}
      ORDER BY gr.created_at DESC
    `

        const { rows } = await pool.query(query, values)
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

router.get('/response-quality-over-time', async (req, res) => {
    try {
        const { hotel_id, chain_id, start_date, end_date } = req.query
        const values = []
        const conditions = []

        if (hotel_id) { values.push(hotel_id); conditions.push(`gr.hotel_id = $${values.length}`) }
        if (chain_id) { values.push(chain_id); conditions.push(`h.chain_id  = $${values.length}`) }
        if (start_date) { values.push(start_date); conditions.push(`gr.created_at >= $${values.length}`) }
        if (end_date) { values.push(end_date); conditions.push(`gr.created_at <= $${values.length}`) }

        const whereClause = conditions.length ? `AND ${conditions.join(' AND ')}` : ''

        const sql = `
      SELECT
        DATE(gr.created_at)                  AS review_date,
        AVG(i.calculate_score)::numeric(10,2) AS avg_quality
      FROM guest_reviews gr
      JOIN hotels        h  ON gr.hotel_id  = h.hotel_id
      JOIN insights      i  ON gr.review_id = i.review_id
      WHERE i.calculate_score IS NOT NULL
      ${whereClause}
      GROUP BY review_date
      ORDER BY review_date
    `

        const { rows } = await pool.query(sql, values)
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

module.exports = router
