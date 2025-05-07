//server/insertReview.js
const pool = require('../config/db');

async function getOrCreateHotelId(hotel_name, location = 'Unknown', chain_id = 1) {
  try {
    // Validate inputs
    if (!hotel_name || typeof hotel_name !== 'string') {
      throw new Error(`Invalid hotel_name: ${hotel_name}`);
    }
    if (typeof location !== 'string') {
      throw new Error(`Invalid location: ${location}`);
    }
    if (!Number.isInteger(chain_id)) {
      throw new Error(`Invalid chain_id: ${chain_id}`);
    }

    // Normalize hotel_name for consistency (e.g., trim, lowercase)
    const normalized_name = hotel_name.trim().toLowerCase();
    console.log(`🔍 Checking for hotel: ${hotel_name} (normalized: ${normalized_name})`);

    // Check if hotel exists
    const selectQuery = `
      SELECT hotel_id FROM hotels WHERE LOWER(name) = $1;
    `;
    const selectResult = await pool.query(selectQuery, [normalized_name]);

    if (selectResult.rows.length > 0) {
      console.log(`✅ Found hotel: ${hotel_name} with hotel_id: ${selectResult.rows[0].hotel_id}`);
      return selectResult.rows[0].hotel_id;
    }

    // Insert new hotel
    const insertQuery = `
      INSERT INTO hotels (name, location, chain_id)
      VALUES ($1, $2, $3)
      RETURNING hotel_id;
    `;
    console.log(`📝 Executing insert query with params: name=${hotel_name}, location=${location}, chain_id=${chain_id}`);
    const insertResult = await pool.query(insertQuery, [hotel_name, location, chain_id]);
    const newHotelId = insertResult.rows[0].hotel_id;
    console.log(`🏨 Created new hotel: ${hotel_name} (ID: ${newHotelId}, Location: ${location}, Chain ID: ${chain_id})`);
    return newHotelId;
  } catch (err) {
    console.error(`❌ Failed to get or create hotel_id for ${hotel_name}:`, err);
    throw err;
  }
}

async function insertReview(review) {
  const query = `
    INSERT INTO guest_reviews (
      created_at,
      reviewer_name,
      reviewer_country,
      rating,
      review_headline,
      review_positive,
      review_negative,
      hotel_response_content,
      hotel_id,
      source_id,
      review_lang
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (reviewer_name, created_at, hotel_id) DO UPDATE
    SET
      reviewer_country = EXCLUDED.reviewer_country,
      rating = EXCLUDED.rating,
      review_headline = EXCLUDED.review_headline,
      review_positive = EXCLUDED.review_positive,
      review_negative = EXCLUDED.review_negative,
      hotel_response_content = EXCLUDED.hotel_response_content,
      source_id = EXCLUDED.source_id,
      review_lang = EXCLUDED.review_lang
    RETURNING review_id;
  `;

  try {
    // Get or create hotel_id
    const hotel_id = await getOrCreateHotelId(
      review.hotel_name || 'Unknown',
      review.location || 'Jerusalem, Israel', // Default for Prima Palace
      review.chain_id || 1 // Default for Prima chain
    );

    // Format date as TIMESTAMP (yyyy-MM-dd'T'HH:mm:ss'Z')
    const dateValue = review.created_at
      ? review.created_at
      : new Date().toISOString();

    const values = [
      dateValue,
      review.reviewer_name || 'Unknown',
      review.reviewer_country || '',
      review.rating || null,
      review.review_headline || '',
      review.review_positive || '',
      review.review_negative || '',
      review.hotel_response_content || null,
      hotel_id,
      review.source_id || 1,
      review.review_lang || 'en'
    ];

    if (!review.hotel_response_content) {
      console.warn(`No hotel response for review by ${review.reviewer_name} on ${review.created_at}`);
    }

    console.log(`📝 Inserting review for ${review.reviewer_name} at ${review.hotel_name} with hotel_id: ${hotel_id}, values:`, values);
    const result = await pool.query(query, values);
    const insertedId = result.rows[0].review_id;
    console.log(`✅ ${review.hotel_response_content ? 'Updated' : 'Inserted'} review with ID ${insertedId} for ${review.reviewer_name} on ${review.created_at} at hotel ${review.hotel_name}`);

    return insertedId;
  } catch (err) {
    console.error(`❌ Failed to insert/update review for ${review.reviewer_name} at ${review.hotel_name}:`, err);
    throw err;
  }
}

module.exports = { insertReview };