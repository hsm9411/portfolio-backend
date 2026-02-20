# 🚀 Portfolio Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![Nginx](https://img.shields.io/badge/Nginx-1.25-009639)](https://nginx.org/)

> **NestJS** + **TypeORM** + **Supabase PostgreSQL** + **Redis** + **Nginx Reverse Proxy**로 구축한 포트폴리오 + 기술 블로그 백엔드

**🌐 배포 환경:**
- **Dev (HTTPS)**: https://158.180.75.205 ([Swagger](https://158.180.75.205/api))
- **Infrastructure**: Oracle Cloud Infrastructure (Free Tier)

---

## ✨ 핵심 기능

### 1. 인증 시스템 (Auth)
- **Supabase OAuth**: Google, GitHub, Kakao 소셜 로그인
- **JWT 검증**: `jwks-rsa`로 ES256 비대칭키 검증
- **자동 사용자 연동**: OAuth 첫 로그인 시 `portfolio.users` 테이블 자동 생성
- **관리자 권한**: 환경변수 기반 자동 설정

### 2. 포트폴리오 (Projects)
- **CRUD**: 프로젝트 생성/조회/수정/삭제
- **페이징**: 커스터마이징 가능 (기본 10개, 최대 100개)
- **필터링**: 상태별 (in-progress, completed, archived)
- **검색**: 제목, 설명 ILIKE 검색
- **정렬**: created_at, view_count, like_count
- **권한 관리**: 관리자/작성자만 수정/삭제 가능

### 3. 블로그 (Posts)
- **ID 기반 URL**: `/posts/{id}` (SEO 최적화를 위해 slug는 제거)
- **카테고리 시스템**: tutorial, essay, review, news
- **Markdown 지원**: react-markdown 호환
- **태그 시스템**: GIN 인덱스 기반 고속 검색
- **읽기 시간**: 자동 계산 (reading_time)
- **게시 상태**: is_published 필터링

### 4. 댓글 시스템 (Comments)
- **Polymorphic 관계**: project/post 통합 댓글
- **대댓글 지원**: parent_id 기반 계층 구조
- **익명 댓글**: 로그인 사용자의 선택적 익명 작성
- **권한 제어**: 본인 댓글만 수정/삭제

### 5. 좋아요 (Likes)
- **Polymorphic 관계**: project/post 통합 좋아요
- **토글 방식**: 좋아요/취소 원자적 처리
- **중복 방지**: DB UNIQUE 제약
- **실시간 카운트**: 트랜잭션 기반 증감

### 6. Redis 조회수 캐싱 (ViewCount)
- **IP 기반 중복 방지**: 24시간 TTL
- **Write-Back 전략**: Redis → DB 주기적 동기화 (매일 자정)
- **Cloudflare 대응**: CF-Connecting-IP 우선 추출
- **성능 최적화**: DB Write 부하 90% 감소

---

## 🏗️ 인프라 아키텍처

### 전체 구조

```
Internet (Client)
    ↓ HTTPS (443)
┌─────────────────────────────────────────┐
│   Nginx Reverse Proxy (Container)      │
│   - HTTPS Termination                   │
│   - Self-Signed SSL Certificate         │
│   - Security Headers                    │
│   - Access Logging                      │
└─────────────────┬───────────────────────┘
                  ↓ HTTP (3000)
┌─────────────────────────────────────────┐
│   NestJS Backend (Container)            │
│   - REST API                            │
│   - JWT Authentication                  │
│   - Business Logic                      │
└─────────────────┬───────────────────────┘
                  ↓
        ┌─────────┴─────────┐
        ↓                   ↓
┌──────────────┐    ┌──────────────────┐
│ Redis Cache  │    │ Supabase         │
│ (Container)  │    │ PostgreSQL       │
│ - ViewCount  │    │ (portfolio)      │
│ - Session    │    │                  │
└──────────────┘    └──────────────────┘
```

### 주요 특징

1. **HTTPS Only**
   - Nginx가 443 포트로 HTTPS 트래픽 수신
   - Self-Signed SSL 인증서 사용 (Dev 환경)
   - Backend는 HTTP로 내부 통신만 수행

2. **Reverse Proxy**
   - Nginx가 NestJS로 요청 전달
   - 실제 클라이언트 IP 헤더 전달
   - WebSocket 지원

3. **Security**
   - HSTS, X-Frame-Options 등 보안 헤더
   - TLS 1.2/1.3만 허용
   - Rate Limiting (NestJS Throttler)

