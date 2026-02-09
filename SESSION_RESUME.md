# 🔄 다음 세션 시작 가이드

> **최종 작업일**: 2026-02-09
> **현재 상태**: Supabase OAuth 전환 완료, 배포 테스트 진행 중

---

## ✅ 최근 완료 작업 (2026-02-09)

### 1. Supabase OAuth 전환 완료
- ✅ User Entity에 `supabase_user_id` 컬럼 추가
- ✅ `SupabaseJwtStrategy` 구현 (Supabase JWT 검증)
- ✅ `AuthModule` 업데이트 (SupabaseJwtStrategy 등록)
- ✅ `AuthController` 간소화 (OAuth 엔드포인트 제거)
- ✅ Google/GitHub Strategy 파일 백업으로 이동
- ✅ TypeScript 빌드 에러 수정 (secretOrKey 타입)
- ✅ `.env.example` 업데이트 (Supabase 설정 추가)
- ✅ Migration SQL 생성 및 실행

### 2. 환경 설정
- ✅ `SUPABASE_URL` 설정
- ✅ `SUPABASE_ANON_KEY` 설정
- ✅ `SUPABASE_JWT_SECRET` 설정 (Legacy JWT Secret 사용)

### 3. 빌드 에러 해결
- ✅ Google/GitHub Strategy 파일 백업 처리
- ✅ SupabaseJwtStrategy secretOrKey 타입 에러 수정

### 4. 현재 상태
- 🔄 **배포 테스트 진행 중**
  - GitHub Actions 실행 중
  - 빌드 성공 여부 확인 필요
  - 서버 배포 후 검증 필요

---

## 🚀 다음 세션 첫 작업 (CRITICAL!)

### 1️⃣ 배포 완료 확인

**GitHub Actions 확인:**
```
https://github.com/hsm9411/portfolio-backend/actions
```

**예상 결과:**
- ✅ Build Docker Image: 성공
- ✅ Deploy to Development: 성공

**서버 확인:**
```bash
# 서버 접속
ssh ubuntu@158.180.75.205

# Docker 컨테이너 확인
cd ~/portfolio-backend-dev
docker-compose ps

# 로그 확인
docker-compose logs --tail=100 app

# 실시간 로그
docker-compose logs -f app
```

**API 테스트:**
```bash
# Health check
curl http://158.180.75.205:3001

# Swagger
http://158.180.75.205:3001/api

# Auth 엔드포인트
curl http://158.180.75.205:3001/auth/me
# 예상: 401 Unauthorized (정상 - JWT 없음)
```

---

### 2️⃣ 배포 실패 시 트러블슈팅

#### 시나리오 A: 빌드 실패

**확인:**
```bash
# GitHub Actions 로그 확인
# 에러 메시지 복사
```

**일반적인 원인:**
- TypeScript 컴파일 에러
- Import 문제
- 환경 변수 누락

**해결:**
```bash
# 로컬에서 빌드 테스트
cd C:\hsm9411\portfolio-backend
npm run build

# 에러 확인 후 수정
```

#### 시나리오 B: 서버 실행 실패

**증상:**
```bash
docker-compose logs app
# Error: SUPABASE_JWT_SECRET is not defined
```

**해결:**
```bash
# 서버 .env 확인
ssh ubuntu@158.180.75.205
nano ~/portfolio-backend-dev/.env

# SUPABASE_JWT_SECRET 추가
SUPABASE_JWT_SECRET=your-legacy-jwt-secret

# 재시작
docker-compose restart app
```

#### 시나리오 C: Supabase Migration 미실행

**증상:**
```
QueryFailedError: column "supabase_user_id" does not exist
```

**해결:**
```bash
# Supabase SQL Editor
# https://supabase.com/dashboard/project/vcegupzlmopajpqxttfo/sql

# migrations/2026-02-09-add-supabase-oauth.sql 실행
ALTER TABLE portfolio.users 
ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id 
ON portfolio.users(supabase_user_id);
```

---

## 📋 다음 작업 순서

### Phase 1: 배포 검증 및 안정화 (우선)
1. ✅ 배포 성공 확인
2. ✅ API 테스트 (Swagger, Health check)
3. ✅ 로그 확인 및 오류 없는지 검증
4. ✅ Supabase OAuth Provider 활성화
   - Google OAuth 설정
   - GitHub OAuth 설정

### Phase 2: Frontend Supabase SDK 통합 (선택)
5. Frontend에 @supabase/supabase-js 설치
6. Supabase Client 초기화
7. OAuth 로그인 버튼 구현
8. Callback 페이지 구현
9. Backend API 호출 시 JWT 전달

### Phase 3: Projects 모듈 구현 (핵심)
10. Projects 모듈 생성
    ```bash
    npx nest g module modules/projects --no-spec
    npx nest g controller modules/projects --no-spec
    npx nest g service modules/projects --no-spec
    mkdir -p src/modules/projects/dto
    ```

11. DTO 생성
    - CreateProjectDto
    - UpdateProjectDto
    - GetProjectsDto (페이징, 필터링)
    - ProjectResponseDto

12. Service 구현
    - findAll (페이징, 필터링, 검색)
    - findOne (상세 조회)
    - create (관리자만)
    - update (작성자/관리자)
    - remove (작성자/관리자)
    - incrementViewCount (Redis 캐싱)

