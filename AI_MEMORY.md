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

## ✅ 완료된 작업

### 2026-02-07 (프로젝트 초기화)

#### 1. 프로젝트 초기화
- ✅ NestJS CLI로 프로젝트 생성
- ✅ 패키지 설치:
  - TypeORM + PostgreSQL
  - JWT + Passport (OAuth)
  - Redis (cache-manager-redis-yet)
  - Swagger
  - Prometheus
  - Class-validator/transformer

#### 2. 설정 파일
- ✅ `.env.example`: 환경 변수 템플릿
- ✅ `.gitignore`: Git 무시 파일
- ✅ `config/database.config.ts`: TypeORM 설정
- ✅ `config/redis.config.ts`: Redis 캐시 설정

#### 3. 데이터베이스
- ✅ `schema.sql`: DB 초기화 SQL 작성
- ✅ Entity 생성 (User, Project, Post, Comment, Like, View)
- ✅ 인덱스 최적화 (Full-text search 포함)
- ✅ RLS (Row Level Security) 정책

#### 4. 기본 설정
- ✅ `main.ts`: Swagger, CORS, Validation Pipe 설정
- ✅ `app.module.ts`: TypeORM, Redis, Prometheus 통합

#### 5. Git 설정
- ✅ Git 저장소 초기화
- ✅ GitHub 레포 생성 및 연결 (https://github.com/hsm9411/portfolio-backend)
- ✅ main 브랜치 push
- ✅ develop 브랜치 생성 및 push

---

### 2026-02-07 (Auth 모듈 구현)

#### Auth 모듈 완료 ✅
- ✅ **DTO**: RegisterDto, LoginDto, AuthResponseDto
- ✅ **Strategies**: JwtStrategy, GoogleStrategy, GithubStrategy
- ✅ **Guards**: JwtAuthGuard, OptionalJwtAuthGuard
- ✅ **Service**:
  - Local 회원가입/로그인 (bcrypt 비밀번호 해싱)
  - Google OAuth 사용자 처리
  - GitHub OAuth 사용자 처리
  - JWT 토큰 생성
- ✅ **Controller**:
  - POST /auth/register - 회원가입
  - POST /auth/login - 로그인
  - GET /auth/me - 현재 사용자 정보 조회
  - GET /auth/google - Google OAuth 시작
  - GET /auth/google/callback - Google OAuth 콜백
  - GET /auth/github - GitHub OAuth 시작
  - GET /auth/github/callback - GitHub OAuth 콜백
- ✅ **Module**: 모든 Provider 등록 및 export

---

### 2026-02-07 (CI/CD 및 배포 구성)

#### CI/CD 완료 ✅
- ✅ **GitHub Actions Workflow** (.github/workflows/deploy.yml)
  - main 브랜치: Production 배포 (포트 3000)
  - develop 브랜치: Development 배포 (포트 3001)
  - Docker 이미지 빌드 및 GHCR push
  - Oracle Cloud SSH 배포 자동화

#### Docker 설정 완료 ✅
- ✅ **Dockerfile**: Multi-stage 빌드 (builder + production)
- ✅ **docker-compose.yml**: NestJS + Redis 오케스트레이션
- ✅ **Health Check**: 애플리케이션 상태 모니터링
- ✅ **.dockerignore**: 불필요한 파일 제외

#### 배포 스크립트 완료 ✅
- ✅ **deploy.sh**: 배포 자동화 스크립트
- ✅ **setup-server.sh**: 서버 초기 설정 스크립트
  - Docker & Docker Compose 설치
  - 방화벽 설정
  - 프로젝트 디렉토리 생성
  - .env 템플릿 생성

#### 문서화 완료 ✅
- ✅ **DEPLOY_GUIDE.md**: 상세한 배포 가이드
  - GitHub Secrets 설정 방법
  - 서버 초기 설정 절차
  - 배포 방법 (자동/수동)
  - 트러블슈팅 가이드
- ✅ **README.md**: Auth 완료 상태 업데이트, 배포 섹션 추가
- ✅ **아키텍처 다이어그램**: 모놀리식 구조 설명

#### 인프라 정보 ✅
- ✅ **Oracle Cloud Server**: 158.180.75.205 (1vCPU, 1GB)
- ✅ **Supabase DB**: protfolio 프로젝트 연결 완료
- ✅ **Redis**: 로컬 및 Docker 컨테이너 실행

#### TypeScript 오류 수정 ✅
- ✅ @nestjs/cache-manager 패키지 설치
- ✅ Response 타입 import 수정 (import type)
- ✅ ConfigService.get() 타입 안전성 개선
- ✅ JWT/OAuth Strategy 타입 수정

---

## 🚧 다음 작업 (우선순위)

### Task #1: Projects 모듈 구현
- [ ] 프로젝트 CRUD
- [ ] 조회수 카운터 (Redis)
- [ ] 좋아요 기능
- [ ] 필터링 (status, featured, tags)
- [ ] 검색 (Full-text)

### Task #2: Posts 모듈 구현
- [ ] 블로그 글 CRUD
- [ ] 카테고리/태그 필터링
- [ ] 조회수 카운터
- [ ] 좋아요 기능
- [ ] 마크다운 파싱 (읽기 시간 계산)

### Task #3: Comments 모듈 구현
- [ ] 댓글 CRUD
- [ ] 대댓글 (parent_id)
- [ ] 익명/로그인 구분
- [ ] 소프트 삭제 (is_deleted)

### Task #4: Likes 모듈 구현
- [ ] 좋아요 토글 (추가/취소)
- [ ] 중복 방지 (user_id 또는 IP)
- [ ] 카운터 동기화

### Task #5: Docker 및 배포
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

### 없음

Auth 모듈이 성공적으로 구현되었으며, 알려진 이슈는 없습니다.

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

### 로컬 개발 환경
- [x] ~~Auth 모듈 구현~~ ✅ 완료
- [x] ~~CI/CD 구성~~ ✅ 완료
- [x] ~~Docker 설정~~ ✅ 완료
- [x] ~~환경 변수 설정 (.env 파일)~~ ✅ 완료
- [x] ~~Redis 서버 실행~~ ✅ 완료
- [x] ~~개발 서버 실행 테스트~~ ✅ 완료

### 배포 준비
- [x] ~~**GitHub Secrets 설정**~~ ✅ 완료
- [x] ~~**Oracle Cloud 서버 초기 설정**~~ ✅ 완료
- [x] ~~**서버 .env 파일 설정**~~ ✅ 완료
- [x] ~~**GitHub Container Registry 로그인**~~ ✅ 완료
- [x] ~~**Supabase DB 스키마 적용**~~ ✅ 완료 (이미 존재)
- [ ] **배포 테스트 완료 확인** (다음 세션 첫 작업)
- [ ] **API 테스트** (Swagger, curl)
- [ ] **OAuth Client ID/Secret 설정** (Google, GitHub) - 선택사항

### Supabase 설정
- [x] ~~**SQL Editor에서 schema.sql 실행**~~ ✅ 완료
- [x] ~~**비밀번호 변경**~~ ✅ 완료 (N4xSSg9BKvpp3hq8)
- [ ] **테스트 데이터 추가** (선택사항)

---

## 📦 다음 구현 우선순위

### Phase 1: 핵심 모듈 구현
1. **Projects 모듈** - 프로젝트 포트폴리오 CRUD
   - Controller, Service, DTO 생성
   - 조회수 카운터 (Redis)
   - 검색 및 필터링
   - Swagger 문서화

2. **Posts 모듈** - 블로그 글 CRUD
   - Controller, Service, DTO 생성
   - 카테고리/태그 필터링
   - 조회수 카운터
   - 읽기 시간 계산

3. **Comments 모듈** - 댓글/대댓글
   - Controller, Service, DTO 생성
   - 대댓글 (parent_id) 처리
   - 익명/로그인 구분

4. **Likes 모듈** - 좋아요 기능
   - Controller, Service, DTO 생성
   - 중복 방지 로직
   - 카운터 동기화

### Phase 2: 배포 및 테스트
5. **프로덕션 배포**
   - GitHub Actions 자동 배포 테스트
   - Oracle Cloud 서버 모니터링
   - API 테스트 (Postman/Swagger)

6. **프론트엔드 연동**
   - CORS 설정 확인
   - API 문서 공유

---

## 🔧 알려진 이슈 및 개선 사항

### 현재 없음 ✅
모든 기능이 정상 작동 중입니다.

### 향후 개선 계획
- [ ] **Rate Limiting**: API 요청 제한 (DDoS 방지)
- [ ] **Logging**: Winston 또는 Pino 로거 추가
- [ ] **Email Service**: 회원가입 인증, 비밀번호 재설정
- [ ] **File Upload**: 프로젝트 썸네일, 프로필 이미지 업로드 (S3 또는 Supabase Storage)
- [ ] **Admin Dashboard**: 관리자 전용 대시보드
- [ ] **WebSocket**: 실시간 댓글 알림 (선택사항)

---

## 📝 중요 참고 사항

### 아키텍처
- **구조**: 모놀리식 (Monolithic)
- **이유**: 포트폴리오 목적, 간단한 개발/배포, 비용 효율적
- **장점**: 빠른 개발, 1개 서버로 충분, 모든 기능 밀접하게 연관

### OAuth 구현
- **방식**: Passport.js 직접 구현
- **이유**: 완전한 커스터마이징, 포트폴리오 기술 시연
- **장점**: 커스텀 필드 자유롭게 추가 가능

### 배포 전략
- **main 브랜치**: Production (포트 3000)
- **develop 브랜치**: Development (포트 3001)
- **자동 배포**: GitHub Actions → Oracle Cloud

---

---

### 2026-02-07 (배포 준비 완료)

#### 배포 인프라 설정 완료 ✅
- ✅ **GitHub Secrets 설정**
  - ORACLE_SSH_KEY: SSH private key 등록
  - ORACLE_HOST: 158.180.75.205
  - ORACLE_USER: ubuntu

- ✅ **Oracle Cloud 서버 초기 설정**
  - Docker & Docker Compose 설치
  - 방화벽 설정 (포트 3000, 3001, 80, 443)
  - 프로젝트 디렉토리 생성 (~/portfolio-backend, ~/portfolio-backend-dev)
  - .env 템플릿 생성

- ✅ **Supabase DB 스키마**
  - 이미 적용 완료 확인
  - 6개 테이블 모두 존재 (users, projects, posts, comments, likes, views)

- ✅ **서버 환경 변수 설정**
  - ~/portfolio-backend/.env 생성
  - DATABASE_URL, JWT_SECRET 등 설정
  - 프로덕션 환경 변수 적용

- ✅ **GitHub Container Registry 로그인**
  - 서버에서 GHCR 로그인 완료
  - Docker 이미지 pull 가능

- ✅ **보안 문제 해결**
  - Supabase 비밀번호 노출 발견 (NEXT_TASKS.md)
  - 즉시 비밀번호 변경: `N4xSSg9BKvpp3hq8`
  - NEXT_TASKS.md에서 민감한 정보 제거
  - 로컬 및 서버 .env 파일 업데이트

- ⏳ **배포 테스트 (진행 중)**
  - deploy.sh 수정: IMAGE_TAG 환경 변수 지원
  - workflow 수정: develop 브랜치는 develop 태그 사용
  - GitHub Actions 재실행 중

#### 발견된 문제 및 해결
1. **Docker 이미지 태그 문제**
   - 문제: develop 브랜치가 `latest` 태그를 찾으려고 시도
   - 해결: deploy.sh에 IMAGE_TAG 환경 변수 추가, workflow 수정

2. **보안 문제**
   - 문제: NEXT_TASKS.md에 Supabase 비밀번호 노출
   - 해결: 비밀번호 즉시 변경, 문서에서 제거

---

**마지막 업데이트**: 2026-02-07 (배포 준비 완료, 배포 테스트 진행 중)
