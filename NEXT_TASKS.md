# 🚀 Next Session Tasks

> **다음 세션에서 진행할 작업 목록**
> **업데이트**: 2026-02-07

---

## ⚡ Quick Start (다음 세션 시작 시)

### 1. 서버 실행 확인
```bash
cd C:\hsm9411\portfolio-backend

# Redis 실행 확인
docker ps | grep redis

# Redis 없으면 시작
docker start portfolio-redis || docker run -d --name portfolio-redis -p 6379:6379 redis:7-alpine

# 개발 서버 시작
npm run start:dev
```

### 2. 이전 작업 확인
- ✅ Auth 모듈 완료
- ✅ CI/CD 구성 완료
- ✅ Docker 설정 완료

---

## 📋 우선순위 작업

### 🔴 긴급 (배포 전 필수)

#### Task #1: GitHub Secrets 설정
**위치**: https://github.com/hsm9411/portfolio-backend/settings/secrets/actions

**추가할 Secrets:**
| Name | Value | 비고 |
|------|-------|------|
| `ORACLE_SSH_KEY` | SSH private key 전체 | `cat C:\path\to\key.pem` |
| `ORACLE_HOST` | `158.180.75.205` | 서버 IP |
| `ORACLE_USER` | `ubuntu` 또는 `opc` | SSH 사용자명 |

**확인:**
```bash
# SSH 연결 테스트
ssh -i /path/to/key.pem ubuntu@158.180.75.205
```

#### Task #2: Oracle Cloud 서버 초기 설정
**서버 접속 후 실행:**
```bash
# 1. 설정 스크립트 다운로드
curl -O https://raw.githubusercontent.com/hsm9411/portfolio-backend/develop/scripts/setup-server.sh

# 2. 실행
chmod +x setup-server.sh
./setup-server.sh

# 3. 로그아웃 후 재접속
exit
ssh -i /path/to/key.pem ubuntu@158.180.75.205

# 4. .env 파일 설정
nano ~/portfolio-backend/.env
```

**.env 내용 (서버용):**
```env
DATABASE_URL=postgresql://postgres.vcegupzlmopajpqxttfo:H5xMZzT1dgnIEboL@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio
JWT_SECRET=portfolio_jwt_production_secret_2026_super_secure
JWT_EXPIRES_IN=7d

REDIS_HOST=redis
REDIS_PORT=6379

PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://your-frontend-url
FRONTEND_URL=http://your-frontend-url

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://158.180.75.205:3000/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://158.180.75.205:3000/auth/github/callback
```

#### Task #3: Supabase DB 스키마 적용
**Supabase SQL Editor:**
1. https://supabase.com/dashboard/project/protfolio/sql
2. `schema.sql` 전체 내용 복사 & 실행
3. 성공 메시지 확인: "✅ Portfolio schema migration completed!"

**확인:**
```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'portfolio';

-- 예상 결과: users, projects, posts, comments, likes, views
```

#### Task #4: GitHub Container Registry 로그인
```bash
# Personal Access Token 생성
# GitHub → Settings → Developer settings → Personal access tokens
# Scopes: read:packages, write:packages

echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### Task #5: 배포 테스트
```bash
# develop 브랜치 push
git push origin develop

# GitHub Actions 확인
# https://github.com/hsm9411/portfolio-backend/actions

# 배포 확인
curl http://158.180.75.205:3001
```

---

### 🟡 중요 (핵심 기능)

#### Task #6: Projects 모듈 구현
**작업 내용:**
```bash
# NestJS CLI로 모듈 생성
npx nest g module modules/projects --no-spec
npx nest g controller modules/projects --no-spec
npx nest g service modules/projects --no-spec

