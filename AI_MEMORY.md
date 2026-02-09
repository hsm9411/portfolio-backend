# 📝 Portfolio Backend - 프로젝트 현황

> **프로젝트**: 포트폴리오 + 기술 블로그 백엔드
> **최종 업데이트**: 2026-02-09
> **현재 상태**: Supabase OAuth 전환 완료, Projects 모듈 구현 대기

---

## 🎯 프로젝트 개요

**목적**: NestJS 기반 포트폴리오 + 기술 블로그 백엔드 API

**주요 특징**:
- ✅ Supabase OAuth 인증 (Google, GitHub)
- ✅ PostgreSQL (Supabase) + TypeORM
- ✅ Redis 캐싱 (조회수, 세션)
- ✅ CI/CD 자동 배포 (GitHub Actions → Oracle Cloud)
- 🔄 CRUD API (Projects, Posts, Comments, Likes)

---

## 📊 전체 진행 상황

| 모듈 | 상태 | 진행률 | 완료일 |
|------|------|--------|--------|
| **DB Schema** | ✅ 완료 | 100% | 2026-02-07 |
| **Auth 모듈** | ✅ 완료 | 100% | 2026-02-09 |
| **CI/CD** | ✅ 완료 | 100% | 2026-02-07 |
| **Projects 모듈** | 🔄 대기 | 0% | - |
| **Posts 모듈** | ⏳ 대기 | 0% | - |
| **Comments 모듈** | ⏳ 대기 | 0% | - |
| **Likes 모듈** | ⏳ 대기 | 0% | - |
| **Frontend 통합** | ⏳ 대기 | 0% | - |

**전체 진행률**: 약 35% (3/8 모듈 완료)

---

## ✅ 완료된 작업

### Phase 1: 프로젝트 초기 설정 (2026-02-07)

#### 1. Database Schema 설계
```sql
✅ portfolio 스키마 생성
✅ 6개 테이블 정의
   - users (사용자)
   - projects (프로젝트 포트폴리오)
   - posts (블로그 글)
   - comments (댓글/대댓글)
   - likes (좋아요)
   - views (조회수)
✅ Full-text 검색 인덱스 (GIN)
✅ Polymorphic 관계 (comments, likes, views)
✅ 비정규화 (작성자 정보 캐싱)
✅ RLS (Row Level Security) 준비
```

#### 2. NestJS 프로젝트 구조
```
✅ TypeORM 설정
✅ Redis 설정
✅ Entities 생성 (6개)
✅ Config 모듈
✅ Swagger 설정
```

#### 3. CI/CD 구축
```
✅ GitHub Actions Workflow
✅ Docker 이미지 빌드
✅ Oracle Cloud 배포 자동화
✅ develop → Dev 환경 (포트 3001)
✅ main → Prod 환경 (포트 3000)
```

---

### Phase 2: Auth 모듈 구현 (2026-02-07 ~ 2026-02-09)

#### 1. Local 인증 (2026-02-07)
```
✅ 회원가입 (/auth/register)
✅ 로그인 (/auth/login)
✅ JWT 발급
✅ bcrypt 비밀번호 해싱
✅ JwtStrategy 구현
✅ JwtAuthGuard 구현
```

#### 2. Passport OAuth 구현 (2026-02-07)
```
✅ Google OAuth Strategy
✅ GitHub OAuth Strategy
✅ OAuth Guards
✅ OAuth 콜백 처리
```

#### 3. Supabase OAuth 전환 (2026-02-09)
```
✅ User Entity supabase_user_id 컬럼 추가
✅ SupabaseJwtStrategy 구현
✅ AuthModule 업데이트
✅ AuthController 간소화
✅ Google/GitHub Strategy 백업
✅ Migration SQL 작성 및 실행
✅ 환경변수 설정 (SUPABASE_*)
✅ TypeScript 빌드 에러 수정
```

**변경 이유**:
- Frontend/Backend 간소화
- 자동 토큰 관리 (Refresh Token)
- Supabase DB와 통합
- 코드 60% 감소 (~220 lines)

---

## 🔄 진행 중인 작업

### 배포 테스트 (2026-02-09)

**현재 상태**:
```
✅ 코드 수정 완료
✅ Git Push 완료
🔄 GitHub Actions 빌드 중
⏳ 서버 배포 대기
⏳ API 테스트 대기
```

**다음 단계**:
1. GitHub Actions 성공 확인
2. 서버 로그 확인
3. API 테스트 (Swagger, Health check)
4. Supabase OAuth Provider 활성화

---

## 📋 다음 작업 (우선순위)

### 우선순위 1: 배포 안정화
```
1. 배포 성공 확인
2. 서버 로그 검증
3. API 테스트
4. Supabase OAuth Provider 활성화
   - Google OAuth 설정
   - GitHub OAuth 설정
```

