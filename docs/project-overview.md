# Portfolio Backend — 프로젝트 전체 정리

> 최종 업데이트: 2026-04-20 / 최신 완료 이슈: BACK-18

---

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                     클라이언트 (Frontend)                 │
│              C:\hsm9411\portfolio-frontend               │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (443)
                         ▼
┌─────────────────────────────────────────────────────────┐
│           portfolio-nginx (공유, 포트 80/443)             │
│   hsm9411.duckdns.org     → portfolio-backend:3000      │
│   hsm9411-dev.duckdns.org → portfolio-backend-dev:3000  │
└────────────┬────────────────────────┬───────────────────┘
             │  global-portfolio-network (Docker bridge)  │
             ▼                                            ▼
┌────────────────────────┐            ┌────────────────────────┐
│  portfolio-backend     │            │  portfolio-backend-dev │
│  NestJS :latest (main) │            │  NestJS :develop (dev) │
│  expose 3000 (내부전용) │            │  expose 3000 (내부전용) │
└──────────┬─────────────┘            └──────────┬─────────────┘
           │ internal network                     │ internal network
           ▼                                      ▼
┌────────────────────────┐            ┌────────────────────────┐
│  portfolio-redis       │            │  portfolio-redis-dev   │
│  redis:7-alpine        │            │  redis:7-alpine        │
│  expose 6379 (내부전용) │            │  expose 6379 (내부전용) │
└────────────────────────┘            └────────────────────────┘

           └──────────────────┬──────────────────┘
                              ▼
                   ┌─────────────────┐
                   │  Supabase       │
                   │  PostgreSQL     │
                   │  (portfolio     │
                   │   schema)       │
                   └─────────────────┘

인프라: Oracle Cloud VM.Standard.E2.1.Micro (Always Free)
IP: 158.180.75.205 / Specs: 1 vCPU, 1GB RAM
외부 포트: 80(→443 리다이렉트), 443 만 노출. 3000/6379 절대 미노출.
```

---

## 2. CI/CD 파이프라인

```
개발자 로컬
    │
    │  git push (feat/BACK-N 브랜치)
    ▼
GitHub PR → develop 머지
    │
    ▼
GitHub Actions (.github/workflows/deploy.yml)
    │
    ├─── [develop 브랜치] ─────────────────────────────┐
    │    Job 1: build-and-push                         │
    │      - multi-stage Docker 빌드 (node:22-alpine)  │
    │      - GHCR에 :develop, :develop-{sha} 태그 push │
    │    Job 2: deploy-dev                             │
    │      - docker-compose.dev.yml → ~/portfolio-backend-dev/docker-compose.yml
    │      - nginx conf 배포 → Nginx reload            │
    │      - deploy.sh (IMAGE_TAG=develop)             │
    │        · docker pull :develop                    │
    │        · docker compose stop app → rm -f → up   │
    │        · docker image prune -f (dangling만)      │
    │      - 헬스체크: https://hsm9411-dev.duckdns.org/health
    │                                                  ▼
    │                                      Dev 배포 완료
    │
    └─── [main 브랜치] ────────────────────────────────┐
         Job 1: build-and-push                         │
           - GHCR에 :latest, :main-{sha} 태그 push     │
         Job 2: deploy-prod                            │
           - docker-compose.yml → ~/portfolio-backend/ │
           - nginx conf 배포 → Nginx reload            │
           - deploy.sh (IMAGE_TAG=latest)              │
             · docker pull :latest                     │
             · docker compose stop app → rm -f → up   │
             · docker image prune -f (dangling만)      │
           - 헬스체크: https://hsm9411.duckdns.org/health
                                                      ▼
                                           Prod 배포 완료

서버 디렉토리:
  ~/portfolio-backend/      ← prod (Nginx 파일도 여기서 관리)
  ~/portfolio-backend-dev/  ← dev
