# Portfolio Backend - 프로젝트 아키텍처 완전 정리

> **작성일**: 2026-02-09
> **버전**: 1.0
> **상태**: ✅ 배포 완료 (Development 환경)

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [기술 스택](#-기술-스택)
3. [전체 아키텍처](#-전체-아키텍처)
4. [CI/CD 파이프라인](#-cicd-파이프라인)
5. [배포 환경](#-배포-환경)
6. [주요 개념 설명](#-주요-개념-설명)
7. [디렉토리 구조](#-디렉토리-구조)
8. [배포 프로세스 상세](#-배포-프로세스-상세)
9. [환경 변수 관리](#-환경-변수-관리)
10. [트러블슈팅 가이드](#-트러블슈팅-가이드)
11. [다음 단계](#-다음-단계)

---

## 🎯 프로젝트 개요

### 프로젝트명
**Portfolio + Tech Blog Backend**

### 목적
개인 포트폴리오와 기술 블로그를 위한 REST API 서버

### 주요 기능
- 🔐 **인증/인가**: JWT + OAuth (Google, GitHub)
- 📁 **프로젝트 포트폴리오**: CRUD, 조회수, 좋아요
- 📝 **블로그 포스트**: CRUD, 조회수, 좋아요, 댓글
- 💬 **댓글 시스템**: 댓글/대댓글 (Polymorphic 관계)
- 👍 **소셜 기능**: 좋아요, 조회수 (Redis 캐싱)

### 아키텍처 스타일
**Monolithic Architecture** (MSA 아님)
- 포트폴리오 목적이므로 단일 서비스로 충분
- 배포/관리가 간단
- 향후 필요시 MSA로 마이그레이션 가능

---

## 🛠️ 기술 스택

### Backend Framework
- **NestJS 11.x** - TypeScript 기반 Node.js 프레임워크
  - 모듈화된 구조
  - Dependency Injection
  - 데코레이터 기반 개발

### Database
- **Supabase PostgreSQL** - Serverless PostgreSQL
  - Connection Pooler 사용 (성능 최적화)
  - `portfolio` 스키마 사용 (public 스키마 아님)
  - TypeORM으로 ORM 처리

### Cache
- **Redis 7 Alpine** - 인메모리 캐시
  - 조회수 중복 방지 (IP 기반, 1시간 TTL)
  - 향후 세션 관리 가능

### ORM
- **TypeORM** - Entity 기반 ORM
  - Entity 파일로 스키마 정의
  - Migration 미사용 (schema.sql 직접 실행)

### Container
- **Docker** + **docker-compose**
  - 애플리케이션 + Redis 컨테이너 관리
  - 환경 일관성 보장

### CI/CD
- **GitHub Actions** - 자동 빌드/배포
  - develop 브랜치 → Dev 환경 (포트 3001)
  - main 브랜치 → Production 환경 (포트 3000)

### Container Registry
- **GHCR (GitHub Container Registry)** - Docker 이미지 저장
  - Docker Hub 대신 사용
  - GitHub와 완벽한 통합
  - 무료 사용 한도가 더 관대함

### Deployment
- **Oracle Cloud (Free Tier)** - Ubuntu 서버
  - ARM 아키텍처 (ampere)
  - 무료로 사용 가능

---

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   Code     │  │ Dockerfile │  │  .github/  │                │
│  │ (src/...)  │  │            │  │ workflows/ │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└────────────┬────────────────────────────┬───────────────────────┘
             │                            │
             │ push (develop/main)        │
             ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Build Docker Image                                    │  │
│  │  2. Push to GHCR (ghcr.io/hsm9411/portfolio-backend)    │  │
│  │  3. SSH to Oracle Cloud Server                           │  │
│  │  4. Deploy with docker-compose                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Oracle Cloud Server (Ubuntu)                        │
│                                                                  │
│  ┌───────────────────────────┐  ┌──────────────────────────┐   │
│  │   Production (main)       │  │  Development (develop)   │   │
│  │   Port: 3000              │  │  Port: 3001              │   │
│  │                           │  │                          │   │
│  │  ┌─────────────────────┐ │  │  ┌────────────────────┐ │   │
│  │  │ portfolio-backend   │ │  │  │portfolio-backend   │ │   │
│  │  │ (NestJS Container)  │ │  │  │-dev                │ │   │
│  │  └─────────────────────┘ │  │  │(NestJS Container)  │ │   │
│  │           │               │  │  └────────────────────┘ │   │
│  │           │               │  │           │              │   │
│  │  ┌─────────────────────┐ │  │  ┌────────────────────┐ │   │
│  │  │ portfolio-redis     │ │  │  │ portfolio-redis    │ │   │
│  │  │ (Redis Container)   │ │  │  │ -dev               │ │   │
│  │  └─────────────────────┘ │  │  │(Redis Container)   │ │   │
│  └───────────────────────────┘  └──────────────────────────┘   │
│                                                                  │
│  Both environments connect to:                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Supabase PostgreSQL (External)               │    │
│  │  - Host: aws-1-ap-south-1.pooler.supabase.com         │    │
│  │  - Database: postgres                                  │    │
│  │  - Schema: portfolio (not public!)                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 CI/CD 파이프라인

### 워크플로우 구조

```yaml
# .github/workflows/deploy.yml

┌──────────────────────────────────────────────┐
│  Trigger: push to develop or main           │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  Job 1: build-and-push                       │
│  ┌────────────────────────────────────────┐  │
│  │ 1. Checkout code                       │  │
│  │ 2. Set up Docker Buildx                │  │
│  │ 3. Login to GHCR                       │  │
│  │ 4. Extract metadata (tags)             │  │
│  │ 5. Build and push Docker image         │  │
│  │    - Tags: develop or latest           │  │
│  └────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌─────────────────┐    ┌─────────────────────┐
│ Job 2: deploy   │    │Job 3: deploy-develop│
│ (main only)     │    │ (develop only)      │
│                 │    │                     │
│ 1. Setup SSH    │    │ 1. Setup SSH        │
│ 2. Copy files   │    │ 2. Copy .env        │
│ 3. Run deploy.sh│    │ 3. Copy files       │
│ 4. Verify       │    │ 4. Run deploy.sh    │
│    Port: 3000   │    │ 5. Verify           │
│                 │    │    Port: 3001       │
└─────────────────┘    └─────────────────────┘
```

### 브랜치 전략

| 브랜치 | 환경 | 포트 | 이미지 태그 | 자동 배포 |
|--------|------|------|------------|----------|
| `develop` | Development | 3001 | `develop` | ✅ |
| `main` | Production | 3000 | `latest` | ✅ |

---

## 🌐 배포 환경

### Development Environment
- **URL**: http://158.180.75.205:3001
- **Swagger**: http://158.180.75.205:3001/api
- **디렉토리**: `~/portfolio-backend-dev`
- **컨테이너**:
  - `portfolio-backend-dev` (NestJS)
  - `portfolio-redis-dev` (Redis)
- **브랜치**: `develop`
- **이미지 태그**: `ghcr.io/hsm9411/portfolio-backend:develop`

### Production Environment
- **URL**: http://158.180.75.205:3000
- **Swagger**: http://158.180.75.205:3000/api
- **디렉토리**: `~/portfolio-backend`
- **컨테이너**:
  - `portfolio-backend` (NestJS)
  - `portfolio-redis` (Redis)
- **브랜치**: `main`
- **이미지 태그**: `ghcr.io/hsm9411/portfolio-backend:latest`

### 서버 정보
- **Provider**: Oracle Cloud (Free Tier)
- **IP**: 158.180.75.205
- **OS**: Ubuntu 22.04 LTS
- **Architecture**: ARM64 (ampere)
- **User**: ubuntu
- **SSH Key**: `/c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key`

---

## 💡 주요 개념 설명

### 1. GHCR vs Docker Hub

#### Docker Hub (사용 안 함)
```
docker.io/hsm9411/portfolio-backend:latest
```
- Docker의 공식 레지스트리
- 무료 계정: 이미지 pull 제한 (200/6시간)
- GitHub Actions와 별도 인증 필요

#### GHCR (✅ 사용 중)
```
ghcr.io/hsm9411/portfolio-backend:latest
```
- GitHub의 컨테이너 레지스트리
- GitHub와 완벽한 통합
- GitHub Actions에서 자동 인증
- 무료 사용 한도가 더 관대함
- Private 레포지토리도 지원

### 2. docker-compose란?

**여러 컨테이너를 하나의 YAML 파일로 관리하는 도구**

```yaml
# docker-compose.yml
services:
  app:              # NestJS 애플리케이션
    image: ghcr.io/hsm9411/portfolio-backend:develop
    ports:
      - "3001:3000"
    depends_on:
      - redis       # Redis가 먼저 시작되어야 함
    env_file:
      - .env        # 환경 변수 로드

  redis:            # Redis 캐시
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**장점:**
- 한 번에 여러 컨테이너 시작/종료
- 컨테이너 간 네트워크 자동 구성
- 환경 변수 관리 용이
- 볼륨(데이터) 관리 자동화

**주요 명령어:**
```bash
docker-compose up -d      # 백그라운드로 시작
docker-compose down       # 모든 컨테이너 정지 및 삭제
docker-compose logs       # 로그 확인
docker-compose ps         # 상태 확인
docker-compose restart    # 재시작
```

### 3. 환경 변수 (Environment Variables)

**컨테이너는 시작 시점에 환경 변수를 로드합니다.**

```bash
# .env 파일 수정 시
vi .env                   # ❌ 변경만 해도 반영 안 됨!

# 반드시 컨테이너 재시작 필요
docker-compose restart    # ✅ 환경 변수 다시 로드
```

**주요 환경 변수:**
- `DATABASE_URL` - Supabase 연결 문자열
- `REDIS_HOST` - Redis 컨테이너 이름
- `JWT_SECRET` - JWT 토큰 시크릿
- `NODE_ENV` - 환경 구분 (development/production)

### 4. Supabase Schema

**PostgreSQL의 Schema는 네임스페이스 개념입니다.**

```sql
-- public 스키마 (기본)
public.users

-- portfolio 스키마 (우리가 사용)
portfolio.users
portfolio.projects
portfolio.posts
```

**왜 `portfolio` 스키마를 사용하나?**
- `public` 스키마와 분리하여 관리
- Supabase의 내부 테이블과 충돌 방지
- 명확한 구분

**TypeORM 설정:**
```typescript
@Entity('users', { schema: 'portfolio' })  // ✅ 스키마 명시
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
```

**DATABASE_URL에 스키마 지정:**
```bash
DATABASE_URL=postgresql://...?schema=portfolio  # ✅ 필수!
```

### 5. Circuit Breaker (Supabase)

**너무 많은 인증 실패 시 일시적으로 연결 차단하는 보안 메커니즘**

```
┌─────────────────────────────────────────┐
│  1. 잘못된 비밀번호로 연결 시도 (10회)  │
│  2. Supabase: "Circuit Breaker Open!"   │
│  3. 5-10분간 모든 연결 차단             │
│  4. 자동으로 해제됨                     │
└─────────────────────────────────────────┘
```

**해결 방법:**
1. 올바른 비밀번호로 .env 수정
2. 5-10분 기다리기
3. 또는 Supabase Dashboard에서 프로젝트 재시작

### 6. Polymorphic Association (다형성 관계)

**하나의 테이블이 여러 타입의 레코드와 관계를 맺는 패턴**

```sql
-- Comments 테이블
CREATE TABLE portfolio.comments (
  id UUID PRIMARY KEY,
  target_type VARCHAR(50),  -- 'project' or 'post'
  target_id UUID,           -- project.id or post.id
  content TEXT
);

-- 사용 예시
INSERT INTO comments (target_type, target_id, content)
VALUES ('project', 'uuid-1', '프로젝트 멋지네요!');

INSERT INTO comments (target_type, target_id, content)
VALUES ('post', 'uuid-2', '좋은 글 감사합니다!');
```

**장점:**
- 댓글 테이블 하나로 프로젝트/포스트 모두 지원
- 확장 가능 (향후 다른 타입 추가 가능)

**단점:**
- Foreign Key 제약 조건 불가
- 애플리케이션 레벨에서 검증 필요

---

## 📁 디렉토리 구조

```
portfolio-backend/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions 워크플로우
│
├── src/
│   ├── config/                     # 설정 파일
│   │   ├── database.config.ts      # TypeORM 설정
│   │   ├── redis.config.ts         # Redis 설정
│   │   └── jwt.config.ts           # JWT 설정
│   │
│   ├── entities/                   # TypeORM 엔티티
│   │   ├── user/
│   │   │   └── user.entity.ts
│   │   ├── project/
│   │   │   └── project.entity.ts
│   │   ├── post/
│   │   │   └── post.entity.ts
│   │   ├── comment/
│   │   │   └── comment.entity.ts
│   │   ├── like/
│   │   │   └── like.entity.ts
│   │   └── view/
│   │       └── view.entity.ts
│   │
│   ├── modules/                    # 기능 모듈
│   │   ├── auth/                   # ✅ 완료
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   └── dto/
│   │   ├── projects/               # 🔜 다음 작업
│   │   ├── posts/
│   │   ├── comments/
│   │   └── likes/
│   │
│   ├── app.module.ts               # 루트 모듈
│   └── main.ts                     # 애플리케이션 진입점
│
├── docs/
│   ├── PROJECT_ARCHITECTURE.md     # 이 문서
│   └── API.md                      # API 문서 (작성 예정)
│
├── Dockerfile                      # Docker 이미지 빌드 설정
├── docker-compose.yml              # 로컬 개발용
├── deploy.sh                       # 배포 스크립트
├── schema.sql                      # DB 스키마 정의
├── .env.example                    # 환경 변수 템플릿
└── package.json
```

---

## 🚀 배포 프로세스 상세

### 1. 로컬 개발 → GitHub Push

```bash
# 1. 코드 수정
vi src/modules/auth/auth.service.ts

# 2. 커밋
git add .
git commit -m "feat: 로그인 기능 추가"

# 3. Push (자동 배포 트리거)
git push origin develop    # → Dev 환경 배포
git push origin main       # → Prod 환경 배포
```

### 2. GitHub Actions 빌드

```
┌─────────────────────────────────────────┐
│  1. Checkout code                       │
│  2. Docker Buildx 설정                  │
│  3. GHCR 로그인                         │
│     (GITHUB_TOKEN 사용)                 │
│  4. Docker 이미지 빌드                  │
│     FROM node:20-alpine                 │
│     COPY package*.json                  │
│     RUN npm ci                          │
│     COPY . .                            │
│     RUN npm run build                   │
│  5. GHCR에 푸시                         │
│     ghcr.io/hsm9411/portfolio-backend  │
└─────────────────────────────────────────┘
```

### 3. SSH 배포

```
┌─────────────────────────────────────────┐
│  1. SSH 키 설정                         │
│     ~/.ssh/id_rsa 생성                  │
│  2. 서버 접속                           │
│     ssh ubuntu@158.180.75.205          │
│  3. 디렉토리 생성                       │
│     mkdir -p ~/portfolio-backend-dev   │
│  4. 파일 복사                           │
│     scp docker-compose.yml             │
│     scp deploy.sh                      │
│  5. .env 파일 복사 (없으면)             │
│     cp ~/portfolio-backend/.env        │
│  6. deploy.sh 실행                     │
│     IMAGE_TAG=develop ./deploy.sh      │
└─────────────────────────────────────────┘
```

### 4. deploy.sh 스크립트

```bash
#!/bin/bash
set -e

# 1. Docker 이미지 pull
docker pull ghcr.io/hsm9411/portfolio-backend:develop

# 2. 기존 컨테이너 정지
docker-compose down

# 3. 새 컨테이너 시작
export GITHUB_REPOSITORY=hsm9411/portfolio-backend
export IMAGE_TAG=develop
docker-compose up -d

# 4. 오래된 이미지 정리
docker image prune -af

# 5. 로그 출력
docker-compose logs --tail=50
```

### 5. 검증

```
┌─────────────────────────────────────────┐
│  1. 20초 대기 (앱 시작 시간)            │
│  2. 컨테이너 상태 확인                  │
│     docker ps | grep portfolio          │
│  3. 로그 확인                           │
│     docker logs portfolio-backend-dev   │
│  4. Health check                        │
│     curl http://localhost:3001/health   │
│  5. 성공 메시지                         │
│     ✅ Deployment verified!             │
└─────────────────────────────────────────┘
```

---

## 🔐 환경 변수 관리

### .env 파일 위치

| 환경 | 위치 | 용도 |
|------|------|------|
| 로컬 개발 | `portfolio-backend/.env` | 로컬 테스트 |
| Dev 서버 | `~/portfolio-backend-dev/.env` | Development 환경 |
| Prod 서버 | `~/portfolio-backend/.env` | Production 환경 |

### 필수 환경 변수

```bash
# Database (가장 중요!)
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio

# Redis
REDIS_HOST=portfolio-redis-dev  # 컨테이너 이름
REDIS_PORT=6379
REDIS_TTL=600

# JWT
JWT_SECRET=portfolio_jwt_production_secret_2026_super_secure_key
JWT_EXPIRES_IN=7d

# Server
PORT=3000                       # 컨테이너 내부 포트 (고정)
NODE_ENV=production

# OAuth (선택, 나중에 설정)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://158.180.75.205:3001/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://158.180.75.205:3001/auth/github/callback
```

### DATABASE_URL 형식

```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]
           │         │           │        │      │          └─ portfolio (필수!)
           │         │           │        │      └─ postgres
           │         │           │        └─ 5432 (Session) or 6543 (Transaction)
           │         │           └─ aws-1-ap-south-1.pooler.supabase.com
           │         └─ Supabase 비밀번호
           └─ postgres.vcegupzlmopajpqxttfo
```

### GitHub Secrets

| Secret | 값 | 용도 |
|--------|-----|------|
| `ORACLE_HOST` | `158.180.75.205` | 서버 IP |
| `ORACLE_USER` | `ubuntu` | SSH 사용자 |
| `ORACLE_SSH_KEY` | SSH private key | 서버 접속 |

---

## 🔧 트러블슈팅 가이드

### 1. "no configuration file provided: not found"

**원인:** docker-compose.yml 파일을 찾을 수 없음

**해결:**
```bash
# 현재 디렉토리 확인
pwd

# docker-compose.yml 존재 확인
ls -la docker-compose.yml

# 올바른 디렉토리로 이동
cd ~/portfolio-backend-dev
```

### 2. "env file not found"

**원인:** .env 파일이 없음

**해결:**
```bash
# .env 파일 존재 확인
ls -la ~/portfolio-backend-dev/.env

# 없으면 production에서 복사
cp ~/portfolio-backend/.env ~/portfolio-backend-dev/.env

# 또는 직접 생성
nano ~/portfolio-backend-dev/.env
```

### 3. "Circuit breaker open: Too many authentication errors"

**원인:** DB 비밀번호 오류로 인한 연결 차단

**해결:**
```bash
# 1. .env 파일 확인
cat ~/portfolio-backend-dev/.env | grep DATABASE_URL

# 2. 비밀번호가 올바른지 Supabase Dashboard 확인

# 3. 수정 후 컨테이너 정지
docker-compose down

# 4. 5-10분 기다리기 (Circuit breaker 해제)

# 5. 다시 시작
docker-compose up -d
```

### 4. "invalid environment variable"

**원인:** 환경 변수 형식 오류

**해결:**
```bash
# .env 파일 확인
nano ~/portfolio-backend-dev/.env

# 확인 사항:
# - KEY=VALUE 형식인지 (== 아님)
# - 줄바꿈 없이 한 줄로 작성되었는지
# - 특수문자가 올바르게 escape 되었는지
```

### 5. "curl: Connection reset by peer"

**원인:** 애플리케이션이 시작되지 않거나 크래시

**해결:**
```bash
# 로그 확인 (가장 중요!)
docker logs portfolio-backend-dev --tail=100

# 컨테이너 상태 확인
docker ps -a | grep portfolio

# Redis 연결 확인
docker logs portfolio-redis-dev --tail=20

# DB 연결 확인 (로그에서 TypeORM 에러 찾기)
```

### 6. 컨테이너가 재시작 루프

**원인:** 애플리케이션 크래시 → 재시작 → 크래시 반복

**해결:**
```bash
# 실시간 로그 확인
docker logs portfolio-backend-dev -f

# healthcheck 상태 확인
docker inspect portfolio-backend-dev | grep -A 10 Health

# 컨테이너 정지 후 원인 파악
docker-compose down
```

---

## 📚 다음 단계

### 1. Projects 모듈 구현 🔜

**우선순위 1**

```typescript
// src/modules/projects/
- projects.controller.ts   // CRUD 엔드포인트
- projects.service.ts      // 비즈니스 로직
- projects.module.ts       // 모듈 정의
- dto/
  - create-project.dto.ts
  - update-project.dto.ts
  - get-projects.dto.ts
```

**기능:**
- ✅ 프로젝트 생성 (인증 필요)
- ✅ 프로젝트 목록 조회 (페이지네이션)
- ✅ 프로젝트 상세 조회 (조회수 증가)
- ✅ 프로젝트 수정 (작성자만)
- ✅ 프로젝트 삭제 (작성자만)
- ✅ 좋아요 기능
- ✅ 조회수 카운터 (Redis 캐싱)

### 2. Posts 모듈 구현

**우선순위 2**

- 블로그 포스트 CRUD
- 마크다운 지원
- 카테고리/태그
- 좋아요/조회수

### 3. Comments 모듈 구현

**우선순위 3**

- 댓글/대댓글
- Polymorphic 관계 (Projects + Posts)
- 작성자만 수정/삭제

### 4. 추가 기능

- [ ] OAuth 로그인 활성화 (Google, GitHub)
- [ ] 파일 업로드 (이미지)
- [ ] 검색 기능
- [ ] 관리자 대시보드
- [ ] 통계 API (인기 게시물, 방문자 수)

### 5. 인프라 개선

- [ ] HTTPS 설정 (Let's Encrypt)
- [ ] 도메인 연결
- [ ] CDN 설정 (Cloudflare)
- [ ] 모니터링 (Prometheus + Grafana)
- [ ] 로그 집계 (ELK Stack)

---

## 📖 참고 자료

### 공식 문서
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### 내부 문서
- `CLAUDE.md` - Claude Code 작업 가이드
- `schema.sql` - 데이터베이스 스키마
- `.env.example` - 환경 변수 템플릿
- `AI_MEMORY.md` - 프로젝트 히스토리

---

## 🎉 완료된 작업

- ✅ NestJS 프로젝트 초기 설정
- ✅ TypeORM + Supabase 연동
- ✅ Redis 캐싱 설정
- ✅ Entity 정의 (User, Project, Post, Comment, Like, View)
- ✅ Auth 모듈 구현 (JWT + OAuth)
- ✅ Dockerfile 작성
- ✅ docker-compose.yml 작성
- ✅ GitHub Actions CI/CD 구축
- ✅ GHCR 연동
- ✅ Oracle Cloud 서버 설정
- ✅ Development 환경 배포 성공 ✨
- ✅ 배포 자동화 완료

---

## 📝 버전 히스토리

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-02-09 | 초기 문서 작성, Dev 환경 배포 완료 |

---

**작성자:** Claude Sonnet 4.5 + hsm9411
**마지막 업데이트:** 2026-02-09
**문서 상태:** ✅ 완료
