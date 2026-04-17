-- ================================================
-- Migration: Add author_avatar_url to comments, comment_count to projects
-- Date: 2026-04-17
-- ================================================

-- 1. comments.author_avatar_url 컬럼 추가
ALTER TABLE portfolio.comments
ADD COLUMN IF NOT EXISTS author_avatar_url text;

-- 2. projects.comment_count 컬럼 추가
ALTER TABLE portfolio.projects
ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- 3. 확인 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'portfolio'
  AND table_name IN ('comments', 'projects')
  AND column_name IN ('author_avatar_url', 'comment_count')
ORDER BY table_name, ordinal_position;
