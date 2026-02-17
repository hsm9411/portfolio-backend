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
│ - ViewCount  │    │ (External)       │
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

4. **No Mixed Content Issue**
   - Frontend (Vercel HTTPS) → Backend (HTTPS)
   - 완전한 HTTPS 체인
   - Vercel Proxy 불필요

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
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?schema=portfolio

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# JWT (Local)
JWT_SECRET=your-local-jwt-secret
JWT_EXPIRES_IN=7d

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
Supabase SQL Editor에서 **DATABASE_SETUP.md** 파일의 SQL을 순서대로 실행:
1. Users 테이블
2. Projects 테이블
3. Posts 테이블 (**GIN 인덱스 필수**)
4. Comments 테이블
5. Likes 테이블

### 4. Deploy to OCI (Dev Environment)

**로컬 개발은 하지 않음** - OCI Dev 환경에서만 테스트

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
│   ├── nginx.conf               # Nginx 설정 (Prod, 미사용)
│   └── ssl/                     # Self-Signed 인증서
├── src/
│   ├── config/
│   │   ├── database.config.ts
│   │   └── redis.config.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── project.entity.ts
│   │   ├── post.entity.ts
│   │   ├── comment.entity.ts
│   │   └── like.entity.ts
│   ├── modules/
│   │   ├── auth/                # ✅ 인증
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── supabase-jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   ├── dto/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── projects/            # ✅ 프로젝트
│   │   ├── posts/               # ✅ 블로그
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
├── docker-compose.yml           # Prod 환경 (미사용)
├── Dockerfile
├── DATABASE_SETUP.md
├── DEPLOYMENT_CHECKLIST.md
├── .env.example
└── README.md
```

---

## 🚀 Deployment

### CI/CD 자동 배포 (GitHub Actions)

```bash
# Development 환경 (현재 사용 중)
git push origin develop
# → https://158.180.75.205 (443)

# 워크플로우:
# 1. Docker 이미지 빌드
# 2. GHCR에 푸시 (ghcr.io/hsm9411/portfolio-backend:develop)
# 3. OCI 서버 SSH 접속
# 4. docker-compose.dev.yml로 배포
#    - Nginx (443) → NestJS (3000) → Redis (6379)
```

### Docker Compose 구조

```yaml
services:
  nginx:              # HTTPS Reverse Proxy
    ports:
      - "443:443"     # HTTPS만 외부 노출
    volumes:
      - ./nginx/nginx-selfsigned.conf:/etc/nginx/conf.d/default.conf
      - ./nginx/ssl:/etc/nginx/ssl
  
  app:                # NestJS Backend
    expose:
      - "3000"        # 내부 네트워크만
  
  redis:              # Redis Cache
    expose:
      - "6379"        # 내부 네트워크만
```

### 배포 후 필수 작업

1. **DATABASE_SETUP.md 실행**: 테이블 생성 + GIN 인덱스
2. **환경변수 확인**: CORS_ORIGINS, Supabase 키
3. **SSL 인증서 확인**: `./nginx/ssl/` 디렉토리
4. **Health Check**: `curl -k https://158.180.75.205/health`
5. **Swagger 확인**: `https://158.180.75.205/api`

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
   → HTTPS로 Nginx 443 포트 요청
6. Nginx → NestJS로 HTTP 프록시
7. Backend → SupabaseJwtStrategy가 JWT 검증
8. Backend → users 테이블 자동 생성/조회
9. Backend → req.user에 User 객체 주입
```

### Local Auth (Email/Password)
```
1. Frontend → POST https://158.180.75.205/auth/login
2. Nginx → NestJS로 프록시
3. Backend → bcrypt 비밀번호 검증
4. Backend → Local JWT 발급
5. Frontend → JWT 저장
6. 이후 동일한 방식으로 API 호출
```

---

## 🎯 핵심 아키텍처 상세

### 1. Nginx Reverse Proxy (HTTPS Termination)

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

### 2. Redis 조회수 시스템 (Write-Back)

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

**장점:**
- DB Write 부하 90% 감소
- IP 기반 중복 방지 (24시간)
- Nginx를 통한 실제 IP 전달

### 3. Cloudflare 대응 (Optional)

```typescript
// IP 추출 우선순위
1. CF-Connecting-IP       // Cloudflare 실제 IP
2. X-Real-IP              // Nginx 전달
3. X-Forwarded-For
4. req.ip

// Trust Proxy 설정
app.set('trust proxy', true);

// Rate Limiting
60회/분 (글로벌)
```

---

## 📚 API Documentation

### Swagger UI
- **Dev**: https://158.180.75.205/api

### 주요 엔드포인트

#### Auth
```
POST   /auth/register          # 회원가입
POST   /auth/login             # 로그인
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
GET    /posts/:slug            # Slug 조회 (조회수 자동 증가)
POST   /posts                  # 작성 (로그인, JWT)
PUT    /posts/:id              # 수정 (작성자, JWT)
DELETE /posts/:id              # 삭제 (작성자, JWT)
```

#### Comments
```
GET    /comments               # 목록 (target 필터)
GET    /comments/:id           # 단일 조회
POST   /comments               # 작성 (로그인)
PATCH  /comments/:id           # 수정 (작성자, JWT)
DELETE /comments/:id           # 삭제 (작성자, JWT)
```

#### Likes
```
POST   /likes/toggle           # 좋아요 토글 (JWT)
GET    /likes/check            # 좋아요 여부 (JWT)
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

# SSL 인증서 확인
openssl x509 -in nginx/ssl/nginx-selfsigned.crt -text -noout
```

---

## 🐛 Troubleshooting

### 1. HTTPS 접속 불가
```bash
# Nginx 컨테이너 확인
docker ps | grep nginx

# Nginx 로그 확인
docker logs portfolio-nginx-dev

# 포트 확인
netstat -tlnp | grep 443
```

### 2. SSL 인증서 오류
```bash
# 브라우저에서 "안전하지 않음" 경고 → 정상 (Self-Signed)
# 고급 → 계속 진행 클릭

# 인증서 재생성 (필요시)
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx-selfsigned.key \
  -out nginx-selfsigned.crt
```

### 3. Backend 연결 실패
```bash
# NestJS 로그 확인
docker logs portfolio-backend-dev

# Nginx → Backend 연결 테스트
docker exec portfolio-nginx-dev curl http://portfolio-backend-dev:3000/health
```

### 4. Redis 연결 실패
```bash
# Redis 상태 확인
docker exec portfolio-redis-dev redis-cli ping
# 응답: PONG

# Redis 키 확인
docker exec portfolio-redis-dev redis-cli KEYS "view:*"
```

### 5. Mixed Content (발생하지 않음)
- Backend가 HTTPS로 제공되므로 문제 없음
- Frontend (Vercel HTTPS) → Backend (HTTPS)
- Nginx가 HTTPS 처리

---

## 📖 참고 문서

| 문서 | 설명 |
|------|------|
| `DATABASE_SETUP.md` | DB 테이블 생성 SQL (필수) |
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
**Tech Stack**: NestJS 11 | TypeORM 0.3 | Supabase PostgreSQL | Redis 7 | Nginx 1.25 | Docker | OCI
