-- BACK-25: Add image_urls field to projects and posts
-- Run on: portfolio schema (prod), portfolio_dev schema (dev)

ALTER TABLE portfolio.projects
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE portfolio.posts
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- portfolio_dev (dev schema)
ALTER TABLE portfolio_dev.projects
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE portfolio_dev.posts
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
