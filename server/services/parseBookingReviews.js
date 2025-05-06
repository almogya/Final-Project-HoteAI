// services/parseBookingReviews.js

/**
 * Very basic parser that tries to extract reviews from Booking.com scraped text.
 * In production, you'd want to upgrade this to use an LLM or a better parser.
 */

function extractReviewsFromText(text) {
  const reviews = [];

  // Split the text by lines and look for patterns that indicate reviews
  const lines = text.split("\n");
  let currentReview = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("חוות דעת מאת")) {
      if (Object.keys(currentReview).length > 0) {
        reviews.push(currentReview);
        currentReview = {};
      }
      currentReview.guest_name = line.replace("חוות דעת מאת", "").trim();
    } else if (line.startsWith("ציון")) {
      currentReview.reviewer_rate = parseFloat(line.replace("ציון", "").trim()) || null;
    } else if (line.startsWith("חיובי")) {
      currentReview.positive_review = line.replace("חיובי", "").trim();
    } else if (line.startsWith("שלילי")) {
      currentReview.negative_review = line.replace("שלילי", "").trim();
    } else if (/\d{1,2} [א-ת]+ \d{4}/.test(line)) {
      currentReview.date = line; // simplistic date pattern
    }
  }

  if (Object.keys(currentReview).length > 0) {
    reviews.push(currentReview);
  }

  // Fill in missing required fields with defaults
  return reviews.map((r, i) => ({
    review_id: `scraped_${Date.now()}_${i}`,
    date: r.date || null,
    guest_name: r.guest_name || "Unknown",
    country: "",
    room_type: "",
    num_of_nights: 1,
    num_of_people: 2,
    reviewer_rate: r.reviewer_rate || null,
    lang: "he",
    headline: "",
    positive_review: r.positive_review || "",
    negative_review: r.negative_review || "",
    id_hotel_response: null,
    response_content: null
  }));
}

module.exports = { extractReviewsFromText };
