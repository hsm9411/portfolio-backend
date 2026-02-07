# Portfolio Backend - AI Memory

> **프로젝트 시작**: 2026-02-07
> **현재 상태**: 기본 설정 완료 ✅
> **다음 작업**: Auth 모듈 구현

---

## 📋 프로젝트 개요

### 목적
기존 게시판 프로젝트(board-supabase)와 **별도로** 새로운 포트폴리오 + 기술 블로그 백엔드 구축

### 기술 스택
- **Framework**: NestJS 11.x
- **Database**: Supabase PostgreSQL (스키마: `portfolio`)
- **Cache**: Redis
- **Auth**: JWT + OAuth (Google, GitHub)
- **API Docs**: Swagger
- **Monitoring**: Prometheus
- **Deployment**: Docker Compose

### 프론트엔드
- **레포지토리**: `C:\hsm9411\portfolio-frontend` (이미 생성됨)
- **백엔드**: `C:\hsm9411\portfolio-backend` (현재 프로젝트)

---

## 🏗️ 아키텍처

```
portfolio-backend/
├── src/
│   ├── config/              # ✅ 설정 파일
│   │   ├── database.config.ts
│   │   └── redis.config.ts
│   ├── entities/            # ✅ TypeORM 엔티티
│   │   ├── user/user.entity.ts
│   │   ├── project/project.entity.ts
│   │   ├── post/post.entity.ts
│   │   ├── comment/comment.entity.ts
│   │   ├── like/like.entity.ts
│   │   └── view/view.entity.ts
│   ├── modules/             # ⏳ 기능 모듈 (TODO)
│   │   ├── auth/            # OAuth + JWT
│   │   ├── projects/        # 프로젝트 포트폴리오
│   │   ├── posts/           # 블로그 글
│   │   ├── comments/        # 댓글/대댓글
│   │   └── likes/           # 좋아요
│   ├── app.module.ts        # ✅ 메인 모듈
│   └── main.ts              # ✅ 부트스트랩
├── .env.example             # ✅ 환경 변수 예시
├── .gitignore               # ✅ Git 무시 파일
└── schema.sql               # ✅ DB 초기화 SQL
```

---

## 🗄️ 데이터베이스 스키마

### Schema: `portfolio`

#### 1. **users** (사용자)
- OAuth 지원 (`provider`: local/google/github)
- JWT 인증용
- 관리자 플래그 (`is_admin`)

**주요 필드**:
```sql
id, email, password, nickname, avatar_url,
provider, provider_id, bio, github_url, linkedin_url,
is_admin, created_at, updated_at
```

#### 2. **projects** (프로젝트 포트폴리오)
- 프로젝트 소개 및 상세 정보
- 기술 스택, 태그, 데모/깃허브 URL
- 조회수, 좋아요 카운터

**주요 필드**:
```sql
id, title, summary, description, thumbnail_url,
demo_url, github_url, tech_stack[], tags[], status,
featured, view_count, like_count, start_date, end_date,
author_id, author_nickname, author_avatar_url
```

#### 3. **posts** (블로그 글)
- 마크다운 지원
- 카테고리 (tutorial/essay/review/news)
- 태그, 썸네일, 예상 읽기 시간

**주요 필드**:
```sql
id, title, summary, content, thumbnail_url, category,
tags[], is_published, view_count, like_count,
comment_count, reading_time, author_id
```

#### 4. **comments** (댓글/대댓글)
- **Polymorphic**: 프로젝트 또는 포스트에 댓글
- 대댓글 지원 (`parent_id`)
- 익명/로그인 구분

**주요 필드**:
```sql
id, content, target_type, target_id, parent_id,
author_id (nullable), author_nickname, author_ip
```

#### 5. **likes** (좋아요)
- **Polymorphic**: 프로젝트/포스트/댓글에 좋아요
- 로그인: `user_id` 기반
- 익명: `ip_address` 기반
- 중복 방지 (UNIQUE 제약)

**주요 필드**:
```sql
id, target_type, target_id, user_id, ip_address
```

#### 6. **views** (조회수)
- Redis 캐시 백업용
- IP 기반 중복 카운트 방지

---

## ✅ 완료된 작업 (2026-02-07)

### 1. 프로젝트 초기화
- ✅ NestJS CLI로 프로젝트 생성
- ✅ 패키지 설치:
  - TypeORM + PostgreSQL
  - JWT + Passport (OAuth)
  - Redis (cache-manager-redis-yet)
  - Swagger
  - Prometheus
  - Class-validator/transformer

### 2. 설정 파일
- ✅ `.env.example`: 환경 변수 템플릿
- ✅ `.gitignore`: Git 무시 파일
- ✅ `config/database.config.ts`: TypeORM 설정
- ✅ `config/redis.config.ts`: Redis 캐시 설정

