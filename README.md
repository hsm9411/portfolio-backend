# Portfolio Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![Nginx](https://img.shields.io/badge/Nginx-1.25-009639)](https://nginx.org/)

> **NestJS** + **TypeORM** + **Supabase PostgreSQL** + **Redis** + **Nginx** + **Let's Encrypt** 기반 포트폴리오 + 기술 블로그 백엔드

**배포 환경:**
- **Dev (HTTPS)**: https://hsm9411.duckdns.org ([Swagger](https://hsm9411.duckdns.org/api))
- **Infrastructure**: Oracle Cloud Infrastructure (Free Tier)
- **SSL**: Let's Encrypt (DuckDNS + certbot-dns-duckdns)

---

## 핵심 기능

### 인증 (Auth)
- Supabase OAuth: Google, GitHub 소셜 로그인
- JWT 검증: `jwks-rsa`로 ES256 비대칭키 검증
- 자동 사용자 연동: OAuth 첫 로그인 시 `portfolio.users` 자동 생성
- 관리자 권한: 환경변수 `ADMIN_EMAILS` 기반 자동 설정

### 프로젝트 (Projects)
- CRUD + 페이징 (기본 10개, 최대 100개)
- 상태 필터: `in-progress` / `completed` / `archived`
- 검색: 제목, 설명 ILIKE
- 정렬: `created_at` / `view_count` / `like_count`

### 블로그 (Posts)
- ID 기반 URL (`/posts/:id`)
- 카테고리: `tutorial` / `essay` / `review` / `news`
- 태그: GIN 인덱스 기반 고속 검색
- 읽기 시간 자동 계산

### 댓글 (Comments)
- Polymorphic (project/post 통합)
- 대댓글 (parent_id 기반)
- 익명 댓글 지원

### 좋아요 (Likes)
- Polymorphic 토글 방식
- DB UNIQUE 제약으로 중복 방지

### 조회수 (ViewCount)
- Redis Write-Back 전략
- IP 기반 중복 방지 (24시간 TTL)
- 매일 자정 Redis → DB 자동 동기화

---

## 아키텍처

```
Internet (Client)
    ↓ HTTPS (443)
Nginx (Docker)
  - Let's Encrypt SSL
  - Security Headers
    ↓ HTTP (3000)
NestJS (Docker)
  - REST API
  - JWT Auth
    ↓
  ┌──────────────────────┐
  Redis (Docker)         Supabase PostgreSQL
  - ViewCount Cache      - portfolio schema
  - IP 중복 방지          - RLS 비활성화
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | NestJS 11, TypeScript 5.7 |
| ORM | TypeORM 0.3 |
| Database | Supabase PostgreSQL (portfolio schema) |
| Cache | Redis 7 |
| Auth | Supabase OAuth, jwks-rsa (ES256) |
| Infra | Nginx 1.25, Docker, OCI Free Tier |
| SSL | Let's Encrypt (DuckDNS, certbot-dns-duckdns) |
| CI/CD | GitHub Actions → GHCR → OCI SSH |

---

## 환경변수

`.env.example` 참고. 필수 항목:

```env
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?schema=portfolio

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Admin (쉼표 구분)
ADMIN_EMAILS=admin@example.com

# Redis
REDIS_HOST=portfolio-redis-dev
REDIS_PORT=6379

# CORS (쉼표 구분)
CORS_ORIGINS=https://yourapp.vercel.app

# Server
PORT=3000
NODE_ENV=production
```

---

## 배포

### 자동 배포 (GitHub Actions)
```bash
git push origin develop   # Dev 환경 자동 배포
git push origin main      # Production 환경 자동 배포
```

**develop 브랜치 배포 흐름:**
1. Docker 이미지 빌드 → GHCR push
2. OCI SSH 접속
3. `nginx/nginx.conf` 서버 전송
4. Let's Encrypt 인증서 존재 확인
5. `docker-compose.dev.yml`로 컨테이너 재시작

### 수동 배포 (서버에서)
```bash
ssh ubuntu@hsm9411.duckdns.org
cd ~/portfolio-backend-dev
docker compose down && docker compose pull && docker compose up -d
docker logs portfolio-nginx-dev --tail 30
docker logs portfolio-backend-dev --tail 30
```

---

## 인증서 관리 (Let's Encrypt)

인증서는 서버에서 직접 관리. 자동 갱신 설정 완료 (`certbot renew` 자동 실행).

갱신 후 Nginx 자동 reload:
```
/etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
```

수동 갱신 테스트:
```bash
sudo certbot renew --dry-run
```

---

## 프로젝트 구조

```
portfolio-backend/
├── .github/workflows/
│   └── deploy.yml              # CI/CD (develop → Dev, main → Prod)
├── migrations/
│   ├── 2026-02-09-add-supabase-oauth.sql
│   └── 2026-02-20-create-thumbnails-storage.sql
├── nginx/
│   ├── nginx.conf              # Nginx 설정 (Let's Encrypt)
│   └── ssl/                    # 인증서 (서버에서 관리, git 제외)
├── src/
│   ├── common/
│   │   ├── services/
│   │   │   ├── view-count.service.ts
│   │   │   └── tasks.service.ts
│   │   ├── guards/
│   │   └── utils/
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
├── deploy.sh                   # 서버 배포 스크립트 (CI/CD에서 호출)
├── docker-compose.yml          # Production
├── docker-compose.dev.yml      # Dev (Nginx + App + Redis)
├── Dockerfile
├── schema.sql                  # 전체 DB 스키마
└── .env.example
```

---

## DB 스키마

`schema.sql` 참고. `portfolio` schema 사용.

**초기 설정 (Supabase SQL Editor):**
```sql
CREATE SCHEMA IF NOT EXISTS portfolio;
-- schema.sql 전체 실행
-- RLS 비활성화
ALTER TABLE portfolio.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.users DISABLE ROW LEVEL SECURITY;
```

---

## API

Swagger: https://hsm9411.duckdns.org/api

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | /projects | 목록 | - |
| GET | /projects/:id | 상세 | - |
| POST | /projects | 생성 | 관리자 |
| PATCH | /projects/:id | 수정 | 작성자/관리자 |
| DELETE | /projects/:id | 삭제 | 작성자/관리자 |
| GET | /posts | 목록 | - |
| GET | /posts/:id | 상세 | - |
| POST | /posts | 작성 | 로그인 |
| PUT | /posts/:id | 수정 | 작성자 |
| DELETE | /posts/:id | 삭제 | 작성자 |
| GET | /comments/:type/:id | 댓글 목록 | - |
| POST | /comments/:type/:id | 댓글 작성 | 로그인 |
| POST | /likes/toggle | 좋아요 토글 | 로그인 |
| GET | /auth/me | 내 정보 | 로그인 |

---

## 트러블슈팅

**데이터가 안 보임:**
```sql
-- RLS 상태 확인
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'portfolio';
-- 모두 false여야 함
```

**JWT 인증 실패:**
- Supabase Dashboard → Settings → API → JWT Secret 재확인
- `SUPABASE_URL` trailing slash 없는지 확인

**Nginx 502:**
```bash
docker logs portfolio-nginx-dev --tail 30
docker logs portfolio-backend-dev --tail 30
```

---

## Author

**hsm9411** | haeha2e@gmail.com | [@hsm9411](https://github.com/hsm9411)

**Last Updated**: 2026-02-23
