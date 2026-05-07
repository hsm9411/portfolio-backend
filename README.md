# Portfolio Backend

[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088ff)](.github/workflows/deploy.yml)

NestJS 11 + TypeORM + Supabase PostgreSQL + Redis 기반 포트폴리오 & 기술 블로그 백엔드.
**Oracle Cloud Free Tier 2대 서버**(prod/dev)로 분리 운영, **Prometheus + Grafana**로 풀 스택 모니터링.

**Live**
- Production : https://hsm9411.duckdns.org
- Swagger    : https://hsm9411.duckdns.org/api
- Dev        : https://hsm9411-dev.duckdns.org
- Grafana    : https://hsm9411-dev.duckdns.org/grafana

---

## 목차

1. [아키텍처](#아키텍처)
2. [기술 스택](#기술-스택)
3. [핵심 기능](#핵심-기능)
4. [프로젝트 구조](#프로젝트-구조)
5. [환경 변수](#환경-변수)
6. [로컬 개발](#로컬-개발)
7. [API](#api)
8. [DB / 마이그레이션](#db--마이그레이션)
9. [배포 (CI/CD)](#배포-cicd)
10. [모니터링](#모니터링)
11. [트러블슈팅](#트러블슈팅)

---

## 아키텍처

### 2대 서버 분리 구조

```
┌──────────────── Server 1 — Prod (158.180.75.205, hsm9411.duckdns.org) ────────────────┐
│                                                                                        │
│   portfolio-nginx ── 443 ──► portfolio-backend (:latest)                               │
│                                  │                                                     │
│                                  └─► portfolio-redis (maxmemory 256mb, allkeys-lru)    │
│                                                                                        │
│   exporters: portfolio-node-exporter / portfolio-cadvisor /                            │
│              portfolio-nginx-exporter / portfolio-redis-exporter                       │
│                                                                                        │
└────────────────────────────────────────────────────┬───────────────────────────────────┘
                                                     │  Prometheus pull
                                                     │  (scrape /metrics)
                                                     ▼
┌─────────── Server 2 — Dev + Monitoring Hub (152.67.216.145, hsm9411-dev.duckdns.org) ──┐
│                                                                                         │
│   portfolio-nginx ── 443 ──► portfolio-backend-dev (:develop)                           │
│                                  │                                                      │
│                                  └─► portfolio-redis-dev                                │
│                                                                                         │
│   monitoring stack:                                                                     │
│     portfolio-prometheus  (TSDB 30d, /-/reload 무중단 갱신)                             │
│     portfolio-grafana     (provisioning: datasources + dashboards)                      │
│     +4 exporters (node / cadvisor / nginx / redis)                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

         ▼ Supabase PostgreSQL (portfolio / portfolio_dev 스키마)
         users · projects · project_updates · posts · comments · likes
```

- **외부 노출은 443만**. 백엔드/Redis/exporter 컨테이너는 모두 Docker 내부 네트워크 전용.
- `global-portfolio-network` (Docker bridge)에 nginx와 backend가 함께 묶이고, Redis/exporter는 각 서버 내부망으로 격리.
- prod `/metrics`는 nginx에서 `allow 152.67.216.145; deny all;`로 Prometheus 호스트만 통과.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | NestJS 11, TypeScript 5.7 |
| ORM / DB | TypeORM 0.3, Supabase PostgreSQL (`portfolio` / `portfolio_dev` schema) |
| Cache | Redis 7-alpine (`@nestjs/cache-manager` + `@keyv/redis`) |
| Auth | Supabase OAuth (Google/GitHub/Kakao) + `jwks-rsa` ES256 검증 + Local JWT (refresh token rotation) |
| Validation | `class-validator`, `class-transformer`, `ValidationPipe(whitelist + forbidNonWhitelisted)` |
| Security | `helmet`, `@nestjs/throttler` (60 req/min/IP), Cloudflare-aware proxy guard |
| Scheduling | `@nestjs/schedule` (Redis → DB view-count sync) |
| Logger | `nest-winston` + Winston |
| Health | `@nestjs/terminus` (`GET /health` — DB ping) |
| Metrics | `@willsoto/nestjs-prometheus` + `prom-client` (`GET /metrics`) |
| Docs | `@nestjs/swagger` (`GET /api`) |
| Container | Docker, Docker Compose v2 |
| Reverse Proxy / TLS | Nginx 1.25, Let's Encrypt (DuckDNS + certbot) |
| CI/CD | GitHub Actions → GHCR → SSH to Oracle Cloud |
| Monitoring | Prometheus v2.55 + Grafana 11.3 (4개 community 대시보드) |

---

## 핵심 기능

### 인증 (`/auth`)
- Supabase OAuth JWT(ES256)를 `jwks-rsa`로 비대칭키 검증 → 첫 로그인 시 `portfolio.users` 자동 생성.
- `POST /auth/sync-oauth-user`로 Local Access/Refresh Token 발급 → 이후 요청은 Local JWT.
- **Refresh Token rotation + 재사용 감지**: 구 토큰 사용 시 사용자 전체 토큰 무효화.
- `POST /auth/logout`은 Access Token 블랙리스트 + Refresh Token 폐기.
- `ADMIN_EMAILS` 환경변수 기반 `isAdmin` 자동 부여.

### Projects (`/projects`)
- CRUD + 페이지네이션 + 검색 + 정렬, status 필터(`in-progress` / `completed` / `archived`).
- `featured` 플래그 / 별도 `GET /projects/featured` 엔드포인트.
- 상세 조회 시 Redis Write-Back 조회수 증가 (IP+ID 24h 중복 방지).

### ProjectUpdates (`/projects/:projectId/updates`)
- 프로젝트별 변경 이력 타임라인 (관리자 작성).
- 프로젝트 카드/상세에서 changelog로 노출.

### Posts (`/posts`)
- Draft / Publish 분리, `GET /posts/my`로 본인 draft 조회.
- 카테고리(`tutorial` / `essay` / `review` / `news`), 태그 GIN 인덱스 + `GET /posts/tags`.
- ISR 웹훅: 글 저장/발행 시 Vercel `/api/revalidate` 호출 (exponential backoff retry, fire-and-forget).

### Comments (`/comments/:type/:id`)
- Polymorphic (`project` / `post`), 대댓글 (`parent_id`), 익명 댓글 옵션.
- 작성자/관리자 삭제 권한, 페이지네이션.

### Likes (`/likes/:type/:id`)
- UNIQUE 제약 기반 토글, 미인증 사용자도 상태 조회 가능 (`OptionalJwtAuthGuard`).

### 조회수 (Redis Write-Back)
- `GET /projects/:id`, `GET /posts/:id` 호출 시 Redis `INCR view:{type}:{id}`.
- IP 단위 24h TTL 키로 중복 방지.
- 매일 자정 Cron(`@nestjs/schedule`)으로 Redis → Supabase `view_count` 동기화 + key 삭제.

### Rate Limiting
- 전역 `ThrottlerModule` (60 req/min/IP).
- `ThrottlerBehindProxyGuard`로 Cloudflare/nginx 프록시 환경에서 실제 IP 기준.
- 목록 조회 등 idempotent endpoint는 `@SkipThrottle()`.

---

## 프로젝트 구조

```
portfolio-backend/
├── .github/workflows/
│   ├── deploy.yml                    # lint → build(GHCR) → deploy(prod/dev)
│   └── diagnose-cadvisor.yml         # cAdvisor 진단 (workflow_dispatch)
│
├── docs/                             # 운영 가이드
│   ├── monitoring-guide.md
│   ├── isr-revalidation-guide.md
│   ├── redis-guide.md
│   ├── server-infrastructure.md
│   └── project-overview.md
│
├── migrations/                       # 손으로 관리하는 SQL 마이그레이션
├── seeds/                            # portfolio_dev_seed.sql
├── schema.sql                        # 신규 DB 부트스트랩 전체 스키마
│
├── nginx/conf.d/
│   ├── portfolio-prod.conf           # Server 1
│   └── portfolio-dev.conf            # Server 2
│
├── monitoring/
│   ├── docker-compose.monitoring.yml # Prometheus + Grafana + 4 exporter (Server 2)
│   ├── docker-compose.exporters.yml  # node + cadvisor + nginx + redis exporter (Server 1)
│   ├── prometheus/prometheus.yml
│   └── grafana/provisioning/
│       ├── datasources/prometheus.yml
│       └── dashboards/
│           ├── dashboards.yml
│           ├── download-dashboards.py
│           └── json/                 # #1860, #12708, #763, #14282
│
├── src/
│   ├── main.ts                       # helmet + trust proxy + CORS + ValidationPipe + Swagger
│   ├── app.module.ts                 # Throttler / Cache / Prometheus / Schedule / Winston
│   ├── health.controller.ts          # GET /health (terminus)
│   │
│   ├── common/
│   │   ├── services/
│   │   │   ├── view-count.service.ts # Redis 조회수
│   │   │   └── revalidation.service.ts  # ISR 웹훅 (retry)
│   │   ├── guards/throttler-behind-proxy.guard.ts
│   │   └── utils/ip.util.ts
│   │
│   ├── config/                       # database, redis, logger
│   ├── entities/                     # user, project, project-update, post, comment, like
│   └── modules/
│       ├── auth/                     # supabase-jwt + local-jwt strategies, refresh rotation
│       ├── projects/
│       ├── project-updates/
│       ├── posts/
│       ├── comments/
│       └── likes/
│
├── docker-compose.yml                # Prod (backend + redis)
├── docker-compose.dev.yml            # Dev  (backend-dev + redis-dev)
├── docker-compose.nginx.yml          # 통합 Nginx (prod/dev 공통)
├── deploy.sh                         # docker compose up -d 전체 reconcile
├── Dockerfile                        # multi-stage (node:22-alpine)
├── eslint.config.mjs                 # ESLint flat config
└── .env.example
```

---

## 환경 변수

`.env.example` 참고. 주요 항목:

```env
# ── Database (Supabase) ────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
DB_SCHEMA=portfolio              # dev: portfolio_dev

# ── Supabase OAuth ─────────────────────────────────────────────────
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_JWT_SECRET=<jwt-secret-from-dashboard>

# ── Local JWT (Refresh Token Rotation) ─────────────────────────────
JWT_SECRET=<change-me>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7

# ── Redis ──────────────────────────────────────────────────────────
REDIS_HOST=portfolio-redis        # dev: portfolio-redis-dev / local: localhost
REDIS_PORT=6379
REDIS_TTL=600

# ── Server / CORS ──────────────────────────────────────────────────
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://portfolio-front-ten-gamma.vercel.app,https://*.vercel.app

# ── ISR Webhook ────────────────────────────────────────────────────
FRONTEND_URL=https://portfolio-front-ten-gamma.vercel.app
REVALIDATE_SECRET=<shared-with-frontend>

# ── Admin ──────────────────────────────────────────────────────────
ADMIN_EMAILS=admin@example.com
```

---

## 로컬 개발

```bash
# 1. 의존성
npm ci

# 2. .env 작성 (Supabase 자격증명, ADMIN_EMAILS 본인 이메일)
cp .env.example .env

# 3. Redis 띄우기 (선택 — 조회수 기능 테스트 시)
docker run -d --name redis-local -p 6379:6379 redis:7-alpine

# 4. NestJS dev mode (HMR)
npm run start:dev          # http://localhost:3000  /  Swagger: /api

# 5. Lint / Test
npm run lint               # --fix 포함
npm run lint:ci            # CI gate (--fix 없음)
npm test                   # Jest 유닛 테스트
npm run test:cov
```

> **커밋 전 반드시 `npm run lint`** — CI가 `lint:ci`로 게이트. 실패 시 build/deploy 스킵.

---

## API

Swagger UI: https://hsm9411.duckdns.org/api

### Auth
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET    | `/auth/me` | Bearer | 현재 사용자 |
| POST   | `/auth/sync-oauth-user` | Bearer (Supabase JWT) | Local Access/Refresh Token 발급 |
| POST   | `/auth/refresh` | - | Refresh rotation |
| POST   | `/auth/logout` | Bearer | Access 블랙리스트 + Refresh 폐기 |

### Projects / ProjectUpdates
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET    | `/projects` | - | 목록 (page, limit, status, search, sort) |
| GET    | `/projects/featured` | - | featured=true 목록 |
| GET    | `/projects/:id` | optional | 상세 + 조회수 증가 |
| POST   | `/projects` | admin | 생성 |
| PATCH  | `/projects/:id` | author/admin | 수정 |
| DELETE | `/projects/:id` | author/admin | 삭제 |
| GET    | `/projects/:projectId/updates` | - | 변경 이력 타임라인 |
| POST   | `/projects/:projectId/updates` | admin | 업데이트 작성 |
| PATCH  | `/projects/updates/:updateId` | admin | 수정 |
| DELETE | `/projects/updates/:updateId` | admin | 삭제 |

### Posts
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET    | `/posts` | - | 목록 (published만) |
| GET    | `/posts/tags` | - | 사용 중인 태그 + count |
| GET    | `/posts/my` | Bearer | 내 글 (draft 포함) |
| GET    | `/posts/:id` | optional | 상세 + 조회수 증가 (draft는 작성자/admin만) |
| POST   | `/posts` | Bearer | 작성 |
| PUT    | `/posts/:id` | author | 수정 |
| PATCH  | `/posts/:id/publish` | author | 발행/취소 토글 |
| DELETE | `/posts/:id` | author | 삭제 |

### Comments / Likes
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET    | `/comments/:targetType/:targetId` | optional | 댓글 목록 (페이지네이션) |
| POST   | `/comments/:targetType/:targetId` | Bearer | 작성 (`isAnonymous` 옵션) |
| PUT    | `/comments/:id` | author | 수정 |
| DELETE | `/comments/:id` | author/admin | 삭제 |
| GET    | `/likes/:targetType/:targetId` | optional | 상태 |
| POST   | `/likes/:targetType/:targetId` | Bearer | 토글 |

### System
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET    | `/health`  | DB ping (Terminus) |
| GET    | `/metrics` | Prometheus exposition (default + custom) |
| GET    | `/api`     | Swagger UI |

`targetType` ∈ `project` / `post`.

---

## DB / 마이그레이션

신규 DB 부트스트랩은 Supabase SQL Editor에서 `schema.sql` 일괄 실행.

기존 DB는 `migrations/` 안의 SQL을 날짜순으로 적용:

```
migrations/
├── 2026-02-09-add-supabase-oauth.sql
├── 2026-02-20-create-thumbnails-storage.sql
├── 2026-04-17-add-comment-avatar-and-project-comment-count.sql
├── 2026-04-19-add-comment-is-anonymous.sql
├── 2026-04-20-add-image-urls.sql
├── 2026-04-20-create-dev-schema.sql        # portfolio_dev 스키마 생성
└── 2026-04-20-create-project-updates.sql
```

RLS는 비활성화(애플리케이션 레벨 접근 제어):

```sql
ALTER TABLE portfolio.users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.projects        DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.project_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.posts           DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.comments        DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio.likes           DISABLE ROW LEVEL SECURITY;
```

dev 환경 시드는 `seeds/portfolio_dev_seed.sql`.

---

## 배포 (CI/CD)

`.github/workflows/deploy.yml`이 모든 배포를 담당. **SSH 직접 접속이나 수동 docker 명령은 금지** — 컨테이너 ID 불일치로 이후 CI/CD가 깨짐.

### 흐름

```
PR 오픈/업데이트 ─► lint 만 실행 (build/deploy 스킵)

push develop ─► lint ─► build :develop (GHCR) ─► deploy-dev  ─► Server 2
push main    ─► lint ─► build :latest  (GHCR) ─► deploy-prod ─► Server 1
```

`deploy.sh` (양 서버 공통):
```bash
docker pull ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}
docker compose up -d        # 전체 reconcile (Compose v2 image diff + config diff)
docker image prune -f
```
> `--remove-orphans` 미사용 — prod에서 nginx와 같은 디렉토리/프로젝트명 공유로 orphan 오인 삭제 위험.

### GitHub Actions Secrets

| Secret | 용도 |
|--------|------|
| `ORACLE_USER` | SSH user (ubuntu) |
| `ORACLE_HOST_PROD` | Server 1 IP |
| `ORACLE_SSH_KEY_PROD` | Server 1 PEM key |
| `ORACLE_HOST_DEV` | Server 2 IP |
| `ORACLE_SSH_KEY_DEV` | Server 2 PEM key |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin 비밀번호 (Server 2) |

### Image Registry

- `ghcr.io/hsm9411/portfolio-backend:latest`  ← main
- `ghcr.io/hsm9411/portfolio-backend:develop` ← develop
- `ghcr.io/hsm9411/portfolio-backend:{branch}-{sha}` ← 추적용

### SSL

DuckDNS + Let's Encrypt + `certbot-dns-duckdns`. 갱신 hook이 nginx reload 호출.
```bash
sudo certbot renew --dry-run
sudo certbot certificates
```

---

## 모니터링

Prometheus(pull 모델, 15s scrape, 30d retention) + Grafana(11.3, provisioning) 풀 스택.

### Scrape Targets (`monitoring/prometheus/prometheus.yml`)

| job_name | target | server label |
|----------|--------|--------------|
| `backend-dev`     | `portfolio-backend-dev:3000`            | dev |
| `backend-prod`    | `https://hsm9411.duckdns.org/metrics`   | prod |
| `node_exporter`   | `10.0.0.196:9100` / `10.0.0.34:9100`    | dev / prod |
| `cadvisor`        | `cadvisor:8080` / `10.0.0.34:8080`      | dev / prod |
| `nginx`           | `portfolio-nginx-exporter-dev:9113` / `10.0.0.34:9113` | dev / prod |
| `redis_exporter`  | `portfolio-redis-exporter-dev:9121` / `10.0.0.34:9121` | dev / prod |

### 대시보드 (Grafana provisioning)

| ID | 이름 | 상태 |
|----|------|------|
| #1860  | Node Exporter Full         | dev/prod |
| #12708 | NGINX Prometheus Exporter  | dev/prod |
| #763   | Redis Dashboard            | dev/prod (maxmemory 256mb로 +Inf 해결) |
| #14282 | cAdvisor                   | dev/prod (cAdvisor v0.56.2) |

대시보드 추가/패치는 `monitoring/grafana/provisioning/dashboards/download-dashboards.py`에서 일괄 관리. UI에서 직접 수정해도 30초 폴링 후 Git 버전으로 덮어쓰여짐.

> 자세한 운영/추가 가이드: [docs/monitoring-guide.md](docs/monitoring-guide.md)

### 무중단 설정 갱신

```bash
docker exec portfolio-prometheus wget -qO- --post-data='' http://localhost:9090/-/reload
```

---

## 트러블슈팅

**502 Bad Gateway**
```bash
docker logs portfolio-nginx --tail 30
docker logs portfolio-backend --tail 30
docker network inspect global-portfolio-network
```

**JWT 인증 실패**
- Supabase Dashboard → Settings → API → JWT Secret 변경 시 `SUPABASE_JWT_SECRET` 재배포.
- `SUPABASE_URL` trailing slash 없는지.
- Refresh rotation 재사용 감지로 강제 로그아웃 가능 — DB의 refresh_tokens 확인.

**조회수 미반영**
```bash
docker exec -it portfolio-redis redis-cli
> KEYS view:*
# Cron은 매일 자정. 즉시 확인하려면 컨테이너에서 syncViewCounts 트리거.
```

**Grafana 패널이 No data**
1. `docker exec portfolio-prometheus wget -qO- http://localhost:9090/api/v1/targets` — target UP?
2. Grafana → Explore → 메트릭 이름 직접 쿼리
3. 메트릭 이름이 exporter 버전 사이에 바뀌었을 수 있음 (BACK-69 사례: `container_memory_cache` → `container_memory_(active|inactive)_file_bytes`)

**대시보드 변경 미반영**
- Grafana는 30초마다 `dashboards/json/` 폴링. 수동 reload 불필요.
- UI 직접 수정분은 사라짐 — `download-dashboards.py` 또는 JSON 파일 수정 후 커밋.

**프로덕션 직접 조작 후 CI 실패**
- 수동 `docker run`/`docker compose up`이 컨테이너 이름 점유 → 다음 CI의 `docker compose up -d`가 충돌.
- `docker rm -f portfolio-backend portfolio-redis` 후 다시 워크플로우 트리거.

---

## 프로젝트 운영 규칙 (요약)

- 새 작업 → Jira `BACK-N` 이슈 → `feat/BACK-{N}-...` 또는 `fix/BACK-{N}-...` 브랜치.
- `develop`에 직접 커밋 금지. 머지된 브랜치에 추가 커밋 금지 — 항상 새 브랜치.
- 커밋 메시지: `type(BACK-N): 설명`.
- `develop` → `main` 릴리즈는 별도 PR.

---

## Author

**hsm9411** · haeha2e@gmail.com · [@hsm9411](https://github.com/hsm9411)

Last Updated: 2026-05-07 (BACK-73)