```

---

## 3. NestJS 앱 모듈 구성

```
AppModule
├── ConfigModule (global)       ── .env 로드
├── TypeOrmModule               ── PostgreSQL (Supabase, portfolio 스키마)
├── CacheModule (global)        ── Redis (cache-manager-redis-yet, 기본 TTL 600s)
├── ThrottlerModule             ── 60req/min
├── ScheduleModule              ── 30분 cron (View Count DB 동기화)
├── WinstonModule               ── 로그 (Console + error.log/combined.log)
├── PrometheusModule            ── GET /metrics
├── TerminusModule              ── GET /health (TypeORM DB ping)
│
├── CommonModule
│   ├── ViewCountService        ── Redis Write-back 조회수 버퍼
│   ├── RevalidationService     ── Next.js ISR 웹훅 (지수 백오프 재시도)
│   └── ThrottlerBehindProxyGuard ── Cloudflare 프록시 X-Forwarded-For 처리
│
├── AuthModule
│   ├── JwtStrategy             ── Local JWT (HS256, jti 블랙리스트 검증)
│   ├── SupabaseJwtStrategy     ── Supabase OAuth (ES256, JWKS 공개키 검증)
│   ├── JwtAuthGuard            ── 인증 필수
│   └── OptionalJwtAuthGuard    ── 비로그인 허용 (req.user = null)
│
├── ProjectsModule
├── PostsModule
├── CommentsModule
└── LikesModule

전역 설정 (main.ts):
  - helmet() 보안 헤더
  - trust proxy: true (Cloudflare/Nginx 환경)
  - CORS: env.CORS_ORIGINS (콤마 구분 화이트리스트 또는 '*')
  - ValidationPipe (whitelist, forbidNonWhitelisted, transform)
  - Swagger: GET /api
  - 포트: env.PORT || 3000
```

---

## 4. 인증 흐름

```
【Local 로그인】
  POST /auth/register { email, password, nickname }
    → bcrypt.hash → User 저장

  POST /auth/login { email, password }
    → bcrypt.compare → jwtService.sign({ sub, email, jti: uuid })
    → { accessToken, user } (토큰 만료: 7일)

  이후 요청 (Bearer <token>)
    → JwtStrategy.validate()
        ├── Redis auth:blacklist:{jti} 존재 → 401
        ├── DB User 조회 없음 → 401
        └── req.user 주입

  POST /auth/logout (JWT 필수)
    → 토큰의 jti, exp 추출
    → Redis SET auth:blacklist:{jti} "1" EX=(잔여 만료초)
    → 204 No Content


【Supabase OAuth 로그인】
  클라이언트에서 supabase.auth.signInWithOAuth({ provider: 'google'|'github' })
    → Supabase가 OAuth 처리 후 ES256 JWT 발급

  이후 요청 (Bearer <supabase-jwt>)
    → SupabaseJwtStrategy.validate()
        ├── Supabase JWKS 엔드포인트에서 공개키 검증
        ├── portfolio.users upsert (supabase_user_id 기준)
        └── env.ADMIN_EMAILS 포함 여부 → isAdmin 설정

  POST /auth/sync-oauth-user (JWT 필수)
    → Supabase 사용자 정보 수동 동기화
```

---

## 5. 전체 API 엔드포인트

```
【인증】                                인증 방식
  POST   /auth/register              공개    회원가입 (Local)
  POST   /auth/login                 공개    로그인 → accessToken 반환
  GET    /auth/me                    JWT     현재 사용자 정보
  POST   /auth/logout                JWT     로그아웃 (jti 블랙리스트)
  POST   /auth/sync-oauth-user       JWT     OAuth 사용자 수동 동기화

【프로젝트】
  GET    /projects                   Optional  목록 (page/limit/search/status/sortBy)
  GET    /projects/featured          공개       추천 프로젝트 (featured=true)
  GET    /projects/:id               Optional  단건 + 조회수 증가
  POST   /projects                   JWT       생성 (관리자만)
  PATCH  /projects/:id               JWT       수정 (작성자/관리자)
  DELETE /projects/:id               JWT       삭제 (작성자/관리자)

