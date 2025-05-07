const { scrapeBookingWithPuppeteer } = require('./services/puppeteerService');

scrapeBookingWithPuppeteer().then((reviews) => {
  console.log(`🟢 Found ${reviews.length} reviews`);
  reviews.forEach((r, i) => {
    console.log(`🔹 Review ${i}: ${r.review_positive}`);
    console.log(`📢 Hotel response: ${r.hotel_response_content}`);
  });
});