13. Controller 구현
    - GET /projects
    - GET /projects/:id
    - POST /projects
    - PATCH /projects/:id
    - DELETE /projects/:id

14. Swagger 문서화

### Phase 4: Posts 모듈 구현
15. Posts 모듈 (Projects와 유사)
16. 카테고리/태그 필터링
17. 읽기 시간 계산

### Phase 5: 소셜 기능
18. Comments 모듈
19. Likes 모듈
20. Views 처리

---

## 🔑 중요 정보

### 서버 정보
- **IP**: 158.180.75.205
- **SSH User**: ubuntu
- **SSH Key**: `/c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key`
- **Development Port**: 3001
- **Production Port**: 3000

### Supabase
- **Project URL**: https://vcegupzlmopajpqxttfo.supabase.co
- **Project Ref**: vcegupzlmopajpqxttfo
- **DB 비밀번호**: `N4xSSg9BKvpp3hq8` ⚠️ 민감 정보!
- **Connection String**: 
  ```
  postgresql://postgres.vcegupzlmopajpqxttfo:N4xSSg9BKvpp3hq8@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio
  ```

### 환경변수 (중요)
```env
SUPABASE_URL=https://vcegupzlmopajpqxttfo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=Legacy JWT Secret (Reveal 클릭해서 복사)

DATABASE_URL=postgresql://postgres.vcegupzlmopajpqxttfo:N4xSSg9BKvpp3hq8@...
JWT_SECRET=your_local_jwt_secret
```

### GitHub
- **레포**: https://github.com/hsm9411/portfolio-backend
- **Actions**: https://github.com/hsm9411/portfolio-backend/actions

---

## 🧪 테스트 명령어

### 로컬 개발
```bash
cd C:\hsm9411\portfolio-backend

# Redis 시작
docker start portfolio-redis || docker run -d --name portfolio-redis -p 6379:6379 redis:7-alpine

# 개발 서버
npm run start:dev

# Swagger
http://localhost:3000/api
```

### 서버 접속
```bash
ssh ubuntu@158.180.75.205

# 개발 환경
cd ~/portfolio-backend-dev
docker-compose logs -f app

# 프로덕션 환경
cd ~/portfolio-backend
docker-compose logs -f app
```

### API 테스트
```bash
# Development
curl http://158.180.75.205:3001
curl http://158.180.75.205:3001/auth/me

# Production
curl http://158.180.75.205:3000
```

---

## 📚 참고 문서

| 문서 | 용도 |
|------|------|
| `README.md` | 프로젝트 개요, 설치 가이드 |
| `AI_MEMORY.md` | 전체 프로젝트 히스토리 |
| `NEXT_TASKS.md` | 상세 작업 가이드 |
| `DEPLOYMENT.md` | 배포 가이드 |
| `CLAUDE.md` | 코딩 표준 |
| `schema.sql` | DB 스키마 |
| `migrations/` | DB 마이그레이션 |

---

## ⚠️ 주의사항

1. **SSH Key 위치**: `/c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key`
2. **Supabase 비밀번호**: Git에 절대 커밋하지 말 것!
3. **배포 전 확인**: develop에서 테스트 → main에 merge
4. **GitHub Actions 확인**: push 후 반드시 Actions 탭 확인
5. **Supabase Migration**: 새 컬럼 추가 시 반드시 SQL 실행

---

## 🎯 다음 세션 목표

### 우선순위 1: 배포 안정화
- ✅ 배포 성공 확인
- ✅ API 정상 작동 검증
- ✅ 에러 로그 확인

### 우선순위 2: Projects 모듈
- 🚀 CRUD 구현
- 🚀 조회수 카운터 (Redis)
- 🚀 Swagger 문서화

### 우선순위 3: Frontend 통합 (선택)
- 🔄 Supabase SDK 설치
- 🔄 OAuth 로그인 구현
- 🔄 Backend API 연동

---

## 💡 개발 Tips

### NestJS 모듈 생성 템플릿
```bash
# 모듈 생성
npx nest g module modules/{name} --no-spec
npx nest g controller modules/{name} --no-spec
npx nest g service modules/{name} --no-spec

# DTO 폴더
mkdir -p src/modules/{name}/dto
```

### Git Workflow
```bash
# Feature 개발
git checkout develop
git pull origin develop
git checkout -b feature/{name}

# 작업 후 커밋
git add .
git commit -m "feat: {기능} 구현"
git push origin feature/{name}

# PR 생성 → develop 브랜치
```

### 서버 로그 확인
```bash
ssh ubuntu@158.180.75.205
cd ~/portfolio-backend-dev

# 최근 100줄
docker-compose logs --tail=100 app

# 실시간
docker-compose logs -f app

# 특정 시간
docker-compose logs --since 1h app
```

---

## 🔄 세션 재개 체크리스트

다음 세션 시작 시:

- [ ] 이 문서 읽기 (`SESSION_RESUME.md`)
- [ ] GitHub Actions 상태 확인
- [ ] 서버 상태 확인 (docker-compose ps)
- [ ] 최근 에러 로그 확인
- [ ] `NEXT_TASKS.md` 확인
- [ ] 작업 시작

---

**다음 세션 시작 시 이 문서를 먼저 확인하세요!** 📖

**Last Updated**: 2026-02-09 23:00
