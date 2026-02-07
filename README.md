# 🚀 Portfolio Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11.x-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-orange)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **NestJS** + **Supabase** + **Redis**로 구축한 **포트폴리오 + 기술 블로그 백엔드**
> OAuth 인증, 조회수/좋아요/댓글 기능, Redis 캐싱, Full-text 검색 지원

---

## ✨ 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| **프로젝트 포트폴리오** | 프로젝트 소개, 기술 스택, 데모/깃허브 URL | ⏳ 구현 예정 |
| **기술 블로그** | 카테고리별 글, 마크다운 지원, 태그 검색 | ⏳ 구현 예정 |
| **OAuth 인증** | Google, GitHub 간편 로그인 + JWT | ⏳ 구현 예정 |
| **조회수 카운터** | Redis 캐싱, IP 기반 중복 방지 | ⏳ 구현 예정 |
| **좋아요 기능** | 로그인/익명 구분, 중복 방지 | ⏳ 구현 예정 |
| **댓글 시스템** | 대댓글 지원, 익명/로그인 구분 | ⏳ 구현 예정 |
| **Full-text 검색** | PostgreSQL GIN 인덱스 활용 | ✅ 스키마 완료 |
| **Redis 캐싱** | 조회수, 세션 관리 | ✅ 설정 완료 |

---

## 🛠️ 기술 스택

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7
- **Database**: Supabase PostgreSQL (Schema: `portfolio`)
- **ORM**: TypeORM 0.3
- **Cache**: Redis 7-alpine
- **Auth**: JWT + Passport (OAuth: Google, GitHub)
- **API Docs**: Swagger
- **Monitoring**: Prometheus
- **Deployment**: Docker Compose

---

## ⚡ Quick Start

### 1️⃣ Prerequisites

- Node.js 22+
- Supabase 계정 (무료)
- Redis (Docker 권장)

### 2️⃣ Installation

```bash
# 1. Clone repository
cd C:\hsm9411\portfolio-backend

# 2. Install dependencies
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일 수정 (DATABASE_URL, JWT_SECRET, OAuth 정보)

# 4. DB 초기화 (Supabase SQL Editor에서)
# schema.sql 전체 내용 복사 후 실행
```

### 3️⃣ Run

```bash
# Redis 시작 (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# 개발 서버 시작
npm run start:dev
```

### 4️⃣ Access

| Service | URL |
|---------|-----|
| 🌐 Swagger API Docs | http://localhost:3000/api |
| 📊 Prometheus Metrics | http://localhost:3000/metrics |

---

## 📂 프로젝트 구조

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
│   ├── modules/             # ⏳ 기능 모듈 (구현 예정)
│   │   ├── auth/            # OAuth + JWT
│   │   ├── projects/        # 프로젝트 포트폴리오
│   │   ├── posts/           # 블로그 글
│   │   ├── comments/        # 댓글/대댓글
│   │   └── likes/           # 좋아요
│   ├── app.module.ts        # ✅ 메인 모듈
│   └── main.ts              # ✅ 부트스트랩
├── .env.example             # ✅ 환경 변수 예시
├── .gitignore               # ✅
├── schema.sql               # ✅ DB 초기화 SQL
├── AI_MEMORY.md             # ✅ 프로젝트 현황
└── CLAUDE.md                # ✅ 작업 가이드
```

---

## 🗄️ 데이터베이스 스키마

### Schema: `portfolio`

#### 주요 테이블

| 테이블 | 설명 | 주요 필드 |
|--------|------|-----------|
| **users** | 사용자 (OAuth 지원) | email, nickname, provider, avatar_url |
| **projects** | 프로젝트 포트폴리오 | title, tech_stack[], tags[], view_count, like_count |
| **posts** | 블로그 글 | title, content, category, tags[], view_count |
| **comments** | 댓글/대댓글 | target_type, target_id, parent_id |
| **likes** | 좋아요 | target_type, target_id, user_id/ip_address |
| **views** | 조회수 | target_type, target_id, ip_address |

**특징**:
- ✅ **Polymorphic Relationship**: 댓글/좋아요는 프로젝트/포스트 모두 지원
- ✅ **비정규화**: 작성자 정보(nickname, avatar_url) 캐싱
- ✅ **Full-text Search**: GIN 인덱스로 빠른 검색
- ✅ **RLS (Row Level Security)**: Supabase 정책 적용

---

## 🔧 개발 명령어

```bash
# 개발 서버
npm run start:dev

# 빌드
npm run build

# 프로덕션
npm run start:prod

# 테스트
npm test
npm run test:e2e
npm run test:cov

# Lint
npm run lint
npm run format
```

---

## 🚀 배포 (Docker)

```bash
# Dockerfile 작성 (예정)
# docker-compose.yml 작성 (예정)

docker-compose up -d
```

---

## 📚 API 문서

### Swagger
개발 서버 실행 후 http://localhost:3000/api 접속

### 주요 엔드포인트 (구현 예정)

#### Auth
- `POST /auth/signup` - 회원가입
- `POST /auth/signin` - 로그인
- `GET /auth/google` - Google OAuth
- `GET /auth/github` - GitHub OAuth

#### Projects
- `GET /projects` - 프로젝트 목록
- `GET /projects/:id` - 프로젝트 상세
- `POST /projects` - 프로젝트 생성 (관리자)
- `PATCH /projects/:id` - 프로젝트 수정
- `DELETE /projects/:id` - 프로젝트 삭제

#### Posts
- `GET /posts` - 블로그 글 목록
- `GET /posts/:id` - 글 상세
- `POST /posts` - 글 작성 (관리자)
- `PATCH /posts/:id` - 글 수정
- `DELETE /posts/:id` - 글 삭제

#### Comments
- `GET /comments?targetType=project&targetId=xxx` - 댓글 목록
- `POST /comments` - 댓글 작성
- `DELETE /comments/:id` - 댓글 삭제

#### Likes
- `POST /likes` - 좋아요 추가
- `DELETE /likes/:id` - 좋아요 취소

---

## 🐛 트러블슈팅

### TypeORM 연결 실패
```bash
# .env 파일 확인
DATABASE_URL=postgresql://postgres:password@host:5432/postgres?schema=portfolio

# Supabase 프로젝트 활성화 확인
# schema.sql 실행 확인
```

### Redis 연결 실패
```bash
# Redis 컨테이너 시작
docker run -d -p 6379:6379 redis:7-alpine

# 연결 테스트
docker exec -it <container_id> redis-cli ping
# 응답: PONG
```

---

## 📖 문서

- **AI_MEMORY.md**: 프로젝트 현황, 완료된 작업, 다음 목표
- **CLAUDE.md**: Claude Code 작업 가이드, 코딩 표준
- **schema.sql**: 전체 DB 스키마 정의

---

## 🤝 Contributing

### Git Commit 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 코드 추가
chore: 빌드 설정 변경
```

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**hsm9411**
- Email: haeha2e@gmail.com
- GitHub: https://github.com/hsm9411

---

**Last Updated**: 2026-02-07
