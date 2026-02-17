# 🚀 Portfolio Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

> **NestJS** + **TypeORM** + **Supabase PostgreSQL** + **Redis**로 구축한 포트폴리오 + 기술 블로그 백엔드

**🌐 배포 환경:**
- **Dev**: http://158.180.75.205:3001 ([Swagger](http://158.180.75.205:3001/api))
- **Prod**: http://158.180.75.205:3000 ([Swagger](http://158.180.75.205:3000/api))

---

## ✨ 핵심 기능

### 1. 인증 시스템 (Auth)
- **Supabase OAuth**: Google, GitHub, Kakao 소셜 로그인
- **Local Auth**: 이메일/비밀번호 회원가입 + 로그인
- **JWT 검증**: Supabase JWT + Local JWT 이중 지원
- **자동 사용자 연동**: OAuth 첫 로그인 시 users 테이블 자동 생성

### 2. 포트폴리오 (Projects)
- **CRUD**: 프로젝트 생성/조회/수정/삭제
- **페이징**: 커스터마이징 가능 (기본 10개, 최대 100개)
- **필터링**: 상태별 (in-progress, completed, archived)
- **검색**: 제목, 설명 ILIKE 검색
- **정렬**: created_at, view_count, like_count
- **권한 관리**: 관리자/작성자만 수정/삭제 가능

### 3. 블로그 (Posts)
- **Slug 자동생성**: SEO 친화적 URL (unique 제약)
- **Markdown 지원**: react-markdown 호환
- **태그 시스템**: GIN 인덱스 기반 고속 검색
- **읽기 시간**: 자동 계산 (read_time_minutes)
- **메타 정보**: summary 필드 (메타 태그용)

### 4. 댓글 시스템 (Comments)
- **Polymorphic 관계**: project/post 통합 댓글
- **대댓글 지원**: parent_id 기반 계층 구조
- **인증 기반 익명**: 로그인 상태에서 익명 댓글 가능
- **익명 마스킹**: 작성자/관리자에게만 원본 정보 표시
- **권한 제어**: 본인 댓글만 수정/삭제

### 5. 좋아요 (Likes)
- **Polymorphic 관계**: project/post 통합 좋아요
- **토글 방식**: 좋아요/취소 원자적 처리
- **중복 방지**: DB UNIQUE 제약 + 서비스 로직
- **실시간 카운트**: 트랜잭션 기반 증감

### 6. Redis 조회수 캐싱 (ViewCount)
- **IP 기반 중복 방지**: 24시간 TTL
- **Write-Back 전략**: Redis → DB 주기적 동기화 (매일 자정)
- **Cloudflare 대응**: CF-Connecting-IP 우선 추출
- **성능 최적화**: DB Write 부하 90% 감소

---

## 🛠️ 기술 스택

### Backend Framework
- **NestJS**: 11.0.1 (Enterprise-grade Node.js framework)
- **TypeScript**: 5.7.3 (Type-safe development)
- **Passport**: JWT + OAuth 인증 전략

### Database & ORM
- **PostgreSQL**: Supabase (Managed PostgreSQL)
- **TypeORM**: 0.3.28 (Active Record pattern)
- **Redis**: 7-alpine (Cache & Session)

### Validation & Documentation
- **class-validator**: DTO 검증
- **class-transformer**: 자동 타입 변환
- **Swagger**: OpenAPI 3.0 자동 문서화

### DevOps & Monitoring
- **Docker**: 컨테이너화 + Docker Compose
- **GitHub Actions**: CI/CD 자동 배포
- **Prometheus**: 메트릭 수집
- **Terminus**: Health check

### Infrastructure
- **Oracle Cloud**: Free Tier (Ubuntu 24.04)
- **Cloudflare**: Proxy + DDoS 보호
- **Vercel**: Frontend 배포

---

## ⚡ Quick Start

### Prerequisites
```bash
Node.js 22+
Supabase 계정 (무료)
Docker (권장) 또는 Redis 설치
```

### 1. Installation
```bash
# 레포지토리 클론
git clone https://github.com/hsm9411/portfolio-backend.git
cd portfolio-backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 2. Environment Variables
```env
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# JWT (Local)
JWT_SECRET=your-local-jwt-secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS (쉼표로 구분)
CORS_ORIGINS=http://localhost:5173,https://yourapp.vercel.app

# Server
PORT=3000
NODE_ENV=development
```

### 3. Database Setup
Supabase SQL Editor에서 **DATABASE_SETUP.md** 파일의 SQL을 순서대로 실행:
1. Users 테이블
2. Projects 테이블
3. Posts 테이블 (**GIN 인덱스 필수**)
4. Comments 테이블
5. Likes 테이블

### 4. Run Development Server
```bash
# Redis 시작 (Docker)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 개발 서버 시작
npm run start:dev

