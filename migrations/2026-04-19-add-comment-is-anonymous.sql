-- Add is_anonymous column to portfolio.comments
ALTER TABLE portfolio.comments
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
