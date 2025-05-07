// server/services/fetchBookingPage.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function downloadReviews(url, outPath = 'page.html') {
  const browser = await puppeteer.launch({ headless: 'new' });   // כרום 
  const page = await browser.newPage();

  // UA “אמיתי” + locale עברי כדי לקבל reviewlist.he.html
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'he-IL' });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45_000 });
  // אם יש כפתור “טען עוד ביקורות” – לגלול/להקליק כאן (ראה הערה § 5).

  const html = await page.content();                // כל ה-DOM הנוכחי :contentReference[oaicite:2]{index=2}
  await fs.writeFile(outPath, html);                // כותב page.html 
  await browser.close();
}

module.exports = { downloadReviews };
