-- ============================================================
-- Portfolio Backend - Canonical Schema
-- ============================================================
-- 최종 업데이트: 2026-02-26
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 전체 실행
-- 주의: 신규 DB에만 실행. 기존 DB에는 아래 "기존 DB 적용" 섹션 참고
--
-- 설계 결정:
--   - RLS 비활성화: NestJS에서 애플리케이션 레벨 접근 제어
--   - synchronize: false: TypeORM 자동 스키마 변경 비활성화
--   - likes.target_type: enum 대신 text (TypeORM enum 생성 방지)
--   - views 테이블: Redis Write-Back 조회수의 DB 동기화 대상 (별도 사용 X)
-- ============================================================


-- ============================================================
-- 1. 스키마 생성
-- ============================================================
CREATE SCHEMA IF NOT EXISTS portfolio;


-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio.users (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id  uuid        UNIQUE,                        -- Supabase auth.users.id
  email             text        UNIQUE NOT NULL,
  password          text,                                      -- OAuth 사용자는 null
  nickname          text        NOT NULL,
  avatar_url        text,
  bio               text,
  github_url        text,
  linkedin_url      text,
  website_url       text,
  is_admin          boolean     NOT NULL DEFAULT false,
  provider          text        NOT NULL DEFAULT 'local',      -- 'local' | 'google' | 'github' | 'kakao' | 'email'
  provider_id       text,                                      -- OAuth provider 고유 ID
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email            ON portfolio.users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON portfolio.users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_users_provider         ON portfolio.users(provider, provider_id);

COMMENT ON COLUMN portfolio.users.supabase_user_id IS 'Supabase auth.users.id - OAuth 로그인 시 연결';
COMMENT ON COLUMN portfolio.users.provider         IS '인증 방식: local | google | github | kakao | email';
COMMENT ON COLUMN portfolio.users.provider_id      IS 'OAuth Provider 고유 ID (Google sub, GitHub id 등)';


-- ============================================================
-- 3. projects
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio.projects (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  summary          text        NOT NULL,                       -- 카드용 짧은 요약
  description      text        NOT NULL,                       -- Markdown 상세 설명
  thumbnail_url    text,
  demo_url         text,
  github_url       text,
  tech_stack       text[]      NOT NULL DEFAULT '{}',
  tags             text[]      NOT NULL DEFAULT '{}',
  status           text        NOT NULL DEFAULT 'completed',   -- 'in-progress' | 'completed' | 'archived'
  featured         boolean     NOT NULL DEFAULT false,
  view_count       integer     NOT NULL DEFAULT 0,
  like_count       integer     NOT NULL DEFAULT 0,
  start_date       date,
  end_date         date,
  author_id        uuid        NOT NULL,                       -- portfolio.users.id (denormalized)
  author_nickname  text        NOT NULL,
  author_avatar_url text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_author_id  ON portfolio.projects(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_status     ON portfolio.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_featured   ON portfolio.projects(featured);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON portfolio.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_view_count ON portfolio.projects(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_search     ON portfolio.projects
  USING gin(to_tsvector('english', title || ' ' || description));

COMMENT ON COLUMN portfolio.projects.author_id IS 'Denormalized: FK 없이 직접 저장, 조인 없이 목록 표시 가능';


-- ============================================================
-- 4. posts
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio.posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  summary          text        NOT NULL,                       -- 목록용 짧은 요약
  content          text        NOT NULL,                       -- Markdown 본문
  thumbnail_url    text,
  category         text        NOT NULL,                       -- 'tutorial' | 'essay' | 'review' | 'news'
  tags             text[]      NOT NULL DEFAULT '{}',
  is_published     boolean     NOT NULL DEFAULT true,
  view_count       integer     NOT NULL DEFAULT 0,
  like_count       integer     NOT NULL DEFAULT 0,
  comment_count    integer     NOT NULL DEFAULT 0,
  reading_time     integer,                                    -- 예상 읽기 시간 (분), 자동 계산
  author_id        uuid        NOT NULL,
  author_nickname  text        NOT NULL,
  author_avatar_url text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id   ON portfolio.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category    ON portfolio.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON portfolio.posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at  ON portfolio.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_view_count  ON portfolio.posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags        ON portfolio.posts USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_posts_search      ON portfolio.posts
  USING gin(to_tsvector('english', title || ' ' || content));


-- ============================================================
-- 5. comments
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio.comments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type      text        NOT NULL,                       -- 'project' | 'post'
  target_id        uuid        NOT NULL,
  parent_id        uuid        REFERENCES portfolio.comments(id) ON DELETE CASCADE,
  content          text        NOT NULL,
  author_id        uuid,                                       -- null: 익명 댓글
  author_nickname  text        NOT NULL,
  author_email     text,
  author_ip        text,                                       -- 익명 사용자 식별용
  is_deleted       boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_target     ON portfolio.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent     ON portfolio.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author     ON portfolio.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON portfolio.comments(created_at DESC);


-- ============================================================
-- 6. likes
-- ============================================================
-- target_type을 text로 사용 (TypeORM enum 컬럼 생성 방지)
-- 애플리케이션 레벨에서 'project' | 'post' 검증
CREATE TABLE IF NOT EXISTS portfolio.likes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  text        NOT NULL,                           -- 'project' | 'post'
  target_id    uuid        NOT NULL,
  user_id      uuid        NOT NULL,                           -- 로그인 필수 (비로그인 좋아요 미지원)
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_likes_user UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON portfolio.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user   ON portfolio.likes(user_id);

COMMENT ON COLUMN portfolio.likes.user_id IS 'portfolio.users.id - 로그인 사용자만 좋아요 가능';


-- ============================================================
-- 7. views (Redis Write-Back 동기화 대상)
-- ============================================================
-- Redis가 실시간 조회수를 관리하고 매일 자정 projects/posts의
-- view_count 컬럼에 동기화함. 이 테이블은 직접 조회에 쓰이지 않음.
-- IP 중복 방지도 Redis TTL로 처리하므로 이 테이블의 ip_address는 참고용.
CREATE TABLE IF NOT EXISTS portfolio.views (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  text        NOT NULL,                           -- 'project' | 'post'
  target_id    uuid        NOT NULL,
  ip_address   text        NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_views_target     ON portfolio.views(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_views_created_at ON portfolio.views(created_at DESC);


-- ============================================================
-- 8. updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION portfolio.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users
DROP TRIGGER IF EXISTS trg_users_updated_at ON portfolio.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON portfolio.users
  FOR EACH ROW EXECUTE FUNCTION portfolio.update_updated_at();

-- projects
DROP TRIGGER IF EXISTS trg_projects_updated_at ON portfolio.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON portfolio.projects
  FOR EACH ROW EXECUTE FUNCTION portfolio.update_updated_at();

-- posts
DROP TRIGGER IF EXISTS trg_posts_updated_at ON portfolio.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON portfolio.posts
  FOR EACH ROW EXECUTE FUNCTION portfolio.update_updated_at();

-- comments
DROP TRIGGER IF EXISTS trg_comments_updated_at ON portfolio.comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON portfolio.comments
  FOR EACH ROW EXECUTE FUNCTION portfolio.update_updated_at();


-- ============================================================
-- 9. RLS 비활성화
-- ============================================================
-- NestJS 애플리케이션에서 접근 제어를 전담.
-- Supabase JWT 검증 → Guard → Service 레이어에서 권한 확인.
-- RLS를 켜면 Supabase anon key로 접근하는 NestJS가 데이터를 못 읽음.
ALTER TABLE portfolio.users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.posts    DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.likes    DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.views    DISABLE ROW LEVEL SECURITY;


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
WHERE t.schemaname = 'portfolio'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 기대 결과:
--   comments | false | ...
--   likes    | false | ...
--   posts    | false | ...
--   projects | false | ...
--   users    | false | ...
--   views    | false | ...
