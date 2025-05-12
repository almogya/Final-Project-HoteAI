require('dotenv').config({ path: __dirname + '/../.env' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');

const { scrapeBookingWithPuppeteer } = require('../services/puppeteerService');
const { insertReview } = require('../db/insertReview');

// Helper – URL → review-list URL
function hotelUrlToReviewList(hotelUrl) {
  const slugMatch = hotelUrl.match(/hotel\/[^/]+\/([^.?/#]+)/i);
  if (!slugMatch) throw new Error('Cannot detect hotel slug in URL');

  const slug = slugMatch[1].toLowerCase(); // ex: park-plaza
  return `https://www.booking.com/reviewlist.he.html?pagename=${slug}&type=total&cc1=il`;
}

// Download HTML → page-<offset>.html (Axios → fallback Puppeteer)
async function downloadReviewPage(url, offset) {
  const outPath = path.join(__dirname, `../page-${offset}.html`);

  try {
    console.log('🌐 (Axios) downloading', url);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'he,en;q=0.9'
      },
      timeout: 10_000
    });
    fs.writeFileSync(outPath, data);
    console.log('💾 Saved to', outPath, '(Axios)');
    return outPath;
  } catch (err) {
    console.warn('⚠️ Axios failed – fallback to Puppeteer …');
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
  const html = await page.content();
  await browser.close();

  fs.writeFileSync(outPath, html);
  console.log('💾 Saved to', outPath, '(Puppeteer)');
  return outPath;
}

// Add a delay to avoid rate limiting
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main
(async () => {
  const input = process.argv[2];
  if (!input) {
    console.error('❌ Usage: node scripts/scrapeAndInsert.js <hotel-URL | reviewlist-URL>');
    process.exit(1);
  }

  let reviewUrl = /reviewlist\./.test(input) ? input : hotelUrlToReviewList(input);
  const urlParams = new URLSearchParams(reviewUrl.split('?')[1] || '');
  const rows = parseInt(urlParams.get('rows')) || 500; // Default to 500
  const offset = parseInt(urlParams.get('offset')) || 0;
  const totalReviews = offset + rows;

  // Ensure all required parameters are set
  const baseParams = new URLSearchParams();
  baseParams.set('pagename', urlParams.get('pagename') || reviewUrl.match(/pagename=([^&;]+)/)?.[1]);
  baseParams.set('type', 'total');
  baseParams.set('cc1', 'il');
  baseParams.set('rows', '25'); // Booking.com page size

  let allReviews = [];
  for (let currentOffset = offset; currentOffset < totalReviews; currentOffset += 25) {
    baseParams.set('offset', currentOffset);
    const paginatedUrl = `https://www.booking.com/reviewlist.he.html?${baseParams.toString()}`;
    console.log(`🌐 Fetching page with offset ${currentOffset}: ${paginatedUrl}`);

    const pagePath = await downloadReviewPage(paginatedUrl, currentOffset);
    const reviews = await scrapeBookingWithPuppeteer(paginatedUrl, pagePath);
    allReviews = allReviews.concat(reviews);

    console.log(`📑 Fetched ${reviews.length} reviews from offset ${currentOffset}`);
    if (reviews.length < 25) {
      console.log(`🛑 Stopping: Fewer than 25 reviews fetched at offset ${currentOffset}`);
      break;
    }

    // Add a delay to avoid rate limiting (e.g., 2 seconds between requests)
    await delay(2000);
  }

  console.log(`📥 Inserting ${allReviews.length} reviews …`);
  for (const review of allReviews) {
    try {
      await insertReview(review);
    } catch (err) {
      console.error(`❌ Failed to insert review:`, err);
    }
  }
  console.log('✅ Done!');
})();