### 3. 데이터베이스
- ✅ `schema.sql`: DB 초기화 SQL 작성
- ✅ Entity 생성 (User, Project, Post, Comment, Like, View)
- ✅ 인덱스 최적화 (Full-text search 포함)
- ✅ RLS (Row Level Security) 정책

### 4. 기본 설정
- ✅ `main.ts`: Swagger, CORS, Validation Pipe 설정
- ✅ `app.module.ts`: TypeORM, Redis, Prometheus 통합

---

## 🚧 다음 작업 (우선순위)

### Task #2: Auth 모듈 구현 (진행 예정)
- [ ] Local 회원가입/로그인 (JWT)
- [ ] Google OAuth 2.0
- [ ] GitHub OAuth
- [ ] JWT Strategy & Guard
- [ ] 사용자 정보 조회 API

### Task #3: Projects 모듈 구현
- [ ] 프로젝트 CRUD
- [ ] 조회수 카운터 (Redis)
- [ ] 좋아요 기능
- [ ] 필터링 (status, featured, tags)
- [ ] 검색 (Full-text)

### Task #4: Posts 모듈 구현
- [ ] 블로그 글 CRUD
- [ ] 카테고리/태그 필터링
- [ ] 조회수 카운터
- [ ] 좋아요 기능
- [ ] 마크다운 파싱 (읽기 시간 계산)

### Task #5: Comments 모듈 구현
- [ ] 댓글 CRUD
- [ ] 대댓글 (parent_id)
- [ ] 익명/로그인 구분
- [ ] 소프트 삭제 (is_deleted)

### Task #6: Likes 모듈 구현
- [ ] 좋아요 토글 (추가/취소)
- [ ] 중복 방지 (user_id 또는 IP)
- [ ] 카운터 동기화

### Task #7: Docker 및 배포
- [ ] Dockerfile 작성
- [ ] docker-compose.yml (백엔드 + Redis)
- [ ] nginx 설정 (API Gateway)
- [ ] GitHub Actions CI/CD

---

## 💡 핵심 설계 결정

### 1. **Polymorphic Relationship**
- `target_type` + `target_id`로 여러 타입 지원
- 예: 댓글은 프로젝트 또는 포스트에 달림
- 예: 좋아요는 프로젝트/포스트/댓글에 가능

### 2. **비정규화 (Denormalization)**
- 작성자 정보(`author_nickname`, `author_avatar_url`)를 직접 저장
- MSA 패턴에서 서비스 간 JOIN 불가능 문제 해결
- 조회 성능 향상

### 3. **조회수 카운터**
- **1차 캐시**: Redis (빠른 응답)
- **2차 저장**: PostgreSQL `views` 테이블 (백업)
- IP 기반 중복 방지 (1시간 TTL)

### 4. **좋아요 중복 방지**
- 로그인 사용자: `user_id` UNIQUE 제약
- 익명 사용자: `ip_address` UNIQUE 제약

### 5. **Full-text Search**
- PostgreSQL GIN 인덱스 활용
- `to_tsvector('english', title || ' ' || content)`

---

## 🔧 개발 명령어

### 로컬 개발
```bash
# 의존성 설치
cd C:\hsm9411\portfolio-backend
npm install

# 개발 서버 실행
npm run start:dev

# Swagger 접속
# http://localhost:3000/api
```

### 테스트
```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e
```

### 데이터베이스
```bash
# 1. Supabase SQL Editor에서 schema.sql 실행
# 2. .env 파일 생성 (DATABASE_URL 설정)
```

---

## 📝 환경 변수 (.env)

```env
# Database
DATABASE_URL=postgresql://postgres:password@host:5432/postgres?schema=portfolio

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

---

## 🐛 알려진 이슈

### 없음 (프로젝트 초기 단계)

---

## 📚 참고 자료

- **NestJS 공식 문서**: https://docs.nestjs.com/
- **TypeORM 공식 문서**: https://typeorm.io/
- **Supabase 공식 문서**: https://supabase.com/docs
- **Passport OAuth 가이드**: https://www.passportjs.org/

---

## 🎯 프로젝트 목표

1. **포트폴리오 사이트**: 프로젝트 소개, 기술 스택, 데모 링크
2. **기술 블로그**: 카테고리별 글, 마크다운 지원, 태그 검색
3. **소셜 기능**: 조회수, 좋아요, 댓글/대댓글
4. **OAuth 인증**: Google, GitHub 간편 로그인
5. **검색 최적화**: Full-text search, 필터링
6. **성능 최적화**: Redis 캐싱, DB 인덱싱

---

## 📌 다음 세션 시작 전 체크리스트

- [ ] Task #2 (Auth 모듈) 상태 확인
- [ ] 환경 변수 설정 완료 확인
- [ ] Supabase DB 스키마 적용 확인
- [ ] Redis 서버 실행 확인

---

**마지막 업데이트**: 2026-02-07 (기본 설정 완료)