# Swagger 접속
# http://localhost:3000/api
```

---

## 📂 프로젝트 구조

```
portfolio-backend/
├── src/
│   ├── config/                  # 설정 파일
│   │   ├── database.config.ts   # TypeORM 설정
│   │   └── redis.config.ts      # Redis 설정
│   ├── entities/                # TypeORM 엔티티
│   │   ├── user.entity.ts
│   │   ├── project.entity.ts
│   │   ├── post.entity.ts
│   │   ├── comment.entity.ts
│   │   └── like.entity.ts
│   ├── modules/                 # 기능 모듈
│   │   ├── auth/                # ✅ 인증 (Supabase OAuth + Local)
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── supabase-jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   ├── dto/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── projects/            # ✅ 프로젝트 CRUD
│   │   ├── posts/               # ✅ 블로그 CRUD
│   │   ├── comments/            # ✅ 댓글 시스템
│   │   └── likes/               # ✅ 좋아요 시스템
│   ├── common/                  # 공통 모듈
│   │   ├── services/
│   │   │   ├── view-count.service.ts  # Redis 조회수
│   │   │   └── tasks.service.ts       # Cron Jobs
│   │   ├── guards/
│   │   │   └── throttler-behind-proxy.guard.ts
│   │   └── utils/
│   │       └── ip-extractor.util.ts
│   ├── app.module.ts
│   └── main.ts
├── .github/workflows/
│   └── deploy.yml               # CI/CD 파이프라인
├── docker-compose.yml
├── Dockerfile
├── DATABASE_SETUP.md            # 필수 참고 문서
├── .env.example
└── README.md
```

---

## 🗄️ Database Schema

### Users (사용자)
```typescript
id: uuid (PK)
email: text (UNIQUE)
password: text (nullable, OAuth 사용자는 null)
nickname: text
avatar_url: text
is_admin: boolean
supabase_user_id: uuid (UNIQUE, Supabase auth.users 연결)
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
view_count, like_count
author_id (FK → users)
author_nickname, author_avatar_url (비정규화)
created_at, updated_at
```

### Posts (블로그)
```typescript
id: uuid (PK)
slug: text (UNIQUE, SEO 친화적)
title, content (Markdown), summary
tags: text[] (GIN 인덱스)
read_time_minutes (자동 계산)
view_count, like_count
author_id (FK → users)
author_nickname, author_avatar_url (비정규화)
created_at, updated_at
```

### Comments (댓글)
```typescript
id: uuid (PK)
target_type: 'project' | 'post' (Polymorphic)
target_id: uuid
parent_id: uuid (nullable, 대댓글)
content: text
user_id: uuid
is_anonymous: boolean
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
2. Supabase Auth → Google 로그인 페이지
3. 사용자 인증 완료 → Supabase JWT 발급
4. Frontend → JWT 저장 (localStorage/cookie)
5. Frontend → Backend API 호출 (Authorization: Bearer {JWT})
6. Backend → SupabaseJwtStrategy가 JWT 검증
7. Backend → users 테이블 자동 생성/조회 (supabase_user_id 연결)
8. Backend → req.user에 User 객체 주입
```

### Local Auth (Email/Password)
```
1. Frontend → POST /auth/register or /auth/login
2. Backend → bcrypt 비밀번호 검증
3. Backend → Local JWT 발급 (JWT_SECRET 사용)
4. Frontend → JWT 저장
5. 이후 동일한 방식으로 API 호출
```

---

## 🎯 핵심 아키텍처

### Redis 조회수 시스템 (Write-Back)
```
사용자 요청
  ↓
IP 중복 체크 (Redis)
  ├─ ✅ 24h 내 중복 → 카운트 X
  └─ ❌ 신규 → Redis 카운트 +1
              ├─ Key: view:count:{type}:{id}
              └─ Key: view:ip:{type}:{id}:{ip} (TTL 24h)
  ↓
매일 자정 00:00 (KST)
  └─ Cron Job: Redis → DB 동기화
     └─ ViewCountService.syncViewCountsToDB()
```

**장점:**
- DB Write 부하 90% 감소
- IP 기반 중복 방지 (24시간)
- Cloudflare Proxy 대응 (CF-Connecting-IP)

### Cloudflare Proxy 대응
```typescript
// IP 추출 우선순위
1. CF-Connecting-IP       // Cloudflare 실제 IP
2. X-Real-IP
3. X-Forwarded-For
4. req.ip                 // Express 기본

// Trust Proxy 설정
app.set('trust proxy', true);

// Rate Limiting
ThrottlerBehindProxyGuard: CF-Connecting-IP 기반 제한
60회/분 (글로벌)
```

---

## 🚀 Deployment

### CI/CD 자동 배포 (GitHub Actions)
```bash
# Development 환경 (develop 브랜치)
git push origin develop
# → http://158.180.75.205:3001

# Production 환경 (main 브랜치)
git checkout main
git merge develop
git push origin main
# → http://158.180.75.205:3000
```

### 수동 배포 (Docker Compose)
```bash
# 서버 접속
ssh ubuntu@158.180.75.205

# 프로젝트 디렉토리
cd ~/portfolio-backend-dev  # or ~/portfolio-backend

# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f app

# 재시작
docker-compose restart

# 중지
docker-compose down
```

### 배포 후 필수 작업 (DEPLOYMENT_CHECKLIST.md 참고)
1. **DATABASE_SETUP.md 실행**: 테이블 생성 + GIN 인덱스
2. **환경변수 확인**: CORS_ORIGINS, NODE_ENV, Supabase 키
3. **Redis 동작 확인**: `redis-cli ping` → PONG
4. **Health Check**: `/health` 엔드포인트 확인
5. **Swagger 문서 확인**: `/api` 접속

---

## 📚 API Documentation

### Swagger UI
- **Dev**: http://158.180.75.205:3001/api
- **Prod**: http://158.180.75.205:3000/api

### 주요 엔드포인트

#### Auth
```
POST   /auth/register          # 회원가입 (Local)
POST   /auth/login             # 로그인 (Local)
GET    /auth/me                # 현재 사용자 정보 (JWT 필요)
```

#### Projects
```
GET    /projects               # 목록 (페이징, 검색, 필터링, 정렬)
GET    /projects/:id           # 상세 (조회수 자동 증가)
POST   /projects               # 생성 (관리자, JWT 필요)
PATCH  /projects/:id           # 수정 (작성자/관리자, JWT 필요)
DELETE /projects/:id           # 삭제 (작성자/관리자, JWT 필요)
```

#### Posts
```
GET    /posts                  # 목록 (페이징, 검색, 태그 필터링)
GET    /posts/:slug            # Slug로 조회 (조회수 자동 증가)
POST   /posts                  # 작성 (로그인, JWT 필요)
PUT    /posts/:id              # 수정 (작성자, JWT 필요)
DELETE /posts/:id              # 삭제 (작성자, JWT 필요)
```

#### Comments
```
GET    /comments               # 목록 (target 필터링)
GET    /comments/:id           # 단일 조회
POST   /comments               # 댓글 작성 (로그인 필요)
PATCH  /comments/:id           # 수정 (작성자, JWT 필요)
DELETE /comments/:id           # 삭제 (작성자, JWT 필요)
```

#### Likes
```
POST   /likes/toggle           # 좋아요 토글 (JWT 필요)
GET    /likes/check            # 좋아요 여부 확인 (JWT 필요)
```

---

## 🧪 Development Commands

```bash
# 개발 서버 (Hot Reload)
npm run start:dev

# 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 테스트
npm test                # 단위 테스트
npm run test:e2e        # E2E 테스트
npm run test:cov        # 커버리지

# 코드 품질
npm run lint            # ESLint
npm run format          # Prettier
```

---

## 🐛 Troubleshooting

### 1. TypeORM 연결 실패
```bash
# .env 확인
DATABASE_URL=postgresql://...

# Supabase 프로젝트 활성화 확인
# DATABASE_SETUP.md SQL 실행 확인
```

### 2. Redis 연결 실패
```bash
# Redis 시작
docker run -d -p 6379:6379 redis:7-alpine

# 연결 테스트
docker exec -it <container> redis-cli ping
# 응답: PONG
```

### 3. 조회수가 증가하지 않음
```bash
# Redis 키 확인
redis-cli KEYS "view:*"

# IP 추출 로그 확인 (CF-Connecting-IP)
# Trust Proxy 설정 확인 (main.ts)
```

### 4. GIN 인덱스 생성 필수
```sql
-- Posts tags 검색용 GIN 인덱스 (필수!)
CREATE INDEX IF NOT EXISTS idx_posts_tags 
  ON posts USING GIN (tags);
```

### 5. CORS 에러
```bash
# 환경변수 확인
CORS_ORIGINS=http://localhost:5173,https://yourapp.vercel.app

# 개발 환경: 모든 origin 허용
CORS_ORIGINS=*
```

---

## 📖 참고 문서

| 문서 | 설명 |
|------|------|
| `DATABASE_SETUP.md` | DB 테이블 생성 SQL (필수 참고) |
| `DEPLOYMENT_CHECKLIST.md` | 배포 후 체크리스트 |
| `.env.example` | 환경 변수 템플릿 |

---

## 🤝 Contributing

### Git Workflow
```bash
# Feature 개발
git checkout -b feature/new-feature
git commit -m "feat: 새로운 기능 추가"
git push origin feature/new-feature

# Pull Request → develop 브랜치
# 코드 리뷰 후 머지
```

### Commit Convention
```
feat:     새로운 기능 추가
fix:      버그 수정
docs:     문서 수정
refactor: 코드 리팩토링
test:     테스트 추가
chore:    빌드/설정 변경
perf:     성능 개선
```

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**hsm9411**
- Email: haeha2e@gmail.com
- GitHub: [@hsm9411](https://github.com/hsm9411)

---

**Last Updated**: 2026-02-17  
**Status**: Production Ready ✅  
**Tech Stack**: NestJS 11 | TypeORM 0.3 | Supabase PostgreSQL | Redis 7 | Docker | Cloudflare