【포스트】
  GET    /posts                      공개      목록 (page/limit/search/tag/sortBy)
  GET    /posts/tags                 공개      태그 목록 + 카운트
  GET    /posts/my                   JWT       내 글 목록 (초안 포함)
  GET    /posts/:id                  Optional  단건 + 조회수 증가 (초안은 작성자만)
  POST   /posts                      JWT       생성
  PUT    /posts/:id                  JWT       수정 (작성자)
  PATCH  /posts/:id/publish          JWT       발행/초안 토글 (작성자)
  DELETE /posts/:id                  JWT       삭제 (작성자)

【댓글】
  GET    /comments/:type/:targetId   Optional  목록 (페이지네이션, 익명 마스킹)
  POST   /comments/:type/:targetId   JWT       작성 (isAnonymous, parentId 지원)
  PUT    /comments/:id               JWT       수정 (작성자)
  DELETE /comments/:id               JWT       삭제 (작성자/관리자, 소프트삭제)

【좋아요】
  GET    /likes/:type/:targetId      Optional  좋아요 수 + 내 좋아요 여부
  POST   /likes/:type/:targetId      JWT       좋아요 토글

【시스템】
  GET    /health                     공개      DB 헬스체크 (TypeORM ping)
  GET    /metrics                    공개      Prometheus 메트릭
  GET    /api                        공개      Swagger UI
  GET    /                           공개      루트 (헬스체크용)

:type = 'project' | 'post'
Optional = OptionalJwtAuthGuard (비로그인 허용, 로그인 시 req.user 주입)
```

---

## 6. 엔티티 & DB 구조

```
PostgreSQL (Supabase) — schema: portfolio

┌──────────────────────────────────────────────────────────────┐
│ users                                                        │
│  id(uuid PK) │ email(uniq) │ supabase_user_id(uniq,null)    │
│  password(null) │ nickname │ avatar_url │ bio               │
│  github_url │ linkedin_url │ website_url                    │
│  is_admin(bool,default:false) │ provider │ provider_id      │
│  created_at │ updated_at                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ posts                                                        │
│  id(uuid PK) │ title │ summary │ content │ thumbnail_url    │
│  category │ tags(text[]) │ is_published(bool,default:false) │
│  view_count(int,default:0) │ like_count │ comment_count     │
│  reading_time(int,분) │ author_id(FK→users)                 │
│  author_nickname │ author_avatar_url                        │
│  created_at │ updated_at │ published_at(null)               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ projects                                                     │
│  id(uuid PK) │ title │ summary │ description                │
│  thumbnail_url │ demo_url │ github_url                      │
│  tech_stack(text[]) │ tags(text[]) │ status │ featured(bool)│
│  view_count(int) │ like_count │ comment_count               │
│  start_date │ end_date                                      │
│  author_id(FK→users) │ author_nickname │ author_avatar_url  │
│  created_at │ updated_at                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ comments                                                     │
│  id(uuid PK) │ target_type('project'|'post') │ target_id    │
│  content │ is_deleted(bool,소프트삭제) │ is_anonymous(bool) │
│  author_id(FK→users,null) │ author_nickname │ author_avatar_url
│  author_email │ author_ip                                   │
│  parent_id(null → 중첩댓글) │ created_at │ updated_at       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ likes                                                        │
│  id(uuid PK) │ target_type │ target_id                      │
│  user_id(FK→users) │ created_at                             │
│  UNIQUE(target_type, target_id, user_id)                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Redis 사용 패턴

