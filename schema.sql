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
  created_at DATE NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_country TEXT,
  rating INTEGER,
  sentiment_score NUMERIC,
  review_headline TEXT,
  review_positive TEXT,
  review_negative TEXT,
  hotel_response TEXT,
  response_quality_score NUMERIC,
  hotel_id INTEGER NOT NULL,
  source_id INTEGER,
  review_text TEXT,
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