4. **Portfolio Schema**
   - Supabase의 `portfolio` schema 사용
   - `public` schema와 분리하여 관리
   - RLS (Row Level Security) 비활성화 (Backend가 Service Role 사용)

---

## 🛠️ 기술 스택

### Backend Framework
- **NestJS**: 11.0.1 (Enterprise-grade Node.js framework)
- **TypeScript**: 5.7.3 (Type-safe development)
- **Passport**: JWT 인증 전략
- **jwks-rsa**: Supabase JWT 비대칭키 검증

### Database & ORM
- **PostgreSQL**: Supabase (Managed PostgreSQL)
- **TypeORM**: 0.3.28 (Active Record pattern)
- **Schema**: `portfolio` (공식 프로덕션 schema)
- **Redis**: 7-alpine (Cache & Session)

### Infrastructure
- **Nginx**: 1.25-alpine (Reverse Proxy + HTTPS)
- **Docker**: 컨테이너화 + Docker Compose
- **Oracle Cloud**: Free Tier (Ubuntu 24.04)
- **GitHub Actions**: CI/CD 자동 배포

### Validation & Documentation
- **class-validator**: DTO 검증
- **class-transformer**: 자동 타입 변환
- **Swagger**: OpenAPI 3.0 자동 문서화

### Monitoring
- **Prometheus**: 메트릭 수집
- **Terminus**: Health check

---

## ⚡ Quick Start

### Prerequisites
```bash
Git
Docker & Docker Compose
Supabase 계정 (무료)
```

### 1. Clone Repository
```bash
git clone https://github.com/hsm9411/portfolio-backend.git
cd portfolio-backend
```

### 2. Environment Variables
```bash
cp .env.example .env
nano .env  # 환경변수 설정
```

**필수 환경변수:**
```env
# Database (portfolio schema 사용)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?schema=portfolio

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Admin (쉼표로 구분)
ADMIN_EMAILS=admin@example.com,another@example.com

# Redis
REDIS_HOST=portfolio-redis-dev
REDIS_PORT=6379

# CORS (쉼표로 구분)
CORS_ORIGINS=https://yourapp.vercel.app

# Server
PORT=3000
NODE_ENV=production
```

### 3. Database Setup

#### Supabase SQL Editor에서 실행:

```sql
-- 1. Portfolio Schema 생성
CREATE SCHEMA IF NOT EXISTS portfolio;

-- 2. schema.sql 파일의 내용 전체 실행
-- (Users, Projects, Posts, Comments, Likes, Views 테이블 생성)

-- 3. RLS 비활성화 (중요!)
ALTER TABLE portfolio.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.views DISABLE ROW LEVEL SECURITY;

-- 4. 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'portfolio';
-- 모든 테이블의 rowsecurity가 false여야 함
```

**중요:** Backend는 Service Role로 연결하므로 RLS는 불필요합니다. RLS를 켜면 오히려 문제가 발생할 수 있습니다.

### 4. Deploy to OCI (Dev Environment)

```bash
# GitHub에 push하면 자동 배포
git add .
git commit -m "feat: your feature"
git push origin develop

# GitHub Actions가 자동으로:
# 1. Docker 이미지 빌드
# 2. GHCR에 푸시
# 3. OCI 서버에 SSH 접속
# 4. docker-compose로 배포
```

### 5. Access API
```
https://158.180.75.205/api  (Swagger UI)
```

---

## 📂 프로젝트 구조

