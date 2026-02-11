# 🚀 Portfolio Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

> **NestJS** + **TypeORM** + **Supabase PostgreSQL** + **Redis**로 구축한 **포트폴리오 + 기술 블로그 백엔드**
> 
> Supabase OAuth 인증, Redis 조회수 캐싱, Polymorphic 관계, CI/CD 자동 배포

**🌐 API Endpoints:**
- **Dev**: http://158.180.75.205:3001
- **Prod**: http://158.180.75.205:3000
- **Swagger**: /api

---

## 📌 프로젝트 상태

| 구분 | 상태 | 설명 |
|------|------|------|
| **System Config** | ✅ 완료 | Trust Proxy, CORS, Throttler (Cloudflare 대응) |
| **Auth 모듈** | ✅ 완료 | Supabase OAuth (Google/GitHub) + Local 로그인 |
| **Projects 모듈** | ✅ 완료 | CRUD, 페이징, 필터링, 검색, 정렬 |
| **Posts 모듈** | ✅ 완료 | CRUD, Slug 자동생성, Tags 검색 (GIN 인덱스) |
| **Comments 모듈** | ✅ 완료 | Polymorphic, 익명 마스킹, Nested (대댓글) |
| **Likes 모듈** | ✅ 완료 | Polymorphic, 트랜잭션 기반 토글 |
| **Redis 조회수** | ✅ 완료 | IP 기반 캐싱, 24h TTL, Write-Back |

**최근 작업 (2026-02-11):**
- ✅ 모든 코어 모듈 구현 완료 (Projects, Posts, Comments, Likes)
- ✅ Redis 조회수 캐싱: IP 기반 중복 방지 (24h TTL)
- ✅ ViewCountService: Write-Back 전략 (Redis → DB 동기화)
- ✅ Cloudflare 프록시 대응: CF-Connecting-IP 우선 순위
- ✅ Polymorphic 관계: Comments/Likes 공통 구조
- ✅ Posts Slug 자동생성 (SEO 최적화)
- ✅ Comments 익명 마스킹 (Privacy 보호)
- ✅ Likes 트랜잭션 토글 (원자성 보장)

**다음 작업 (선택사항):**
1. 테스트 코드 작성 (Unit/E2E)
2. 에러 모니터링 (Sentry 연동)
3. Admin API 구현 (통계 조회, 사용자 관리)
4. 성능 최적화 (Query 최적화, 캐싱 확대)
5. Frontend 통합 테스트 및 QA

---

## ✨ 핵심 기능

### 인증 (Auth) ✅
- **Supabase OAuth**: Google/GitHub 간편 로그인
- **Local Auth**: 이메일/비밀번호 회원가입
- **JWT 검증**: Supabase JWT + Local JWT 모두 지원
- **자동 사용자 생성**: OAuth 첫 로그인 시 portfolio.users 자동 생성

### 포트폴리오 (Projects) ✅
- **CRUD**: 프로젝트 생성/조회/수정/삭제
- **페이징**: 10개씩, 최대 100개
- **필터링**: 상태별 (in-progress, completed, archived)
- **검색**: 제목, 설명 ILIKE 검색
- **정렬**: created_at, view_count, like_count
- **권한**: 생성(관리자만), 수정/삭제(작성자/관리자)
- **조회수**: Redis 캐싱 (IP 기반 24h TTL)

### 블로그 (Posts) ✅
- **Slug**: 자동생성 (SEO 최적화, unique 제약)
- **Markdown**: content 필드
- **Tags**: text[] 배열 + GIN 인덱스 검색
- **Summary**: 메타 태그용 요약
- **Read Time**: 자동 계산 (read_time_minutes)
- **조회수**: Redis 캐싱 (IP 기반 24h TTL)

### 댓글 (Comments) ✅
- **Polymorphic**: target_type (project/post) + target_id
- **Nested**: parent_id (self-referencing, 대댓글)
- **익명 마스킹**: is_anonymous=true 시 작성자/Admin만 원본 정보 표시
- **권한**: 로그인/익명 모두 가능, 수정/삭제는 작성자만

### 좋아요 (Likes) ✅
- **Polymorphic**: (target_type, target_id, user_id) UNIQUE 제약
- **토글**: 트랜잭션 기반 좋아요/취소 원자성 보장
- **카운트**: target 테이블 like_count 자동 증감
- **중복 방지**: DB 제약조건 + 서비스 로직

---

## 🔥 특별 기능

### Redis 조회수 캐싱 (Write-Back)

