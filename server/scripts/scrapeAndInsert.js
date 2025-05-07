// server/scripts/scrapeAndInsert.js
require('dotenv').config({ path: __dirname + '/../.env' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');

const { scrapeBookingWithPuppeteer } = require('../services/puppeteerService');
const { insertReview } = require('../db/insertReview');

// ────────────────────────────────────────────────────────────
// 1. helper – URL → review-list URL
function hotelUrlToReviewList(hotelUrl) {
  const slugMatch = hotelUrl.match(/hotel\/[^/]+\/([^.?/#]+)/i);
  if (!slugMatch) throw new Error('Cannot detect hotel slug in URL');

  const slug = slugMatch[1].toLowerCase();            // ex: clubhotel-eilat
  return `https://www.booking.com/reviewlist.he.html` +
    `?pagename=${slug}&type=total&rows=25&offset=0&cc1=il`;
}

// ────────────────────────────────────────────────────────────
// 2. download HTML  ➜  page.html  (Axios → fallback Puppeteer)
async function downloadReviewPage(url) {
  const outPath = path.join(__dirname, '../page.html');

  try {
    console.log('🌐 (Axios) downloading', url);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/124 Safari/537.36',
        'Accept-Language': 'he,en;q=0.9'
      },
      timeout: 10_000
    });
    fs.writeFileSync(outPath, data);
    console.log('💾 saved to', outPath, '(Axios)');
    return;
  } catch (err) {
    console.warn('⚠️  Axios failed – fallback to Puppeteer …');
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124 Safari/537.36');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
  const html = await page.content();
  await browser.close();

  fs.writeFileSync(outPath, html);
  console.log('💾 saved to', outPath, '(Puppeteer)');
}

// ────────────────────────────────────────────────────────────
// 3. main
(async () => {
  const input = process.argv[2];
  if (!input) {
    console.error('❌ Usage: node scripts/scrapeAndInsert.js <hotel-URL | reviewlist-URL>');
    process.exit(1);
  }

  const reviewUrl = /reviewlist\./.test(input) ? input : hotelUrlToReviewList(input);

  await downloadReviewPage(reviewUrl);             // ⇒ page.html

  const reviews = await scrapeBookingWithPuppeteer(reviewUrl);
  console.log(`📥 inserting ${reviews.length} reviews …`);
  for (const r of reviews) await insertReview(r);
  console.log('✅ done!');
})();
