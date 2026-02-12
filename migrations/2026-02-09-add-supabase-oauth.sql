-- ================================================
-- Migration: Add Supabase OAuth Support
-- Date: 2026-02-09
-- ================================================

-- 1. supabase_user_id 컬럼 추가
ALTER TABLE portfolio.users 
ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

-- 2. Unique Index 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id 
ON portfolio.users(supabase_user_id);

-- 3. Comment 추가
COMMENT ON COLUMN portfolio.users.supabase_user_id IS 'Supabase auth.users 테이블의 id (OAuth 사용자 연결)';
COMMENT ON COLUMN portfolio.users.provider IS '인증 방식: local, google, github, email';
COMMENT ON COLUMN portfolio.users.provider_id IS 'OAuth Provider 고유 ID (Google sub, GitHub id 등)';

-- 4. 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'portfolio' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ✅ 예상 결과: supabase_user_id uuid 컬럼 추가 확인