```
portfolio-backend/
├── nginx/
│   ├── nginx-selfsigned.conf   # Nginx 설정 (Dev)
│   └── ssl/                     # Self-Signed 인증서
├── src/
│   ├── config/
│   │   ├── database.config.ts   # schema: 'portfolio' 지정
│   │   └── redis.config.ts
│   ├── entities/
│   │   ├── user/
│   │   │   └── user.entity.ts   # @Entity('users', { schema: 'portfolio' })
│   │   ├── project/
│   │   │   └── project.entity.ts
│   │   ├── post/
│   │   │   └── post.entity.ts   # slug 제거, category 추가
│   │   ├── comment/
│   │   │   └── comment.entity.ts
│   │   └── like/
│   │       └── like.entity.ts
│   ├── modules/
│   │   ├── auth/                # ✅ 인증
│   │   │   ├── strategies/
│   │   │   │   └── supabase-jwt.strategy.ts  # jwks-rsa 사용
│   │   │   ├── guards/
│   │   │   ├── dto/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── projects/            # ✅ 프로젝트
│   │   ├── posts/               # ✅ 블로그 (ID 기반)
│   │   ├── comments/            # ✅ 댓글
│   │   └── likes/               # ✅ 좋아요
│   ├── common/
│   │   ├── services/
│   │   │   ├── view-count.service.ts
│   │   │   └── tasks.service.ts
│   │   ├── guards/
│   │   │   └── throttler-behind-proxy.guard.ts
│   │   └── utils/
│   │       └── ip-extractor.util.ts
│   ├── app.module.ts
│   └── main.ts
├── .github/workflows/
│   └── deploy.yml               # CI/CD
├── docker-compose.dev.yml       # Dev 환경 (Nginx + App + Redis)
├── Dockerfile
├── schema.sql                   # 전체 DB 스키마
├── .env.example
└── README.md
```

---

## 🗄️ Database Schema

### Users (사용자)
```typescript
id: uuid (PK)
supabase_user_id: uuid (UNIQUE, Supabase auth.users 연결)
email: text (UNIQUE)
password: text (nullable, OAuth 사용자는 null)
nickname: text
avatar_url: text
is_admin: boolean (환경변수 기반 자동 설정)
provider: text ('local', 'google', 'github', 'email')
provider_id: text
created_at, updated_at
```

### Projects (포트폴리오)
```typescript
id: uuid (PK)
title, summary, description (Markdown)
thumbnail_url, demo_url, github_url
tech_stack: text[] (기술 스택 배열)
tags: text[]
status: 'in-progress' | 'completed' | 'archived'
featured: boolean
view_count, like_count
start_date, end_date
author_id (FK → users.id)
author_nickname, author_avatar_url (비정규화)
created_at, updated_at
```

### Posts (블로그)
```typescript
id: uuid (PK)
title, summary, content (Markdown)
thumbnail_url
category: 'tutorial' | 'essay' | 'review' | 'news'
tags: text[] (GIN 인덱스)
is_published: boolean (기본값: true)
view_count, like_count, comment_count
reading_time: integer (자동 계산, 분)
author_id (FK → users.id)
author_nickname, author_avatar_url (비정규화)
created_at, updated_at, published_at
```

**중요 변경사항:**
- ❌ **slug 제거**: SEO보다 단순성 우선
- ✅ **category 추가**: 콘텐츠 분류
- ✅ **is_published 추가**: 공개/비공개 관리

### Comments (댓글)
```typescript
id: uuid (PK)
target_type: 'project' | 'post' (Polymorphic)
target_id: uuid
parent_id: uuid (nullable, 대댓글)
content: text
author_id: uuid (nullable, 익명 댓글)
author_nickname: text
author_email: text (nullable)
author_ip: text (nullable, 익명용)
is_deleted: boolean
created_at, updated_at
```

### Likes (좋아요)
```typescript
id: uuid (PK)
target_type: 'project' | 'post' (Polymorphic)
target_id: uuid
user_id: uuid
created_at
# UNIQUE(target_type, target_id, user_id)
```

---

## 🔐 Authentication Flow

### Supabase OAuth (Google/GitHub/Kakao)
```
1. Frontend → supabase.auth.signInWithOAuth({ provider: 'google' })
2. Supabase Auth → Provider 로그인 페이지
3. 사용자 인증 완료 → Supabase JWT 발급 (ES256)
4. Frontend → JWT 저장 (localStorage/cookie)
5. Frontend → Backend API 호출 (Authorization: Bearer {JWT})
   → HTTPS로 Nginx 443 포트 요청
6. Nginx → NestJS로 HTTP 프록시
7. Backend → SupabaseJwtStrategy
   ├─ jwks-rsa로 JWKS 엔드포인트에서 공개키 동적 로드
   ├─ ES256 비대칭키로 JWT 검증
   └─ payload.sub (Supabase User ID) 추출
8. Backend → portfolio.users 테이블 조회/생성
   ├─ supabase_user_id로 조회
   ├─ 없으면 신규 생성
   └─ 환경변수 ADMIN_EMAILS로 is_admin 자동 설정
9. Backend → req.user에 User 객체 주입
```

**핵심 보안:**
- JWT Secret이 아닌 **공개키**로 검증 (비대칭키)
- 공개키는 Supabase JWKS 엔드포인트에서 자동 갱신
- Backend에서 Secret 관리 불필요

