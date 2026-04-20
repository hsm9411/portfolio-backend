-- ============================================================
-- Portfolio Dev Schema (portfolio_dev)
-- ============================================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 전체 실행
-- 목적: dev 서버(portfolio-backend-dev)가 portfolio와 독립된
--       portfolio_dev 스키마를 사용하도록 분리
--
-- prod 스키마(portfolio)와 구조 동일, 데이터는 완전 분리됨
-- 최신 마이그레이션 반영 버전:
--   - 2026-02-09: supabase_user_id
--   - 2026-04-17: comments.author_avatar_url, projects.comment_count
--   - 2026-04-19: comments.is_anonymous
-- ============================================================


-- ============================================================
-- 1. 스키마 생성
-- ============================================================
CREATE SCHEMA IF NOT EXISTS portfolio_dev;


-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.users (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id  uuid        UNIQUE,
  email             text        UNIQUE NOT NULL,
  password          text,
  nickname          text        NOT NULL,
  avatar_url        text,
  bio               text,
  github_url        text,
  linkedin_url      text,
  website_url       text,
  is_admin          boolean     NOT NULL DEFAULT false,
  provider          text        NOT NULL DEFAULT 'local',
  provider_id       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_users_email            ON portfolio_dev.users(email);
CREATE INDEX IF NOT EXISTS idx_dev_users_supabase_user_id ON portfolio_dev.users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_dev_users_provider         ON portfolio_dev.users(provider, provider_id);


-- ============================================================
-- 3. projects
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.projects (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  summary           text        NOT NULL,
  description       text        NOT NULL,
  thumbnail_url     text,
  demo_url          text,
  github_url        text,
  tech_stack        text[]      NOT NULL DEFAULT '{}',
  tags              text[]      NOT NULL DEFAULT '{}',
  status            text        NOT NULL DEFAULT 'completed',
  featured          boolean     NOT NULL DEFAULT false,
  view_count        integer     NOT NULL DEFAULT 0,
  like_count        integer     NOT NULL DEFAULT 0,
  comment_count     integer     NOT NULL DEFAULT 0,
  start_date        date,
  end_date          date,
  author_id         uuid        NOT NULL,
  author_nickname   text        NOT NULL,
  author_avatar_url text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_projects_author_id  ON portfolio_dev.projects(author_id);
CREATE INDEX IF NOT EXISTS idx_dev_projects_status     ON portfolio_dev.projects(status);
CREATE INDEX IF NOT EXISTS idx_dev_projects_featured   ON portfolio_dev.projects(featured);
CREATE INDEX IF NOT EXISTS idx_dev_projects_created_at ON portfolio_dev.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_projects_view_count ON portfolio_dev.projects(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_dev_projects_search     ON portfolio_dev.projects
  USING gin(to_tsvector('english', title || ' ' || description));


-- ============================================================
-- 4. posts
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.posts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  summary           text        NOT NULL,
  content           text        NOT NULL,
  thumbnail_url     text,
  category          text        NOT NULL,
  tags              text[]      NOT NULL DEFAULT '{}',
  is_published      boolean     NOT NULL DEFAULT true,
  view_count        integer     NOT NULL DEFAULT 0,
  like_count        integer     NOT NULL DEFAULT 0,
  comment_count     integer     NOT NULL DEFAULT 0,
  reading_time      integer,
  author_id         uuid        NOT NULL,
  author_nickname   text        NOT NULL,
  author_avatar_url text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  published_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dev_posts_author_id    ON portfolio_dev.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_dev_posts_category     ON portfolio_dev.posts(category);
CREATE INDEX IF NOT EXISTS idx_dev_posts_is_published ON portfolio_dev.posts(is_published);
CREATE INDEX IF NOT EXISTS idx_dev_posts_created_at   ON portfolio_dev.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_posts_view_count   ON portfolio_dev.posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_dev_posts_tags         ON portfolio_dev.posts USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_dev_posts_search       ON portfolio_dev.posts
  USING gin(to_tsvector('english', title || ' ' || content));


-- ============================================================
-- 5. comments
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type       text        NOT NULL,
  target_id         uuid        NOT NULL,
  parent_id         uuid        REFERENCES portfolio_dev.comments(id) ON DELETE CASCADE,
  content           text        NOT NULL,
  author_id         uuid,
  author_nickname   text        NOT NULL,
  author_avatar_url text,
  author_email      text,
  author_ip         text,
  is_anonymous      boolean     NOT NULL DEFAULT false,
  is_deleted        boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_comments_target     ON portfolio_dev.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_dev_comments_parent     ON portfolio_dev.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_dev_comments_author     ON portfolio_dev.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_dev_comments_created_at ON portfolio_dev.comments(created_at DESC);


-- ============================================================
-- 6. likes
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.likes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  text        NOT NULL,
  target_id    uuid        NOT NULL,
  user_id      uuid        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_dev_likes_user UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_likes_target ON portfolio_dev.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_dev_likes_user   ON portfolio_dev.likes(user_id);


-- ============================================================
-- 7. views
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.views (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  text        NOT NULL,
  target_id    uuid        NOT NULL,
  ip_address   text        NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_views_target     ON portfolio_dev.views(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_dev_views_created_at ON portfolio_dev.views(created_at DESC);


-- ============================================================
-- 8. updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION portfolio_dev.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dev_users_updated_at    ON portfolio_dev.users;
CREATE TRIGGER trg_dev_users_updated_at
  BEFORE UPDATE ON portfolio_dev.users
  FOR EACH ROW EXECUTE FUNCTION portfolio_dev.update_updated_at();

DROP TRIGGER IF EXISTS trg_dev_projects_updated_at ON portfolio_dev.projects;
CREATE TRIGGER trg_dev_projects_updated_at
  BEFORE UPDATE ON portfolio_dev.projects
  FOR EACH ROW EXECUTE FUNCTION portfolio_dev.update_updated_at();

DROP TRIGGER IF EXISTS trg_dev_posts_updated_at    ON portfolio_dev.posts;
CREATE TRIGGER trg_dev_posts_updated_at
  BEFORE UPDATE ON portfolio_dev.posts
  FOR EACH ROW EXECUTE FUNCTION portfolio_dev.update_updated_at();

DROP TRIGGER IF EXISTS trg_dev_comments_updated_at ON portfolio_dev.comments;
CREATE TRIGGER trg_dev_comments_updated_at
  BEFORE UPDATE ON portfolio_dev.comments
  FOR EACH ROW EXECUTE FUNCTION portfolio_dev.update_updated_at();


-- ============================================================
-- 9. RLS 비활성화 (portfolio 스키마와 동일 정책)
-- ============================================================
ALTER TABLE portfolio_dev.users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_dev.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_dev.posts    DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_dev.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_dev.likes    DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_dev.views    DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 완료 확인 쿼리
-- ============================================================
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(c.column_name) AS columns
FROM pg_tables t
JOIN information_schema.columns c
  ON c.table_schema = t.schemaname
  AND c.table_name = t.tablename
WHERE t.schemaname = 'portfolio_dev'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
