Hotel Review Scraper
This project scrapes hotel reviews from Booking.com, processes them, and stores them in a PostgreSQL database. It uses Puppeteer and Cheerio for web scraping and Node.js for backend logic. The project is designed to extract structured review data, including positive and negative feedback, and supports hotel reviews as a primary use case.
Features

Scrapes reviews from Booking.com, extracting fields like reviewer name, country, rating, positive/negative reviews, and hotel responses.
Supports Hebrew review parsing with date localization.
Stores data in a PostgreSQL database with a robust schema.
Handles hotel creation and review insertion with conflict resolution.
Logs detailed scraping and insertion processes for debugging.

Project Structure
hotel-review-scraper/
├── config/
│   └── db.js              # Database connection configuration
├── db/
│   └── insertReview.js    # Logic for inserting reviews and managing hotels
├── scripts/
│   └── scrapeAndInsert.js # Main script to run scraping and insertion
├── services/
│   └── puppeteerService.js # Scraping logic using Puppeteer and Cheerio
├── page.html              # Local HTML file for testing (Booking.com reviews)
├── package.json           # Node.js dependencies and scripts
├── README.md              # Project documentation
└── schema.sql             # Database schema definition

Prerequisites

Node.js: v16 or higher
PostgreSQL: v13 or higher
Booking.com reviews: Access to review pages or a local page.html file
Environment Variables:
DB_HOST: PostgreSQL host (e.g., localhost)
DB_PORT: PostgreSQL port (e.g., 5432)
DB_NAME: Database name (e.g., hotel_reviews)
DB_USER: Database user
DB_PASS: Database password



Setup

Clone the Repository:
git clone https://github.com/your-repo/hotel-review-scraper.git
cd hotel-review-scraper


Install Dependencies:
npm install


Set Up Environment Variables:Create a .env file in the root directory:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_reviews
DB_USER=your_user
DB_PASS=your_password


Initialize the Database:Create the database and tables by running schema.sql in your PostgreSQL client:
psql -U your_user -d hotel_reviews -f schema.sql


Prepare Review Data:

For local testing, place a Booking.com reviews HTML file as page.html in the root directory.
For live scraping, update puppeteerService.js with the target URL.



Database Schema
The database consists of three main tables:

hotel_chains: Stores hotel chain information (chain_id, name).
hotels: Stores hotel details (hotel_id, name, location, chain_id).
guest_reviews: Stores review data, including:
review_id, created_at, reviewer_name, reviewer_country, rating
review_headline, review_positive, review_negative, hotel_response
hotel_id, source_id, room_type, num_of_nights, composition, lang, response_id



Run schema.sql to set up the schema:
CREATE TABLE hotel_chains (
  chain_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE hotels (
  hotel_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  chain_id INTEGER,
  CONSTRAINT hotels_chain_id_fkey FOREIGN KEY (chain_id) REFERENCES hotel_chains(chain_id)
);

CREATE TABLE sources (
  source_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE guest_reviews (
  review_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_country TEXT,
  rating NUMERIC,
  sentiment_score NUMERIC,
  review_headline TEXT,
  review_positive TEXT,
  review_negative TEXT,
  hotel_response TEXT,
  response_quality_score NUMERIC,
  hotel_id INTEGER NOT NULL,
  source_id INTEGER,
  is_genius BOOLEAN,
  reservation_id TEXT,
  reply_last_modified TIMESTAMP,
  room_type VARCHAR(100),
  num_of_nights INTEGER,
  composition VARCHAR(50),
  lang VARCHAR(10),
  response_id SERIAL UNIQUE,
  CONSTRAINT guest_reviews_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
  CONSTRAINT guest_reviews_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(source_id) ON DELETE SET NULL,
  UNIQUE (reviewer_name, created_at, hotel_id)
);

INSERT INTO sources (source_id, name) VALUES (1, 'Booking.com') ON CONFLICT DO NOTHING;

Usage
Run the scraper to process reviews from page.html and insert them into the database:
node scripts/scrapeAndInsert.js "LOCAL"

Output:

Logs the number of reviews found, extracted data, and insertion status.
Example:📄 Loading page.html locally...
🏨 Extracted hotel name: prima palace
🔍 Found review blocks: 25
Review 24: { guest_name: "שפיגל", rating: 5, positive_review: "", negative_review: "מאוד לא אהבנו את הקטע עם הארוחת בוקר", ... }
✅ Inserted review with ID 1053 for שפיגל on 2025-02-24T00:00:00Z at hotel prima palace
✅ Done inserting reviews. Successfully processed 25/25 reviews.



To scrape live from a Booking.com URL, update puppeteerService.js and run:
node scripts/scrapeAndInsert.js "https://www.booking.com/reviews/hotel/prima-palace.html"

Configuration

Review Extraction (puppeteerService.js):
Positive reviews: Extracted from <span class="bui-u-sr-only">אהבו</span> parent.
Negative reviews: Extracted from <span class="bui-u-sr-only">לא אהבו</span> parent.
Update selectors for room_type, num_of_nights, composition, and lang based on Booking.com HTML.


Database (insertReview.js):
Handles hotel creation and review insertion with ON CONFLICT for duplicates.
Supports new fields: room_type, num_of_nights, composition, lang, response_id.



Troubleshooting

Schema Errors:If column "room_type" does not exist, ensure schema.sql was applied:psql -U your_user -d hotel_reviews -c "\d guest_reviews"


Review Extraction Issues:If positive_review or negative_review are empty, verify page.html selectors in puppeteerService.js.
Database Connection:Ensure .env variables are set and PostgreSQL is running.
Logs:Check console output for detailed error messages, e.g., ❌ Failed to insert/update review.

Contributing

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request.

Future Improvements

Add selectors for room_type, num_of_nights, and composition once HTML is provided.
Implement sentiment analysis for sentiment_score.
Support multiple review sources beyond Booking.com.
Add unit tests for scraping and insertion logic.

License
This project is licensed under the MIT License.
Contact
For issues or questions, open an issue on GitHub or contact the maintainer at your-email@example.com.