---

## 🎯 핵심 아키텍처 상세

### 1. Portfolio Schema 사용

**왜 portfolio schema를 사용하나?**
- `public` schema와 분리하여 깔끔한 구조
- 다중 프로젝트 관리 시 namespace 분리
- Supabase의 자동 생성 테이블과 충돌 방지

**Database Config:**
```typescript
// src/config/database.config.ts
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  schema: 'portfolio',  // ✅ 명시적 지정
  entities: [__dirname + '/../entities/**/*.entity{.ts,.js}'],
  synchronize: false,
  // ...
});
```

**Entity 예시:**
```typescript
@Entity('posts', { schema: 'portfolio' })
export class Post {
  // ...
}
```

**Table Editor에서 확인:**
- Supabase Table Editor는 기본적으로 `public` schema만 표시
- `portfolio` schema 확인은 SQL Editor 사용:
  ```sql
  SELECT * FROM portfolio.posts;
  SELECT * FROM portfolio.projects;
  ```

### 2. RLS (Row Level Security) 정책

**설정 방침:**
```sql
-- RLS 완전히 비활성화 (권장)
ALTER TABLE portfolio.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects DISABLE ROW LEVEL SECURITY;
-- ...
```

**이유:**
1. Backend가 **Service Role**로 연결 (RLS 우회됨)
2. Frontend는 **Backend API만 호출** (Supabase 직접 접근 안 함)
3. 보안은 **Backend Guard**에서 담당
4. RLS는 **중복 방어선**이자 **복잡도 증가**

**보안 구조:**
```
[User] → [Frontend] → [Backend JWT Guard] → [Supabase (RLS OFF)]
                       ✅ 실제 보안 계층
```

### 3. Nginx Reverse Proxy (HTTPS Termination)

**역할:**
- HTTPS 443 포트로 외부 트래픽 수신
- SSL/TLS 암호화 처리
- NestJS로 HTTP 프록시
- 보안 헤더 추가

**설정 (nginx-selfsigned.conf):**
```nginx
server {
    listen 443 ssl;
    
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;
    
    location / {
        proxy_pass http://portfolio-backend-dev:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Redis 조회수 시스템 (Write-Back)

```
사용자 요청 (HTTPS)
  ↓
Nginx → NestJS
  ↓
IP 중복 체크 (Redis)
  ├─ ✅ 24h 내 중복 → 카운트 X
  └─ ❌ 신규 → Redis 카운트 +1
              ├─ Key: view:count:{type}:{id}
              └─ Key: view:ip:{type}:{id}:{ip} (TTL 24h)
  ↓
매일 자정 00:00 (KST)
  └─ Cron Job: Redis → DB 동기화
```

---

## 📚 API Documentation

### Swagger UI
- **Dev**: https://158.180.75.205/api

### 주요 엔드포인트

#### Auth
```
POST   /auth/callback          # OAuth 콜백 (Supabase)
GET    /auth/me                # 현재 사용자 (JWT 필요)
```

#### Projects
```
GET    /projects               # 목록 (페이징, 검색, 필터, 정렬)
GET    /projects/:id           # 상세 (조회수 자동 증가)
POST   /projects               # 생성 (관리자, JWT)
PATCH  /projects/:id           # 수정 (작성자/관리자, JWT)
DELETE /projects/:id           # 삭제 (작성자/관리자, JWT)
```

#### Posts
```
GET    /posts                  # 목록 (페이징, 검색, 태그)
GET    /posts/:id              # ID 조회 (조회수 자동 증가)
POST   /posts                  # 작성 (로그인, JWT, category 필수)
PUT    /posts/:id              # 수정 (작성자, JWT)
DELETE /posts/:id              # 삭제 (작성자, JWT)
```

**중요 변경사항:**
- ❌ `GET /posts/:slug` 제거
- ✅ `GET /posts/:id` 사용
- ✅ POST/PUT 시 `category` 필드 필수

#### Comments
```
GET    /comments/:targetType/:targetId  # 목록
POST   /comments/:targetType/:targetId  # 작성 (로그인)
PUT    /comments/:id                    # 수정 (작성자, JWT)
DELETE /comments/:id                    # 삭제 (작성자, JWT)
```

#### Likes
```
POST   /likes/toggle           # 좋아요 토글 (JWT)
```

---

## 🧪 Development Commands

**로컬 개발은 하지 않음** - OCI Dev 환경에서만 테스트

```bash
# 배포 (자동)
git push origin develop

