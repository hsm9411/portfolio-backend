# 🚀 Portfolio Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.x-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

> **NestJS** + **Supabase PostgreSQL** + **Redis**로 구축한 **포트폴리오 + 기술 블로그 백엔드**
> 
> Supabase OAuth 인증, 조회수/좋아요/댓글 기능, Redis 캐싱, CI/CD 자동 배포

---

## 📌 프로젝트 상태

| 구분 | 상태 | 설명 |
|------|------|------|
| **Auth 모듈** | ✅ 완료 | Supabase OAuth (Google/GitHub) + Local 로그인 |
| **DB Schema** | ✅ 완료 | 6개 테이블, Full-text 검색, Polymorphic 관계 |
| **CI/CD** | ✅ 완료 | GitHub Actions → Oracle Cloud 자동 배포 |
| **Projects 모듈** | 🔄 진행 예정 | 포트폴리오 프로젝트 CRUD |
| **Posts 모듈** | ⏳ 대기 | 기술 블로그 글 관리 |
| **Comments/Likes** | ⏳ 대기 | 소셜 기능 |

**최근 작업 (2026-02-09):**
- ✅ Supabase OAuth 전환 완료 (Passport.js → Supabase Auth)
- ✅ User Entity supabase_user_id 컬럼 추가
- ✅ SupabaseJwtStrategy 구현
- 🔄 배포 테스트 진행 중

**다음 작업:**
1. Projects 모듈 구현 (CRUD, 조회수, 좋아요)
2. Posts 모듈 구현
3. Frontend Supabase SDK 통합

---

## ✨ 핵심 기능

### 인증 (Auth) ✅
- **Supabase OAuth**: Google/GitHub 간편 로그인
- **Local Auth**: 이메일/비밀번호 회원가입
- **JWT 검증**: Supabase JWT + Local JWT 모두 지원
- **자동 사용자 생성**: OAuth 첫 로그인 시 portfolio.users 자동 생성

### 포트폴리오 (Projects) 🔄
- CRUD: 프로젝트 생성/조회/수정/삭제
- 기술 스택 태그, 데모/GitHub URL
- Redis 기반 조회수 (IP 중복 방지)
- 좋아요 기능

### 블로그 (Posts) ⏳
- Markdown 지원
- 카테고리/태그 분류
- Full-text 검색 (PostgreSQL GIN 인덱스)
- 읽기 시간 계산

### 소셜 기능 (Comments/Likes) ⏳
- Polymorphic 댓글: 프로젝트/포스트 모두 지원
- 대댓글 구조 (parent_id)
- 익명/로그인 사용자 구분
- 좋아요 중복 방지

---

## 🛠️ 기술 스택

### Backend
- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7
- **ORM**: TypeORM 0.3
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
- **Deployment**: Oracle Cloud Free Tier
- **Monitoring**: Prometheus + Grafana

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

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### Database Setup

```bash
# Supabase SQL Editor에서 실행
# 1. https://supabase.com/dashboard 접속
# 2. SQL Editor 메뉴
# 3. schema.sql 파일 내용 복사 & 실행
# 4. migrations/*.sql 파일도 순서대로 실행
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
│   │   ├── project/
│   │   ├── post/
│   │   ├── comment/
│   │   ├── like/
│   │   └── view/
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
│   │   ├── projects/            # 🔄 프로젝트 모듈 (구현 예정)
│   │   ├── posts/               # ⏳ 블로그 모듈
│   │   ├── comments/            # ⏳ 댓글 모듈
│   │   └── likes/               # ⏳ 좋아요 모듈
│   ├── app.module.ts
│   └── main.ts
├── migrations/                  # DB 마이그레이션
│   └── 2026-02-09-add-supabase-oauth.sql
├── schema.sql                   # 초기 DB 스키마
├── .env.example                 # 환경 변수 예시
├── docker-compose.yml
├── Dockerfile
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD
├── docs/                        # 문서
│   ├── AI_MEMORY.md            # 프로젝트 현황
│   ├── SESSION_RESUME.md       # 세션 재개 가이드
│   └── NEXT_TASKS.md           # 다음 작업 목록
└── README.md
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
- title, content (Markdown)
- category, tags: text[]
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
- author_id: uuid (nullable, 익명 가능)
- ip_address: inet (익명 사용자)
```

#### Likes (좋아요)
```sql
- id: uuid (PK)
- target_type: text (project, post)  # Polymorphic
- target_id: uuid
- user_id: uuid (nullable, 로그인)
- ip_address: inet (익명)
- UNIQUE(target_type, target_id, user_id/ip_address)
```

#### Views (조회수)
```sql
- id: uuid (PK)
- target_type: text
- target_id: uuid
- ip_address: inet
- user_agent: text
- viewed_at: timestamptz
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

---

## 📚 API Documentation

### Swagger
- **Local**: http://localhost:3000/api
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

#### Projects 🔄 (구현 예정)
```
GET    /projects               # 목록 조회 (페이징, 필터링, 검색)
GET    /projects/:id           # 상세 조회
POST   /projects               # 생성 (관리자만)
PATCH  /projects/:id           # 수정 (작성자/관리자)
DELETE /projects/:id           # 삭제 (작성자/관리자)
POST   /projects/:id/view      # 조회수 증가 (Redis)
```

#### Posts ⏳ (구현 예정)
```
GET    /posts                  # 목록 조회
GET    /posts/:id              # 상세 조회
POST   /posts                  # 작성 (관리자)
PATCH  /posts/:id              # 수정
DELETE /posts/:id              # 삭제
```

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
# schema.sql 실행 확인
```

### 2. Redis 연결 실패
```bash
docker run -d -p 6379:6379 redis:7-alpine
docker exec -it <container> redis-cli ping  # 응답: PONG
```

### 3. Supabase JWT 검증 실패
```bash
# SUPABASE_JWT_SECRET 확인
# Supabase Dashboard → Settings → API → JWT Secret (Legacy)
```

### 4. OAuth 로그인 실패
```bash
# Supabase Dashboard → Authentication → Providers
# Google/GitHub Provider 활성화 확인
# Redirect URL 확인:
#   https://vcegupzlmopajpqxttfo.supabase.co/auth/v1/callback
```

---

## 📖 Documentation

| 문서 | 설명 |
|------|------|
| `AI_MEMORY.md` | 프로젝트 전체 히스토리, 완료된 작업 |
| `SESSION_RESUME.md` | 다음 세션 시작 가이드 |
| `NEXT_TASKS.md` | 우선순위별 작업 목록 |
| `DEPLOYMENT.md` | 배포 가이드 (Oracle Cloud) |
| `CLAUDE.md` | 코딩 표준, 작업 가이드 |
| `schema.sql` | DB 스키마 정의 |
| `migrations/` | DB 마이그레이션 SQL |

---

## 🤝 Contributing

### Git Workflow

```bash
# Feature 개발
git checkout -b feature/projects-module
git commit -m "feat: Projects 모듈 CRUD 구현"
git push origin feature/projects-module

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

**Last Updated**: 2026-02-09 (Supabase OAuth 전환 완료)
