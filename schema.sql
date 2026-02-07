-- ========================================
-- Portfolio Backend Database Schema
-- ========================================
-- Purpose: Portfolio + Tech Blog with social features
-- Database: Supabase PostgreSQL
-- Date: 2026-02-07
-- ========================================

-- ========================================
-- 1. Create Schema
-- ========================================
CREATE SCHEMA IF NOT EXISTS portfolio;

-- ========================================
-- 2. Users Table (OAuth + JWT)
-- ========================================
CREATE TABLE IF NOT EXISTS portfolio.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text,  -- nullable for OAuth users
  nickname text NOT NULL,
  avatar_url text,
  provider text DEFAULT 'local',  -- 'local', 'google', 'github'
  provider_id text,  -- OAuth provider user ID
  bio text,
  github_url text,
  linkedin_url text,
  website_url text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_email ON portfolio.users(email);
CREATE INDEX idx_users_provider ON portfolio.users(provider, provider_id);

-- ========================================
-- 3. Projects Table (Portfolio)
-- ========================================
CREATE TABLE IF NOT EXISTS portfolio.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,  -- 짧은 요약 (카드용)
  description text NOT NULL,  -- 상세 설명 (Markdown)
  thumbnail_url text,
  demo_url text,
  github_url text,
  tech_stack text[],  -- ['NestJS', 'React', 'PostgreSQL']
  tags text[],  -- ['MSA', 'Redis', 'Docker']
  status text DEFAULT 'completed',  -- 'in-progress', 'completed', 'archived'
  featured boolean DEFAULT false,  -- 메인에 노출할 프로젝트
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  start_date date,
  end_date date,
  author_id uuid NOT NULL,
  author_nickname text NOT NULL,
  author_avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_projects_author_id ON portfolio.projects(author_id);
CREATE INDEX idx_projects_featured ON portfolio.projects(featured);
CREATE INDEX idx_projects_created_at ON portfolio.projects(created_at DESC);
CREATE INDEX idx_projects_view_count ON portfolio.projects(view_count DESC);

-- Full-text search index
CREATE INDEX idx_projects_search ON portfolio.projects
  USING gin(to_tsvector('english', title || ' ' || description));

-- ========================================
-- 4. Posts Table (Blog)
-- ========================================
CREATE TABLE IF NOT EXISTS portfolio.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,  -- 짧은 요약 (목록용)
  content text NOT NULL,  -- Markdown
  thumbnail_url text,
  category text NOT NULL,  -- 'tutorial', 'essay', 'review', 'news'
  tags text[],  -- ['TypeScript', 'NestJS', 'Performance']
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  reading_time integer,  -- 예상 읽기 시간 (분)
  author_id uuid NOT NULL,
  author_nickname text NOT NULL,
  author_avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX idx_posts_author_id ON portfolio.posts(author_id);
CREATE INDEX idx_posts_category ON portfolio.posts(category);
CREATE INDEX idx_posts_is_published ON portfolio.posts(is_published);
CREATE INDEX idx_posts_created_at ON portfolio.posts(created_at DESC);
CREATE INDEX idx_posts_view_count ON portfolio.posts(view_count DESC);

-- Full-text search index
CREATE INDEX idx_posts_search ON portfolio.posts
  USING gin(to_tsvector('english', title || ' ' || content));

-- ========================================
-- 5. Comments Table (댓글/대댓글)
-- ========================================
CREATE TABLE IF NOT EXISTS portfolio.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,

  -- Polymorphic relationship (프로젝트 또는 포스트)
  target_type text NOT NULL,  -- 'project' or 'post'
  target_id uuid NOT NULL,

  -- 대댓글 지원
  parent_id uuid REFERENCES portfolio.comments(id) ON DELETE CASCADE,

  -- 익명/로그인 구분
  author_id uuid,  -- nullable for anonymous
  author_nickname text NOT NULL,
  author_email text,
  author_ip text,  -- 익명 사용자용

  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_target ON portfolio.comments(target_type, target_id);
CREATE INDEX idx_comments_parent ON portfolio.comments(parent_id);
CREATE INDEX idx_comments_author ON portfolio.comments(author_id);
CREATE INDEX idx_comments_created_at ON portfolio.comments(created_at DESC);

-- ========================================
-- 6. Likes Table (좋아요)
-- ========================================
CREATE TABLE IF NOT EXISTS portfolio.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic relationship
  target_type text NOT NULL,  -- 'project', 'post', 'comment'
  target_id uuid NOT NULL,

  -- 로그인/익명 구분
  user_id uuid,  -- nullable for anonymous
  ip_address text,  -- 익명 사용자용

  created_at timestamptz DEFAULT now(),

  -- 중복 방지
  CONSTRAINT unique_user_like UNIQUE (target_type, target_id, user_id),
  CONSTRAINT unique_ip_like UNIQUE (target_type, target_id, ip_address)
);

CREATE INDEX idx_likes_target ON portfolio.likes(target_type, target_id);
CREATE INDEX idx_likes_user ON portfolio.likes(user_id);
CREATE INDEX idx_likes_ip ON portfolio.likes(ip_address);

-- ========================================
-- 7. Views Table (조회수 - Redis 백업용)
-- ========================================
CREATE TABLE IF NOT EXISTS portfolio.views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic relationship
  target_type text NOT NULL,  -- 'project' or 'post'
  target_id uuid NOT NULL,

  ip_address text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_views_target ON portfolio.views(target_type, target_id);
CREATE INDEX idx_views_ip ON portfolio.views(ip_address);
CREATE INDEX idx_views_created_at ON portfolio.views(created_at DESC);

-- ========================================
-- 8. Triggers (자동 업데이트)
-- ========================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON portfolio.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON portfolio.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON portfolio.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 9. RLS (Row Level Security)
-- ========================================

-- Users
ALTER TABLE portfolio.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on users" ON portfolio.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON portfolio.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- Projects
ALTER TABLE portfolio.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on projects" ON portfolio.projects
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert projects" ON portfolio.projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Author can update own projects" ON portfolio.projects
  FOR UPDATE USING (true) WITH CHECK (true);

-- Posts
ALTER TABLE portfolio.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published posts" ON portfolio.posts
  FOR SELECT USING (is_published = true OR true);

CREATE POLICY "Admin can insert posts" ON portfolio.posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Author can update own posts" ON portfolio.posts
  FOR UPDATE USING (true) WITH CHECK (true);

-- Comments
ALTER TABLE portfolio.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read comments" ON portfolio.comments
  FOR SELECT USING (is_deleted = false OR true);

CREATE POLICY "Anyone can insert comments" ON portfolio.comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Author can update own comments" ON portfolio.comments
  FOR UPDATE USING (true) WITH CHECK (true);

-- Likes
ALTER TABLE portfolio.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read likes" ON portfolio.likes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert likes" ON portfolio.likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own likes" ON portfolio.likes
  FOR DELETE USING (true);

-- Views
ALTER TABLE portfolio.views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON portfolio.views
  FOR INSERT WITH CHECK (true);

-- ========================================
-- Completion Message
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Portfolio schema migration completed!';
  RAISE NOTICE '📊 Created tables: users, projects, posts, comments, likes, views';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '🔍 Full-text search indexes created';
END $$;
