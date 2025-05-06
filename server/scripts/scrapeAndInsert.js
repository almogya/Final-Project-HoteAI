// scripts/scrapeAndInsert.js
require('dotenv').config({ path: __dirname + '/../.env' });
const { scrapeBookingWithPuppeteer } = require("../services/puppeteerService");
const { insertReview } = require("../db/insertReview");

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error("❌ Missing Booking URL. Usage: node scrapeAndInsert.js <url>");
    process.exit(1);
  }

  try {
    console.log("🔍 Scraping reviews from:", url);
    const reviews = await scrapeBookingWithPuppeteer(url);

    console.log(`📥 Inserting ${reviews.length} reviews into database...`);
    let successCount = 0;
    const errors = [];
    for (const [index, review] of reviews.entries()) {
      try {
        await insertReview(review);
        successCount++;
      } catch (err) {
        errors.push(`Review at index ${index}: ${err.message}`);
      }
    }

    console.log(`✅ Done inserting reviews. Successfully inserted ${successCount}/${reviews.length} reviews.`);
    if (errors.length > 0) {
      console.log("Errors encountered:");
      errors.forEach((err) => console.log(`- ${err}`));
    }
  } catch (err) {
    console.error("❌ Error during scraping & insertion:", err);
    process.exit(1);
  }
})();