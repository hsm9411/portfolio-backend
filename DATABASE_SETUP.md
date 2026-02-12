# Database Schema Setup for Supabase

## 📋 전체 스키마 생성 SQL

Supabase SQL Editor에서 아래 SQL을 **순서대로** 실행하세요.

---

## 1. Users 테이블

```sql
-- Users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  nickname VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  is_admin BOOLEAN DEFAULT false,
  supabase_user_id UUID UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON users(supabase_user_id);

-- Users updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS '사용자 정보 (OAuth + Local)';
```

---

## 2. Projects 테이블

```sql
-- Projects 테이블 생성
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url VARCHAR(500),
  github_url VARCHAR(500),
  demo_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'in-progress',
  tech_stack TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  author_id UUID NOT NULL,
  author_nickname VARCHAR(100) NOT NULL,
  author_avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_author_id ON projects(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Projects updated_at 트리거
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE projects IS '포트폴리오 프로젝트';
```

---

## 3. Posts 테이블

```sql
-- Posts 테이블 생성
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(300),
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  author_id UUID NOT NULL,
  author_nickname VARCHAR(100) NOT NULL,
  author_avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Posts tags GIN 인덱스 (배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);

-- Posts updated_at 트리거
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE posts IS '블로그 포스트';
COMMENT ON COLUMN posts.slug IS 'SEO 친화적 URL (예: nestjs-tutorial)';
COMMENT ON COLUMN posts.tags IS '태그 배열 (GIN 인덱스로 검색 최적화)';
```

---

## 4. Comments 테이블

```sql
-- Comments 테이블 생성
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('project', 'post')),
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_parent_comment FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Comments 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at ASC);

-- Comments updated_at 트리거
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE comments IS '댓글 (Polymorphic: project/post)';
COMMENT ON COLUMN comments.is_anonymous IS '로그인 기반 익명 (작성자는 추적 가능)';
COMMENT ON COLUMN comments.parent_id IS '대댓글용 부모 댓글 ID';
```

---

## 5. Likes 테이블

```sql
-- Likes 테이블 생성
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('project', 'post')),
  target_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_like UNIQUE (target_type, target_id, user_id)
);

-- Likes 인덱스
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

COMMENT ON TABLE likes IS '좋아요 (Polymorphic: project/post)';
COMMENT ON CONSTRAINT unique_like ON likes IS '사용자당 1회만 좋아요 가능';
```

---

## 6. 스키마 확인

```sql
-- 모든 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 모든 인덱스 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 모든 트리거 확인
SELECT 
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

## 7. 테스트 데이터 삽입 (선택 사항)

```sql
-- 테스트 사용자 생성
INSERT INTO users (email, nickname, is_admin)
VALUES ('admin@test.com', 'Admin', true)
ON CONFLICT (email) DO NOTHING;

-- 테스트 프로젝트 생성
INSERT INTO projects (
  title, 
  description, 
  author_id,
  author_nickname,
  status,
  tech_stack
)
SELECT 
  'Sample Project',
  'This is a sample portfolio project',
  id,
  nickname,
  'completed',
  ARRAY['NestJS', 'TypeScript', 'PostgreSQL']
FROM users
WHERE email = 'admin@test.com'
ON CONFLICT DO NOTHING;

-- 테스트 포스트 생성
INSERT INTO posts (
  slug,
  title,
  content,
  summary,
  author_id,
  author_nickname,
  tags
)
SELECT 
  'sample-post',
  'Sample Blog Post',
  'This is sample content for testing.',
  'Sample summary',
  id,
  nickname,
  ARRAY['NestJS', 'Backend']
FROM users
WHERE email = 'admin@test.com'
ON CONFLICT (slug) DO NOTHING;
```

---

## 📝 실행 순서

1. **Users 테이블** (1번 실행)
2. **Projects 테이블** (2번 실행)
3. **Posts 테이블** (3번 실행)
4. **Comments 테이블** (4번 실행)
5. **Likes 테이블** (5번 실행)
6. **스키마 확인** (6번 실행 - 검증용)
7. **테스트 데이터** (7번 실행 - 선택 사항)

---

## ⚠️ 주의사항

### Foreign Key 제약조건
현재 스키마는 **느슨한 결합**을 사용합니다:
- `author_id`는 문자열(UUID)로 저장
- 실제 Foreign Key 제약 없음 (마이크로서비스 패턴)

만약 **강한 결합**을 원한다면:

```sql
-- Projects에 FK 추가
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_author
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- Posts에 FK 추가
ALTER TABLE posts
  ADD CONSTRAINT fk_posts_author
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- Comments에 FK 추가
ALTER TABLE comments
  ADD CONSTRAINT fk_comments_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Likes에 FK 추가
ALTER TABLE likes
  ADD CONSTRAINT fk_likes_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## 🔍 트러블슈팅

### 테이블이 이미 존재하는 경우
```sql
-- 모든 테이블 삭제 (주의!)
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- 그 후 1번부터 다시 실행
```

### GIN 인덱스 에러
```sql
-- 기존 인덱스 삭제 후 재생성
DROP INDEX IF EXISTS idx_posts_tags;
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
```