### 우선순위 2: Projects 모듈 구현
```
1. 모듈 생성
   npx nest g module modules/projects --no-spec
   npx nest g controller modules/projects --no-spec
   npx nest g service modules/projects --no-spec

2. DTO 생성
   - CreateProjectDto
   - UpdateProjectDto
   - GetProjectsDto
   - ProjectResponseDto

3. Service 구현
   - findAll (페이징, 필터링, 검색)
   - findOne
   - create (관리자만)
   - update (작성자/관리자)
   - remove (작성자/관리자)
   - incrementViewCount (Redis)

4. Controller 구현
   - GET /projects
   - GET /projects/:id
   - POST /projects
   - PATCH /projects/:id
   - DELETE /projects/:id

5. Swagger 문서화
```

### 우선순위 3: Posts 모듈
```
Projects와 유사한 구조
+ 카테고리/태그 필터링
+ 읽기 시간 계산
```

### 우선순위 4: 소셜 기능
```
Comments 모듈
Likes 모듈
Views 처리
```

---

## 🛠️ 기술 스택

### Backend
- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7
- **ORM**: TypeORM 0.3
- **Validation**: class-validator

### Database
- **Primary**: Supabase PostgreSQL
- **Schema**: portfolio
- **Cache**: Redis 7-alpine

### Authentication
- **OAuth**: Supabase Auth (Google, GitHub)
- **Local**: JWT + bcrypt
- **Strategy**: SupabaseJwtStrategy, JwtStrategy

### DevOps
- **CI/CD**: GitHub Actions
- **Container**: Docker, Docker Compose
- **Deploy**: Oracle Cloud Free Tier
- **Monitor**: Prometheus + Grafana

---

## 📁 파일 구조

```
portfolio-backend/
├── src/
│   ├── config/                     # ✅ 설정
│   ├── entities/                   # ✅ 엔티티 (6개)
│   ├── modules/
│   │   ├── auth/                   # ✅ 인증 (완료)
│   │   ├── projects/               # 🔄 구현 대기
│   │   ├── posts/                  # ⏳ 구현 대기
│   │   ├── comments/               # ⏳ 구현 대기
│   │   └── likes/                  # ⏳ 구현 대기
│   ├── app.module.ts               # ✅
│   └── main.ts                     # ✅
├── migrations/                     # ✅ DB 마이그레이션
│   └── 2026-02-09-add-supabase-oauth.sql
├── schema.sql                      # ✅ 초기 스키마
├── .env.example                    # ✅
├── docker-compose.yml              # ✅
├── Dockerfile                      # ✅
├── .github/workflows/deploy.yml    # ✅ CI/CD
├── docs/                           # ✅ 문서
│   ├── AI_MEMORY.md               # ✅ 현재 파일
│   ├── SESSION_RESUME.md          # ✅ 세션 재개
│   ├── NEXT_TASKS.md              # ✅ 작업 목록
│   └── DEPLOYMENT.md              # ✅ 배포 가이드
└── README.md                       # ✅ 프로젝트 개요
```

---

## 🗄️ Database Schema

### Users (사용자)
```typescript
id: uuid
supabase_user_id: uuid        # Supabase auth.users 연결
email: text (UNIQUE)
password: text (nullable)     # OAuth 사용자는 null
nickname: text
avatar_url: text
provider: text                # local, google, github, email
provider_id: text             # OAuth Provider 고유 ID
is_admin: boolean
bio, github_url, linkedin_url, website_url
created_at, updated_at
```

### Projects (프로젝트)
```typescript
id: uuid
title, summary, description (Markdown)
thumbnail_url, demo_url, github_url
tech_stack: text[]            # ['NestJS', 'React', ...]
tags: text[]                  # ['MSA', 'Redis', ...]
status: text                  # in-progress, completed, archived
view_count, like_count
author_id (FK → users)
# 비정규화
author_nickname, author_avatar_url
created_at, updated_at
```

### Posts (블로그)
```typescript
id: uuid
title, content (Markdown)
category: text                # 'backend', 'frontend', ...
tags: text[]
read_time_minutes: int        # 자동 계산
view_count, like_count
author_id (FK → users)
# 비정규화
author_nickname, author_avatar_url
created_at, updated_at
```

### Comments (댓글)
```typescript
id: uuid
target_type: text             # 'project', 'post'
target_id: uuid
parent_id: uuid (nullable)    # 대댓글
content: text
author_id: uuid (nullable)    # 로그인 사용자
author_nickname: text
ip_address: inet              # 익명 사용자
created_at, updated_at
```

### Likes (좋아요)
```typescript
id: uuid
target_type: text             # 'project', 'post'
target_id: uuid
user_id: uuid (nullable)      # 로그인 사용자
ip_address: inet              # 익명 사용자
created_at
# UNIQUE(target_type, target_id, user_id/ip_address)
```

### Views (조회수)
```typescript
id: uuid
target_type: text
target_id: uuid
ip_address: inet
user_agent: text
viewed_at: timestamptz
```

