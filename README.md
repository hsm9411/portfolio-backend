# Portfolio Backend

[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

NestJS 11 + TypeORM + Supabase PostgreSQL + Redis 기반 포트폴리오 & 기술 블로그 백엔드.

**Live:**
- Production: https://hsm9411.duckdns.org
- Swagger: https://hsm9411.duckdns.org/api
- Dev: https://hsm9411-dev.duckdns.org

---

## 아키텍처

```
Internet
  │ HTTPS (443)
  ▼
Nginx (Docker) ─── global-portfolio-network ───┐
  │ HTTP (3000)                                 │
  ▼                                             │
NestJS (Docker)                         NestJS-dev (Docker)
  │                                             │
  ├─ Redis (internal network)          Redis-dev (internal)
  │   조회수 Write-Back 캐시
  │
  └─ Supabase PostgreSQL (portfolio schema)
      projects, posts, comments, likes, users
```

### Docker 네트워크 구조

컨테이너가 외부 포트를 노출하지 않음. 통합 Nginx 컨테이너가 `global-portfolio-network`를 통해 도메인 기반으로 prod/dev 백엔드로 라우팅.

```
global-portfolio-network
  ├─ portfolio-nginx          (Nginx, 443 포트만 외부 노출)
  ├─ portfolio-backend        (prod, expose 3000)
  └─ portfolio-backend-dev    (dev, expose 3000)

internal networks (각각 독립)
  ├─ portfolio-backend + portfolio-redis
  └─ portfolio-backend-dev + portfolio-redis-dev
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | NestJS 11, TypeScript 5.7 |
| ORM | TypeORM 0.3 |
| Database | Supabase PostgreSQL (portfolio schema) |
| Cache | Redis 7 (조회수 Write-Back) |
| Auth | Supabase OAuth, jwks-rsa (ES256 JWT 검증) |
| Infra | Nginx 1.25, Docker Compose, OCI Free Tier |
| SSL | Let's Encrypt (DuckDNS + certbot-dns-duckdns) |
| CI/CD | GitHub Actions → GHCR → OCI SSH |
| Monitoring | Swagger (/api), NestJS Logger |

---

## 핵심 기능

### 인증
- Supabase OAuth (Google, GitHub, Kakao) JWT를 `jwks-rsa`로 ES256 비대칭키 검증
- 첫 OAuth 로그인 시 `portfolio.users` 자동 생성
- `ADMIN_EMAILS` 환경변수 기반 관리자 권한

### Projects / Posts
- CRUD + 페이지네이션 + 검색 + 정렬
- Projects: 상태 필터 (`in-progress` / `completed` / `archived`)
- Posts: 카테고리 (`tutorial` / `essay` / `review` / `news`), 태그 GIN 인덱스

### Comments / Likes
- Polymorphic 구조 (project/post 통합)
- Comments: 대댓글 (parent_id), 익명 댓글 지원
- Likes: UNIQUE 제약 기반 토글, 중복 방지

### 조회수 (ViewCount)
- Redis Write-Back 전략: GET 요청 시 Redis에 즉시 increment
- IP + ID 기반 24시간 중복 방지
- `@nestjs/schedule` Cron으로 매일 자정 Redis → Supabase DB 동기화

### ISR 웹훅 (RevalidationService)
- 콘텐츠 저장 시 Vercel `/api/revalidate` 웹훅 발송
- Exponential backoff retry: 실패 시 1s → 2s → 4s, 최대 3회
- fire-and-forget (웹훅 실패가 API 응답에 영향 없음)

---

## 프로젝트 구조

```
portfolio-backend/
├── .github/workflows/deploy.yml    # CI/CD
├── migrations/                     # DB 마이그레이션 SQL
├── nginx/conf.d/portfolio.conf     # Global Nginx 설정
├── src/
│   ├── common/
│   │   ├── services/
│   │   │   ├── revalidation.service.ts   # ISR 웹훅 (retry 포함)
│   │   │   ├── view-count.service.ts     # Redis 조회수
│   │   │   └── tasks.service.ts          # Cron (DB 동기화)
│   │   ├── guards/
│   │   └── common.module.ts
│   ├── config/
│   ├── entities/
│   │   ├── user/
│   │   ├── project/
│   │   ├── post/
│   │   ├── comment/
│   │   └── like/
│   └── modules/
│       ├── auth/
│       ├── projects/
│       ├── posts/
│       ├── comments/
│       └── likes/
├── docker-compose.yml              # Production
├── docker-compose.dev.yml          # Dev
├── docker-compose.nginx.yml        # Global Nginx (prod/dev 공통)
├── Dockerfile
├── deploy.sh                       # 서버 배포 스크립트
├── schema.sql                      # 전체 DB 스키마
└── .env.example
```

---

## 환경변수

`.env.example` 참고.

```env
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?schema=portfolio

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Admin
ADMIN_EMAILS=admin@example.com

# Redis
REDIS_HOST=portfolio-redis       # dev: portfolio-redis-dev
REDIS_PORT=6379

# CORS (쉼표 구분, Vercel 도메인 포함)
CORS_ORIGINS=https://portfolio-front-ten-gamma.vercel.app,https://*.vercel.app

# ISR 웹훅
FRONTEND_URL=https://portfolio-front-ten-gamma.vercel.app   # dev: Preview URL
REVALIDATE_SECRET=your-secret                                # 프론트와 동일 값

# Server
PORT=3000
NODE_ENV=production
```

---

## 배포

### Git 흐름

```
develop push → GitHub Actions
  1. Docker 이미지 빌드 → GHCR (ghcr.io/hsm9411/portfolio-backend:develop)
  2. OCI SSH → docker-compose.dev.yml 배포
  3. https://hsm9411-dev.duckdns.org 헬스체크

main push → GitHub Actions
  1. Docker 이미지 빌드 → GHCR (ghcr.io/hsm9411/portfolio-backend:latest)
  2. OCI SSH → docker-compose.yml 배포
  3. https://hsm9411.duckdns.org 헬스체크
```

### GitHub Actions Secrets

| Secret | 설명 |
|--------|------|
| `ORACLE_HOST` | OCI 서버 IP 또는 도메인 |
| `ORACLE_USER` | SSH 사용자명 (ubuntu) |
| `ORACLE_SSH_KEY` | SSH 개인키 (PEM) |

### 수동 배포

```bash
# Production
ssh ubuntu@hsm9411.duckdns.org
cd ~/portfolio-backend
docker compose down && docker compose pull && docker compose up -d

# Dev
cd ~/portfolio-backend-dev
docker compose down && docker compose pull && docker compose up -d

# 로그 확인
docker logs portfolio-backend --tail 50
docker logs portfolio-nginx --tail 30
```

### SSL 인증서 (Let's Encrypt)

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 인증서 상태 확인
sudo certbot certificates
```

자동 갱신 후 Nginx reload:
```
/etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
```

---

## API

Swagger UI: https://hsm9411.duckdns.org/api

| Method | Endpoint | 인증 |
|--------|----------|------|
| GET | /projects | - |
| GET | /projects/:id | - |
| POST | /projects | 관리자 |
| PATCH | /projects/:id | 관리자 |
| DELETE | /projects/:id | 관리자 |
| GET | /posts | - |
| GET | /posts/:id | - |
| POST | /posts | 로그인 |
| PATCH | /posts/:id | 작성자 |
| DELETE | /posts/:id | 작성자 |
| GET | /comments | - |
| POST | /comments | 로그인 |
| DELETE | /comments/:id | 작성자 |
| POST | /likes/toggle | 로그인 |
| GET | /likes/check | 로그인 |
| GET | /auth/me | 로그인 |
| GET | /health | - |

---

## DB 초기 설정

Supabase SQL Editor에서 `schema.sql` 실행 후:

```sql
-- RLS 비활성화 (NestJS에서 Row-level 접근 제어)
ALTER TABLE portfolio.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.users DISABLE ROW LEVEL SECURITY;
```

---

## 트러블슈팅

**502 Bad Gateway:**
```bash
docker logs portfolio-nginx --tail 30
docker logs portfolio-backend --tail 30
docker network inspect global-portfolio-network
```

**JWT 인증 실패:**
- Supabase Dashboard → Settings → API → JWT Secret 확인
- `SUPABASE_URL` trailing slash 없는지 확인

**조회수 미반영:**
```bash
docker exec -it portfolio-redis redis-cli
KEYS view:*
# Cron은 매일 자정 실행, 즉시 확인하려면:
# NestJS에서 TasksService.syncViewCounts() 수동 트리거
```

**데이터 미노출 (RLS):**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'portfolio';
-- 모두 false여야 함
```

---

## Author

**hsm9411** | haeha2e@gmail.com | [@hsm9411](https://github.com/hsm9411)

Last Updated: 2026-02-26