```
┌──────────────────────────────┬──────────────────────────────────────┐
│ Key 패턴                     │ 용도                                  │
├──────────────────────────────┼──────────────────────────────────────┤
│ projects:list:{JSON쿼리해시} │ 프로젝트 목록 캐시 (TTL 60s)          │
│ posts:list:{JSON쿼리해시}    │ 포스트 목록 캐시 (TTL 60s)            │
│ view:count:{type}:{id}       │ 조회수 Write-back 버퍼 (TTL 없음)     │
│ view:ip:{type}:{id}:{ip}     │ 중복 조회 방지 (TTL 24h)              │
│ auth:blacklist:{jti}         │ 로그아웃된 JWT (TTL=토큰 잔여초)      │
└──────────────────────────────┴──────────────────────────────────────┘

조회수 동기화 흐름:
  GET /projects/:id | GET /posts/:id
    │ ViewCountService.increment(type, id, ip)
    ├── view:ip:{type}:{id}:{ip} 존재 → 스킵 (24h 중복 방지)
    ├── Redis INCR view:count:{type}:{id}
    └── 30분 cron → DB UPDATE SET view_count (배치 동기화 후 키 삭제)

목록 캐시 무효화:
  POST/PATCH/DELETE → 해당 목록 캐시 키 수동 삭제 (CACHE_MANAGER.del)
  ISR 웹훅 → Next.js revalidate 호출 (지수 백오프 재시도)
```

---

## 8. 마이그레이션 이력

| 파일명 | 내용 |
|--------|------|
| `2026-02-09-add-supabase-oauth.sql` | `users.supabase_user_id` 컬럼 추가 |
| `2026-02-20-create-thumbnails-storage.sql` | Supabase Storage 버킷 + RLS 정책 |
| `2026-04-17-add-comment-avatar-and-project-comment-count.sql` | `comments.author_avatar_url`, `projects.comment_count` 추가 |
| `2026-04-19-add-comment-is-anonymous.sql` | `comments.is_anonymous` 컬럼 추가 |

---

## 9. 완료된 BACK 이슈 이력

| 이슈 | 내용 | 타입 |
|------|------|------|
| BACK-1 | POST /posts/:id/publish — 초안/발행 토글 엔드포인트 | feat |
| BACK-2 | GET /comments — 페이지네이션 추가 | feat |
| BACK-3 | README + 마이그레이션 문서 정리 | docs |
| BACK-4 | ViewCountService console.log → Logger 교체 | fix |
| BACK-5 | 미사용 incrementViewCount 메서드 제거 | chore |
| BACK-6 | PublishPostDto + @IsBoolean 검증 추가 | feat |
| BACK-7 | schema.sql 동기화 (comment avatar, project comment_count) | docs |
| BACK-8 | 미사용 View 엔티티 제거 | chore |
| BACK-9 | 초안 포스트 작성자/관리자 접근 제어 (OptionalJwt) | fix |
| BACK-10 | Helmet HTTP 보안 헤더 적용 | chore |
| BACK-11 | GET /projects/featured 엔드포인트 | feat |
| BACK-12 | GET /posts/tags 엔드포인트 (태그 집계) | feat |
| BACK-13 | 댓글 isAnonymous (로그인 기반 익명 댓글) | feat |
| BACK-14 | GET /health (Terminus + TypeORM DB ping) | feat |
| BACK-15 | Redis 목록 캐시 — GET /posts, GET /projects | feat |
| BACK-16 | projects sortBy 컬럼명 camelCase 버그 수정 | fix |
| BACK-17 | deploy.sh 컨테이너 이름 충돌 방지 (stop+rm+up 패턴) | fix |
| BACK-18 | POST /auth/logout (Redis JWT jti 블랙리스트) | feat |

---

## 10. 남은 백로그

```
우선순위 높음
  □ 이미지 업로드 — Supabase Storage 연동 (FRONT-35 연계)
  ✅ GET /posts sortBy — BACK-20 완료 (created_at, view_count, like_count / ASC,DESC)

우선순위 중간
  □ Refresh Token — 현재 7일 만료 액세스 토큰만 있음, 리프레시 없음
  □ Admin API — 통계 대시보드, 관리자 전용 엔드포인트

우선순위 낮음
  □ 단위/통합 테스트 — 현재 테스트 없음 (app.controller.spec.ts 기본만 존재)
  □ Grafana 대시보드 — Prometheus /metrics 시각화
```