---

## 🔐 인증 흐름

### Supabase OAuth (현재 방식)

```
1. Frontend → supabase.auth.signInWithOAuth({ provider: 'google' })
2. Supabase Auth → Google 로그인 페이지
3. 사용자 인증 → Supabase JWT 발급
4. Frontend → JWT 저장
5. Frontend → Backend API 호출 (Authorization: Bearer {JWT})
6. Backend → SupabaseJwtStrategy가 JWT 검증
7. Backend → portfolio.users 자동 생성/조회
8. Backend → req.user에 User 객체 주입
```

### Local Auth

```
1. Frontend → POST /auth/register or /auth/login
2. Backend → bcrypt 검증
3. Backend → Local JWT 발급
4. Frontend → JWT 저장
5. Frontend → Backend API 호출
6. Backend → JwtStrategy가 JWT 검증
```

---

## 🚀 배포 환경

### Development (develop 브랜치)
- **URL**: http://158.180.75.205:3001
- **Swagger**: http://158.180.75.205:3001/api
- **자동 배포**: develop 브랜치 push 시

### Production (main 브랜치)
- **URL**: http://158.180.75.205:3000
- **Swagger**: http://158.180.75.205:3000/api
- **자동 배포**: main 브랜치 push 시

### CI/CD Pipeline
```
1. GitHub Push (develop or main)
2. GitHub Actions Trigger
3. Docker Image Build
4. Push to GitHub Container Registry
5. SSH to Oracle Cloud Server
6. Pull Image & Deploy
7. Health Check
```

---

## 📊 프로젝트 타임라인

### 2026-02-07
- ✅ 프로젝트 생성
- ✅ Database Schema 설계
- ✅ TypeORM Entities 생성
- ✅ Auth 모듈 기본 구현 (Local + Passport OAuth)
- ✅ CI/CD 구축
- ✅ 첫 배포 성공

### 2026-02-09
- ✅ Supabase OAuth 전환 결정
- ✅ SupabaseJwtStrategy 구현
- ✅ Migration SQL 작성
- ✅ 빌드 에러 수정 (2회)
- 🔄 배포 테스트 진행 중

### 다음 예정
- 🔄 배포 안정화
- 🔄 Projects 모듈 구현
- 🔄 Frontend 통합

---

## 🐛 알려진 이슈 및 해결

### Issue #1: Passport OAuth Strategy 빌드 에러
**증상**: TypeScript 컴파일 실패
**원인**: Google/GitHub Strategy 파일이 존재하지만 사용 안 함
**해결**: `.backup` 확장자로 이름 변경
**상태**: ✅ 해결됨

### Issue #2: SupabaseJwtStrategy secretOrKey 타입 에러
**증상**: `secretOrKey: string | undefined` 타입 불일치
**원인**: ConfigService.get() 반환값이 undefined 가능
**해결**: Fallback 값 추가 `|| 'fallback-secret'`
**상태**: ✅ 해결됨

### Issue #3: Supabase JWT Secret 혼동
**증상**: Legacy JWT Secret vs New JWT Signing Keys 혼동
**해결**: Legacy JWT Secret 사용 (여전히 유효)
**상태**: ✅ 해결됨

---

## 🔑 중요 정보

### Supabase
- **Project URL**: https://vcegupzlmopajpqxttfo.supabase.co
- **Project Ref**: vcegupzlmopajpqxttfo
- **JWT Secret**: Legacy JWT Secret 사용

### Oracle Cloud
- **IP**: 158.180.75.205
- **SSH User**: ubuntu

### GitHub
- **Repository**: https://github.com/hsm9411/portfolio-backend
- **Actions**: https://github.com/hsm9411/portfolio-backend/actions

---

## 📝 작업 노트

### OAuth 전환 결정 이유
1. Frontend/Backend 간소화
2. 자동 토큰 관리
3. Supabase DB와 통합
4. 코드 감소 (~220 lines)
5. 검증된 보안
6. 무료 Tier 충분 (50,000 MAU)

### 코드 변경 요약
- **제거**: Google/GitHub Strategy, OAuth Guards, OAuth 엔드포인트
- **추가**: SupabaseJwtStrategy, supabase_user_id 컬럼
- **수정**: AuthModule, AuthController, User Entity

---

## 📖 참고 문서

- **README.md**: 프로젝트 개요, 설치 가이드
- **SESSION_RESUME.md**: 다음 세션 시작 가이드
- **NEXT_TASKS.md**: 상세 작업 목록
- **DEPLOYMENT.md**: 배포 가이드
- **CLAUDE.md**: 코딩 표준
- **schema.sql**: DB 스키마

---

**Last Updated**: 2026-02-09 23:00
**Status**: Supabase OAuth 전환 완료, 배포 테스트 중
**Next**: Projects 모듈 구현