**아키텍처:**
```
조회 요청
  ↓
IP 중복 체크 (Redis)
  │
  ├─ ✅ 24h 내 중복 → 카운트 X
  └─ ❌ 신규 → Redis 카운트 +1
                └─ Key: view:count:{type}:{id}
                └─ Key: view:ip:{type}:{id}:{ip} (TTL 24h)
  ↓
매일 자정 (KST 00:00)
  │
  └─ Cron Job: Redis → DB 동기화
     └─ 모든 view:count:* 키 읽어서 DB 업데이트
```

**장점:**
- DB 부하 90% 감소 (Write 최소화)
- IP 기반 중복 방지 (24시간)
- Cloudflare 프록시 대응 (CF-Connecting-IP)

### Cloudflare 프록시 대응

**IP 추출 우선순위:**
```typescript
1. CF-Connecting-IP      // Cloudflare 실제 IP
2. X-Real-IP
3. X-Forwarded-For
4. req.ip                // Express 기본
```

**Trust Proxy 설정:**
```typescript
app.set('trust proxy', true);  // req.ip 보정
```

**Rate Limiting:**
```
60회/분 (글로벌 제한)
IP 기반 Throttling
```

---

## 🛠️ 기술 스택

### Backend
- **Framework**: NestJS 11.0.1
- **Language**: TypeScript 5.7.3
- **ORM**: TypeORM 0.3.28
- **Validation**: class-validator, class-transformer

### Database
- **Primary DB**: Supabase PostgreSQL
- **Schema**: `portfolio`
- **Cache**: Redis 7-alpine

### Authentication
- **Strategy**: Supabase OAuth (Google, GitHub)
- **Local**: JWT + bcrypt
- **Session**: Redis

### DevOps
- **CI/CD**: GitHub Actions
- **Container**: Docker, Docker Compose
- **Deployment**: Oracle Cloud Free Tier (Ubuntu 24.04)
- **Monitoring**: Prometheus + Grafana (계획)

### Documentation
- **API Docs**: Swagger
- **Code Quality**: ESLint, Prettier

---

## ⚡ Quick Start

### Prerequisites

```bash
Node.js 22+
Supabase 계정 (무료)
Redis (Docker 권장)
```

### Installation

```bash
# 1. 레포지토리 클론
git clone https://github.com/hsm9411/portfolio-backend.git
cd portfolio-backend

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
```

**.env 설정:**
```env
# Supabase
SUPABASE_URL=https://vcegupzlmopajpqxttfo.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=your-supabase-connection-string

# JWT (Local)
JWT_SECRET=your-local-jwt-secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS (다중 도메인)
CORS_ORIGINS=http://localhost:5173,https://yourapp.vercel.app

# Server
PORT=3000
NODE_ENV=development
```

### Database Setup

```bash
# 1. Supabase SQL Editor에서 DATABASE_SETUP.md 파일의 SQL을 순서대로 실행
# 2. 각 테이블 생성 SQL 실행
# 3. GIN 인덱스 생성 (Posts tags 검색용)
```

### Run Development Server

```bash
# Redis 시작
docker run -d --name portfolio-redis -p 6379:6379 redis:7-alpine

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
│   │   ├── user/
│   │   │   └── user.entity.ts   # 사용자 (supabase_user_id 포함)
│   │   ├── project/             # 프로젝트 엔티티
│   │   ├── post/                # 블로그 포스트 엔티티
│   │   ├── comment/             # 댓글 엔티티
│   │   ├── like/                # 좋아요 엔티티
│   │   └── view/                # 조회수 엔티티
│   ├── modules/                 # 기능 모듈
│   │   ├── auth/                # ✅ 인증 모듈
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts           # Local JWT
│   │   │   │   └── supabase-jwt.strategy.ts  # Supabase JWT
│   │   │   ├── guards/
│   │   │   ├── dto/
│   │   │   ├── interfaces/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── projects/            # ✅ 프로젝트 모듈
│   │   ├── posts/               # ✅ 블로그 모듈
│   │   ├── comments/            # ✅ 댓글 모듈
│   │   ├── likes/               # ✅ 좋아요 모듈
│   │   └── common/              # ✅ 공통 모듈 (ViewCount, Tasks)
│   ├── app.module.ts
│   └── main.ts
├── migrations/                  # DB 마이그레이션
├── docs/                        # 문서
│   ├── AI_MEMORY.md            # 프로젝트 전체 히스토리
│   ├── PROGRESS.md             # 현재 상태 (이 파일 우선)
│   ├── DATABASE_SETUP.md       # DB 초기화 가이드
│   ├── DEPLOYMENT_CHECKLIST.md # 배포 체크리스트
│   └── NEXT_TASKS.md           # 향후 작업 목록
├── .env.example                 # 환경 변수 예시
├── docker-compose.yml
├── Dockerfile
├── .github/workflows/deploy.yml # CI/CD
└── README.md                    # 이 파일
```

