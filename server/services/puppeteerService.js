const fs = require("fs");
const cheerio = require("cheerio");
const { parse, format, isValid } = require('date-fns');
const { he } = require('date-fns/locale');

function isHebrew(text) {
  return /[֐-׿]/.test(text);
}

async function scrapeBookingWithPuppeteer(url, pagePath = "page.html") {
  try {
    console.log(`📄 Loading ${pagePath} locally...`);
    const html = fs.readFileSync(pagePath, "utf-8");
    const $ = cheerio.load(html);

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

    const reviewBlocks = $("div.c-review-block");
    console.log("🔍 Found review blocks:", reviewBlocks.length);
    if (reviewBlocks.length === 0) {
      console.warn("🚫 No review blocks found! Check selector or HTML structure.");
    }

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
        return isNaN(num) ? null : Math.round(num);
      };

      const reviewer_name = getText(".bui-avatar-block__title") || "Unknown";
      const reviewer_country = getText(".bui-avatar-block__subtitle") || "";
      const rating = getNumber(".bui-review-score__badge");
      const review_headline = getText(".c-review-block__title") || "";
      const review_text = getText(".c-review__body") || getText(".review-content") || getText("[data-testid='review-text']") || "";

      const splitReview = (text, rating) => {
        if (text === "" || text === "No review text provided") {
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
          const isNegative = negativeMarkers.some(marker => sentence.includes(marker)) ||
            negativeWords.some(word => sentence.includes(word)) ||
            (rating && rating <= 6 && sentence.includes("לא"));
          if (isNegative) {
            negative.push(sentence);
          } else {
            positive.push(sentence);
          }
        });

        if (rating && rating <= 6 && positive.length > 0 && negative.length === 0) {
          negative.push(...positive);
          positive = [];
        }

        return {
          positive: positive.join(". ").trim(),
          negative: negative.join(". ").trim()
        };
      };

      const { positive: review_positive, negative: review_negative } = splitReview(review_text, rating);

      const hotel_response_content = (() => {
        const responseCandidates = $(node).find(".c-review-block__response__body");
        if (responseCandidates.length === 0) return null;
        const bestResponse = responseCandidates
          .map((i, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .sort((a, b) => b.length - a.length)[0];
        return bestResponse || null;
      })();

      console.log(`📢 Review ${i} hotel response:`, hotel_response_content);
      console.log(`🗣️ Review ${i} text:`, review_text);

      let dateText = getText(".c-review-block__date");
      let created_at;
      if (dateText) {
        const match = dateText.match(/(\d+\s+[א-ת]+\s+\d{4})/);
        if (match && match[1]) {
          try {
            const cleanDateText = match[1].replace(/\s+ב([א-ת]+)/, ' $1');
            const parsedDate = parse(cleanDateText, 'd MMMM yyyy', new Date(), { locale: he });
            if (isValid(parsedDate)) {
              created_at = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss");
            } else {
              created_at = new Date().toISOString();
            }
          } catch {
            created_at = new Date().toISOString();
          }
        } else {
          created_at = new Date().toISOString();
        }
      } else {
        created_at = new Date().toISOString();
      }

      const review_lang = isHebrew(review_text) ? 'he' : 'en';

      return {
        created_at,
        reviewer_name,
        reviewer_country,
        rating,
        review_headline,
        review_positive,
        review_negative,
        hotel_response_content,
        hotel_name,
        source_id: 1,
        review_lang
      };
    }).get();

    console.log("🧾 Final extracted reviews:", reviews);
    return reviews;
  } catch (err) {
    console.error("❌ Local HTML parsing failed:", err);
    throw err;
  }
}

module.exports = { scrapeBookingWithPuppeteer };