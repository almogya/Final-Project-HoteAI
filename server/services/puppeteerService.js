// services/puppeteerService.js
const fs = require("fs");
const cheerio = require("cheerio");
const { parse, format, isValid } = require('date-fns');
const { he } = require('date-fns/locale');

async function scrapeBookingWithPuppeteer(url) {
  try {
    console.log("📄 Loading page.html locally...");
    const html = fs.readFileSync("page.html", "utf-8");
    const $ = cheerio.load(html);

    // Extract hotel name from pagename parameter
    let hotel_name = "Unknown";
    const paginationLink = $("a.pagenext").attr("href");
    if (paginationLink) {
      const match = paginationLink.match(/pagename=([^;]+)/);
      if (match && match[1]) {
        hotel_name = match[1].replace(/-/g, ' ');
        console.log(`🏨 Extracted hotel name: ${hotel_name}`);
      } else {
        console.warn("⚠️ No pagename found in pagination link");
      }
    } else {
      console.warn("⚠️ No pagination link found with class .pagenext");
    }

    const reviewBlocks = $("li.review_list_new_item_block");
    console.log("🔍 Found review blocks:", reviewBlocks.length);

    const reviews = reviewBlocks.map((i, node) => {
      const getText = (selector) => {
        const elements = $(node).find(selector);
        if (elements.length === 0) return "";
        const texts = elements
          .map((j, el) => $(el).text().trim())
          .get()
          .filter(text => text);
        if (texts.length === 0) return "";
        return texts.reduce((a, b) => (a.length >= b.length ? a : b));
      };

      const getNumber = (selector) => {
        const text = getText(selector);
        const num = parseFloat(text);
        return isNaN(num) ? null : num;
      };

      // Extract fields
      const guest_name = getText(".bui-avatar-block__title") || "Unknown";
      const country = getText(".bui-avatar-block__subtitle") || "";
      const rating = getNumber(".bui-review-score__badge");
      const headline = getText(".c-review-block__title") || "";

      // Review content
      const review_text =
        getText(".c-review__body") ||
        getText(".review-content") ||
        getText("[data-testid='review-text']") ||
        "No review text provided";

      // Split review_text into positive and negative
      const splitReview = (text, rating) => {
        if (text === "No review text provided") {
          return { positive: "", negative: "" };
        }
        const normalizedText = text.replace(/\s+/g, ' ').trim();
        const sentences = normalizedText.split(/[.\n]/).map(s => s.trim()).filter(s => s);
        let positive = [];
        let negative = [];
        const negativeMarkers = [
          "אבל", "חבל ש", "לא נעים", "בעיה", "חסרון", "קשה", "רעש", "לא נוח", "מאכזב",
          "לא מספיק", "קטן מדי", "לא נקי", "לא מתאים", "חסר", "מוגבל", "ישן", "לא עבד",
          "לא הייתי מרוצה", "הרגשנו לא בנוח", "ציפיתי ליותר", "לא אהבנו", "לא מומלץ",
          "מאוד לא", "אכזבה", "גרוע", "לא טוב"
        ];
        const negativeWords = [
          "חסר", "קטן", "ישן", "רע", "לא טוב", "צפוף", "מלוכלך", "שבור", "מוגבל",
          "בעייתי", "לא נעים", "לא מספק"
        ];

        sentences.forEach((sentence) => {
          if (!sentence) return;
          // Check for negative markers or words
          const isNegative = negativeMarkers.some(marker => sentence.includes(marker)) ||
            negativeWords.some(word => sentence.includes(word)) ||
            // Low rating increases likelihood of negative sentiment
            (rating && rating <= 6 && sentence.includes("לא"));
          if (isNegative) {
            negative.push(sentence);
          } else {
            positive.push(sentence);
          }
        });

        // If rating is low (<=6) and positive is populated but negative is empty, move content to negative
        if (rating && rating <= 6 && positive.length > 0 && negative.length === 0) {
          negative.push(...positive);
          positive = [];
        }

        return {
          positive: positive.join(". ").trim(),
          negative: negative.join(". ").trim()
        };
      };

      const { positive: positive_review, negative: negative_review } = splitReview(review_text, rating);

      // Hotel response
      const hotel_response =
        getText(".c-review-block__response__body") ||
        getText(".c-review__response") ||
        getText(".hp--review-response__body") ||
        getText(".review-response__content") ||
        getText(".bui-card__content--response") ||
        getText("[data-testid='review-response']") ||
        getText(".review-block__response") ||
        null;

      // Date parsing
      let dateText = getText(".c-review-block__date");
      let date;
      if (dateText) {
        const match = dateText.match(/(\d+\s+[א-ת]+\s+\d{4})/);
        if (match && match[1]) {
          try {
            const cleanDateText = match[1].replace(/\s+ב([א-ת]+)/, ' $1');
            const parsedDate = parse(cleanDateText, 'd MMMM yyyy', new Date(), { locale: he });
            if (isValid(parsedDate)) {
              date = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss'Z'");
            } else {
              console.warn(`Invalid parsed date for "${cleanDateText}"`);
              date = new Date().toISOString();
            }
          } catch (err) {
            console.warn(`Failed to parse date "${match[1]}":`, err.message);
            date = new Date().toISOString();
          }
        } else {
          console.warn(`No valid date found in "${dateText}"`);
          date = new Date().toISOString();
        }
      } else {
        console.warn("No date text found");
        date = new Date().toISOString();
      }

      // Additional fields
      const is_genius = getText(".bui-badge--genius") ? true : false;
      const reservation_id = getText("[data-reservation-id]") || null;
      const reply_last_modified =
        getText(".c-review-block__response__date") ||
        getText(".hp--review-response__date") ||
        getText(".review-response__date") ||
        getText(".c-review-block__response__date") ||
        null;
      const sentiment_score = null; // Requires external analysis
      const response_quality_score = null; // Requires external analysis

      // Log raw review data and HTML
      const rawHtml = $(node).html();
      console.log(`Review ${i}:`, {
        guest_name,
        country,
        rating,
        headline,
        positive_review,
        negative_review,
        review_text,
        hotel_response,
        date,
        is_genius,
        reservation_id,
        reply_last_modified,
        hotel_name
      });
      console.log(`Raw HTML for Review ${i}:`, rawHtml.slice(0, 500) + (rawHtml.length > 500 ? '...' : ''));

      return {
        date,
        guest_name,
        country,
        reviewer_rate: rating,
        headline,
        positive_review,
        negative_review,
        response_content: hotel_response,
        hotel_name,
        source_id: 1,
        review_text,
        is_genius,
        reservation_id,
        reply_last_modified,
        sentiment_score,
        response_quality_score
      };
    }).get();

    return reviews;
  } catch (err) {
    console.error("❌ Local HTML parsing failed:", err);
    throw err;
  }
}

module.exports = { scrapeBookingWithPuppeteer };