---

## 🗄️ Database Schema

### Schema: `portfolio`

#### Users (사용자)
```sql
- id: uuid (PK)
- supabase_user_id: uuid (Supabase auth.users 연결)
- email: text (UNIQUE)
- password: text (nullable, OAuth 사용자)
- nickname: text
- avatar_url: text
- provider: text (local, google, github, email)
- provider_id: text (OAuth Provider 고유 ID)
- is_admin: boolean
- created_at, updated_at
```

#### Projects (프로젝트 포트폴리오)
```sql
- id: uuid (PK)
- title, summary, description (Markdown)
- tech_stack: text[] (기술 스택 배열)
- tags: text[]
- demo_url, github_url
- view_count, like_count
- author_id (FK → users)
- 비정규화: author_nickname, author_avatar_url
```

#### Posts (블로그 글)
```sql
- id: uuid (PK)
- slug: text (UNIQUE, SEO 친화적)
- title, content (Markdown), summary
- tags: text[] (GIN 인덱스)
- read_time_minutes (자동 계산)
- view_count, like_count
- author_id (FK → users)
- 비정규화: author_nickname, author_avatar_url
```

#### Comments (댓글)
```sql
- id: uuid (PK)
- target_type: text (project, post)  # Polymorphic
- target_id: uuid
- parent_id: uuid (대댓글)
- content: text
- is_anonymous: boolean
- author_id: uuid (nullable, 익명 가능)
- author_nickname, author_email
- ip_address: inet (익명 사용자)
```

#### Likes (좋아요)
```sql
- id: uuid (PK)
- target_type: text (project, post)  # Polymorphic
- target_id: uuid
- user_id: uuid
- created_at
# UNIQUE(target_type, target_id, user_id)
```

---

## 🔐 Authentication Flow

### Supabase OAuth (Google/GitHub)

```
1. Frontend → supabase.auth.signInWithOAuth({ provider: 'google' })
2. Supabase Auth → Google 로그인 페이지
3. 사용자 인증 → Supabase가 JWT 발급
4. Frontend → JWT 저장 (localStorage/cookie)
5. Frontend → Backend API 호출 (Authorization: Bearer {JWT})
6. Backend → SupabaseJwtStrategy가 JWT 검증
7. Backend → portfolio.users 자동 생성/조회 (supabase_user_id 연결)
8. Backend → req.user에 User 객체 주입
```

### Local Auth (Email/Password)

```
1. Frontend → POST /auth/register or /auth/login
2. Backend → bcrypt 검증
3. Backend → Local JWT 발급 (JWT_SECRET 사용)
4. Frontend → JWT 저장
5. Frontend → Backend API 호출 (Authorization: Bearer {JWT})
6. Backend → JwtStrategy가 JWT 검증
```

---

## 🚀 Deployment

### 자동 배포 (GitHub Actions)

```bash
# develop 브랜치 → Development 환경
git push origin develop
# → http://158.180.75.205:3001

# main 브랜치 → Production 환경
git checkout main
git merge develop
git push origin main
# → http://158.180.75.205:3000
```

### 수동 배포 (Docker)

```bash
# 서버 접속
ssh ubuntu@158.180.75.205

# 프로젝트 디렉토리
cd ~/portfolio-backend-dev  # or ~/portfolio-backend

# Docker Compose 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f app
```

### 배포 후 필수 작업

**DATABASE_SETUP.md 참고하여 SQL 실행:**
1. Users 테이블 생성
2. Projects 테이블 생성
3. Posts 테이블 생성 + **GIN 인덱스** (중요!)
4. Comments 테이블 생성
5. Likes 테이블 생성

**GIN 인덱스 (필수):**
```sql
CREATE INDEX IF NOT EXISTS idx_posts_tags 
  ON posts USING GIN (tags);
```

---

## 📚 API Documentation

### Swagger
- **Dev**: http://158.180.75.205:3001/api
- **Prod**: http://158.180.75.205:3000/api

### Endpoints