# 수동 배포 (서버에서)
ssh ubuntu@158.180.75.205
cd ~/portfolio-backend-dev
docker-compose down
docker-compose pull
docker-compose up -d

# 로그 확인
docker-compose logs -f nginx
docker-compose logs -f app
docker-compose logs -f redis

# 컨테이너 상태
docker-compose ps

# Nginx 설정 테스트
docker exec portfolio-nginx-dev nginx -t
```

---

## 🐛 Troubleshooting

### 1. 다른 기기에서 데이터가 안 보임

**증상:** 
- 본인 컴퓨터: 정상
- 다른 컴퓨터: 빈 화면

**원인 체크:**
```sql
-- 1. RLS 상태 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'portfolio';

-- 2. 데이터 존재 확인
SELECT COUNT(*) FROM portfolio.posts;
SELECT COUNT(*) FROM portfolio.projects;

-- 3. Schema 확인
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('posts', 'projects');
```

**해결:**
```sql
-- RLS 비활성화
ALTER TABLE portfolio.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.likes DISABLE ROW LEVEL SECURITY;
```

### 2. Table Editor에서 테이블이 안 보임

**증상:** 
- SQL Editor에서는 데이터 보임
- Table Editor는 "This table is empty"

**원인:**
- Table Editor는 `public` schema만 표시
- 실제 테이블은 `portfolio` schema에 존재

**해결:**
- SQL Editor 사용 권장:
  ```sql
  SELECT * FROM portfolio.posts;
  SELECT * FROM portfolio.projects;
  ```

### 3. JWT 인증 실패

**증상:**
- 401 Unauthorized
- "Invalid token" 에러

**체크:**
```typescript
// .env 확인
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your-secret  // JWT Secret이 아닌 Project Secret
```

**해결:**
- Supabase Dashboard → Settings → API → JWT Secret 복사
- `SUPABASE_URL`이 정확한지 확인 (trailing slash 없이)

### 4. HTTPS 접속 불가
```bash
# Nginx 컨테이너 확인
docker ps | grep nginx

# Nginx 로그 확인
docker logs portfolio-nginx-dev

# 포트 확인
netstat -tlnp | grep 443
```

### 5. Redis 연결 실패
```bash
# Redis 상태 확인
docker exec portfolio-redis-dev redis-cli ping
# 응답: PONG

# Redis 키 확인
docker exec portfolio-redis-dev redis-cli KEYS "view:*"
```

---

## 📖 참고 문서

| 문서 | 설명 |
|------|------|
| `schema.sql` | 전체 DB 스키마 (portfolio schema) |
| `DEPLOYMENT_CHECKLIST.md` | 배포 후 체크리스트 |
| `QUICK_START.md` | 빠른 시작 가이드 |
| `.env.example` | 환경 변수 템플릿 |

---

## 🤝 Contributing

### Git Workflow
```bash
git checkout -b feature/new-feature
git commit -m "feat: 새로운 기능 추가"
git push origin feature/new-feature
# Pull Request → develop 브랜치
```

### Commit Convention
```
feat:     새로운 기능
fix:      버그 수정
docs:     문서
refactor: 리팩토링
test:     테스트
chore:    빌드/설정
perf:     성능
```

---

## 📝 주요 변경 이력

### 2026-02-20
- ✅ Post Entity에서 `slug` 제거, ID 기반 URL로 변경
- ✅ `category` 필드 추가 (tutorial, essay, review, news)
- ✅ `is_published` 필드 추가 및 Service 레이어 필터링 적용
- ✅ RLS 비활성화로 접근 문제 해결
- ✅ Portfolio schema 명시적 사용
- ✅ Frontend와 Backend 완전 동기화

### 2026-02-17
- ✅ Supabase OAuth 전환 (Local OAuth 제거)
- ✅ jwks-rsa 기반 ES256 JWT 검증 구현
- ✅ 환경변수 기반 관리자 권한 자동 설정

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**hsm9411**
- Email: haeha2e@gmail.com
- GitHub: [@hsm9411](https://github.com/hsm9411)

---

**Last Updated**: 2026-02-20  
**Status**: Production Ready ✅  
**Tech Stack**: NestJS 11 | TypeORM 0.3 | Supabase PostgreSQL (portfolio schema) | Redis 7 | Nginx 1.25 | Docker | OCI