# DTO 폴더 생성
mkdir -p src/modules/projects/dto
```

**구현할 기능:**
- [ ] DTO 생성
  - CreateProjectDto
  - UpdateProjectDto
  - GetProjectsDto (필터링/페이징)
  - ProjectResponseDto
- [ ] Service 구현
  - findAll (페이징, 필터링, 검색)
  - findOne (상세 조회)
  - create (관리자만)
  - update (작성자/관리자)
  - remove (작성자/관리자)
  - incrementViewCount (Redis 캐싱)
- [ ] Controller 구현
  - GET /projects
  - GET /projects/:id
  - POST /projects (JwtAuthGuard)
  - PATCH /projects/:id (JwtAuthGuard)
  - DELETE /projects/:id (JwtAuthGuard)
- [ ] Swagger 문서화

**참고:**
- `CLAUDE.md`의 코딩 표준 준수
- Entity: `src/entities/project/project.entity.ts` (이미 생성됨)
- 조회수 카운터: Redis 캐싱 + IP 중복 방지

#### Task #7: Posts 모듈 구현
**Projects 모듈과 유사한 구조**
- [ ] 모듈, 컨트롤러, 서비스 생성
- [ ] DTO 생성
- [ ] 카테고리/태그 필터링
- [ ] 읽기 시간 계산 (Markdown 길이 기반)

#### Task #8: Comments 모듈 구현
**Polymorphic Relationship 처리**
- [ ] target_type, target_id로 프로젝트/포스트 구분
- [ ] parent_id로 대댓글 지원
- [ ] 익명/로그인 사용자 구분

#### Task #9: Likes 모듈 구현
**중복 방지 로직**
- [ ] 로그인: user_id 기반
- [ ] 익명: ip_address 기반
- [ ] 토글 기능 (좋아요/취소)

---

### 🟢 선택 (개선 사항)

#### Task #10: OAuth 설정
**Google OAuth:**
1. Google Cloud Console → API & Services → Credentials
2. OAuth 2.0 Client ID 생성
3. Authorized redirect URIs:
   - http://localhost:3000/auth/google/callback
   - http://158.180.75.205:3000/auth/google/callback
4. .env에 Client ID/Secret 추가

**GitHub OAuth:**
1. GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth App
3. Callback URL:
   - http://localhost:3000/auth/github/callback
   - http://158.180.75.205:3000/auth/github/callback
4. .env에 Client ID/Secret 추가

#### Task #11: Rate Limiting
```bash
npm install @nestjs/throttler
```

#### Task #12: Logging
```bash
npm install winston nest-winston
```

---

## 📚 참고 문서

- **AI_MEMORY.md**: 프로젝트 현황 및 완료 작업
- **CLAUDE.md**: 코딩 표준 및 작업 가이드
- **DEPLOY_GUIDE.md**: 배포 가이드
- **README.md**: 프로젝트 개요

---

## 🔍 체크리스트 (다음 세션 시작 시)

### 환경 확인
- [ ] Redis 실행 중인가? (`docker ps`)
- [ ] .env 파일 설정 완료? (DATABASE_URL, JWT_SECRET)
- [ ] 개발 서버 정상 실행? (`npm run start:dev`)
- [ ] Swagger 접속 가능? (http://localhost:3000/api)

### 배포 준비
- [ ] GitHub Secrets 설정 완료?
- [ ] Oracle Cloud 서버 접속 가능?
- [ ] Supabase DB 스키마 적용 완료?
- [ ] GitHub Container Registry 로그인 완료?

### 모듈 구현 순서
1. Projects 모듈
2. Posts 모듈
3. Comments 모듈
4. Likes 모듈

---

## 💡 Tips

### NestJS 모듈 생성 템플릿
```bash
# 모듈 생성
npx nest g module modules/{name} --no-spec
npx nest g controller modules/{name} --no-spec
npx nest g service modules/{name} --no-spec

# DTO 폴더 생성
mkdir -p src/modules/{name}/dto
```

### Git Workflow
```bash
# 새 기능 시작
git checkout develop
git pull origin develop

# 작업 후 커밋
git add .
git commit -m "feat: {기능} 구현"
git push origin develop

# 프로덕션 배포
git checkout main
git merge develop
git push origin main
```

### 서버 접속
```bash
ssh -i /path/to/key.pem ubuntu@158.180.75.205

# 로그 확인
cd ~/portfolio-backend
docker-compose logs -f
```

---

**다음 세션 시작 시 이 문서부터 확인하세요!** 📝