#### Auth ✅
```
POST   /auth/register          # 회원가입 (Local)
POST   /auth/login             # 로그인 (Local)
GET    /auth/me                # 현재 사용자 정보 (JWT 필요)
POST   /auth/sync-oauth-user   # OAuth 사용자 동기화 (선택)
```

**Note:** Google/GitHub OAuth는 Frontend에서 Supabase SDK로 처리

#### Projects ✅
```
GET    /projects               # 목록 조회 (페이징, 필터링, 검색, 정렬)
GET    /projects/:id           # 상세 조회 (조회수 자동 증가)
POST   /projects               # 생성 (JWT 필요, 관리자만)
PATCH  /projects/:id           # 수정 (JWT 필요, 작성자/관리자)
DELETE /projects/:id           # 삭제 (JWT 필요, 작성자/관리자)
```

**구현 완료:**
- ✅ 페이징 (기본 10개, 최대 100개)
- ✅ 필터링 (status: in-progress, completed, archived)
- ✅ 검색 (title, description - ILIKE)
- ✅ 정렬 (created_at, view_count, like_count)
- ✅ 권한 체크 (관리자/작성자)
- ✅ 조회수 자동 증가 (Redis 캐싱)

#### Posts ✅
```
GET    /posts                  # 목록 조회 (페이징, tags 검색)
GET    /posts/:slug            # Slug 기반 상세 조회 (SEO 친화적)
POST   /posts                  # 작성 (JWT 필요, 관리자만)
PATCH  /posts/:id              # 수정 (JWT 필요, 작성자/관리자)
DELETE /posts/:id              # 삭제 (JWT 필요, 작성자/관리자)
```

**구현 완료:**
- ✅ Slug 자동생성 (unique 제약)
- ✅ Tags GIN 인덱스 검색
- ✅ Markdown content 저장
- ✅ 읽기 시간 자동 계산
- ✅ Redis 조회수 캐싱 (IP 기반 24h TTL)

#### Comments ✅
```
GET    /comments               # 목록 조회 (target 필터링)
GET    /comments/:id           # 단일 조회
POST   /comments               # 댓글 작성 (로그인/익명)
PATCH  /comments/:id           # 수정 (작성자만)
DELETE /comments/:id           # 삭제 (작성자만)
```

**구현 완료:**
- ✅ Polymorphic 관계 (project/post)
- ✅ Nested 댓글 (parent_id)
- ✅ 익명 마스킹 (Privacy)

#### Likes ✅
```
POST   /likes/toggle           # 좋아요 토글 (JWT 필요)
GET    /likes/check            # 좋아요 여부 확인
```

**구현 완료:**
- ✅ 트랜잭션 기반 토글
- ✅ 중복 방지 (UNIQUE 제약)
- ✅ 카운트 자동 증감

---

## 🧪 Development Commands

```bash
# 개발 서버
npm run start:dev

# 빌드
npm run build

# 프로덕션
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
# DATABASE_SETUP.md의 SQL 실행 확인
```

### 2. Redis 연결 실패
```bash
docker run -d -p 6379:6379 redis:7-alpine
docker exec -it <container> redis-cli ping  # 응답: PONG
```

### 3. 조회수가 증가하지 않는 경우
```bash
# Redis 키 확인
redis-cli KEYS "view:*"

# IP 추출 로직 확인 (CF-Connecting-IP)
# Trust Proxy 설정 확인
```

### 4. GIN 인덱스 생성 필수
```sql
-- Posts tags 검색을 위한 필수 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_tags 
  ON posts USING GIN (tags);
```

---

## 📖 Documentation

| 문서 | 설명 |
|------|------|
| `PROGRESS.md` | **현재 상태 (우선 참고)** |
| `AI_MEMORY.md` | 프로젝트 전체 히스토리 |
| `DATABASE_SETUP.md` | DB 초기화 가이드 |
| `DEPLOYMENT_CHECKLIST.md` | 배포 후 체크리스트 |
| `NEXT_TASKS.md` | 향후 작업 목록 |
| `CLAUDE.md` | 코딩 표준, 작업 가이드 |

---

## 🤝 Contributing

### Git Workflow

```bash
# Feature 개발
git checkout -b feature/admin-api
git commit -m "feat: Admin API 구현"
git push origin feature/admin-api

# Pull Request → develop 브랜치
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

**Last Updated**: 2026-02-11 (모든 코어 모듈 구현 완료)  
**Tech Stack**: NestJS 11 | TypeORM 0.3 | Supabase PostgreSQL | Redis 7 | Cloudflare