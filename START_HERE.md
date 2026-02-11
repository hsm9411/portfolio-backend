# 🎯 다음 세션 시작 가이드

**마지막 성공 배포:** `08be240` - "trigger: Force CI/CD deployment"

---

## ✅ 현재 프로젝트 상태

### 완료된 핵심 기능
- ✅ **Auth**: Supabase OAuth (Google/GitHub) + Local 로그인
- ✅ **Projects**: 포트폴리오 프로젝트 CRUD
- ✅ **Posts**: 블로그 포스트 CRUD + Slug + Tags
- ✅ **Comments**: Polymorphic + 익명 마스킹 + Nested 댓글
- ✅ **Likes**: Polymorphic + 트랜잭션 토글
- ✅ **Redis 조회수**: IP 기반 중복 방지 (24h TTL)

### 배포 환경
- **서버**: Oracle Cloud (Ubuntu)
- **CI/CD**: GitHub Actions (자동 빌드 & 배포)
- **컨테이너**: Docker Compose (Backend + Redis)
- **프록시**: Cloudflare → Oracle Cloud
- **데이터베이스**: Supabase PostgreSQL

---

## 🚫 시도했지만 실패한 것

### Bull Queue / BullMQ (자동 동기화)
- **목표**: Redis → DB 조회수 자동 동기화 (매일 자정)
- **실패 원인**: 
  - `@nestjs/bull` → NestJS 11과 peer dependency 충돌
  - `@nestjs/bullmq` → NestJS 11 지원 안 함 (NestJS 10까지만)
  - `@nestjs/schedule` → 버전 문제
- **결론**: **NestJS 11에서는 사용 불가**

### 삭제해야 할 파일들
```
BULL_QUEUE_GUIDE.md          ❌ 삭제
BULL_QUEUE_SUMMARY.md        ❌ 삭제
NEXT_SESSION.md              ❌ 삭제
REDIS_CONFIG.md              ❌ 삭제 (간단한 내용)
MIGRATIONS.md                ❌ 삭제 (DATABASE_SETUP.md로 통합됨)
src/common/processors/       ❌ 삭제 (Bull 관련)
src/common/services/view-sync-queue.service.ts  ❌ 삭제
src/modules/admin/           ❌ 삭제 (Bull 수동 트리거용)
```

---

## 📋 현재 상태 파일 정리

### ✅ 유지해야 할 문서 (중요)
```
DATABASE_SETUP.md            ✅ Supabase 스키마 생성 SQL
DEPLOYMENT_CHECKLIST.md      ✅ 배포 후 체크리스트
PROGRESS.md                  ✅ 프로젝트 전체 진행 상황
README.md                    ✅ 프로젝트 개요
.env.example                 ✅ 환경변수 템플릿
```

### ⚠️ 선택적 유지 (정리 필요)
```
AI_MEMORY.md                 ⚠️ 오래된 메모리
CLAUDE.md                    ⚠️ 중복 내용
DEPLOYMENT.md                ⚠️ DEPLOYMENT_CHECKLIST.md와 중복
DEPLOY_GUIDE.md              ⚠️ 중복 내용
SESSION_RESUME.md            ⚠️ 이전 세션 메모
NEXT_TASKS.md                ⚠️ 오래된 작업 목록
```

---

## 🔄 Redis → DB 동기화 현황

### 현재 상태
- ✅ Redis에 조회수 캐싱 중 (`view:count:post:uuid`)
- ✅ IP 중복 방지 작동 중 (`view:ip:post:uuid:ip`, TTL 24h)
- ❌ **자동 동기화 없음** (Bull Queue 실패)

### 동기화 방법 옵션

#### 옵션 1: 수동 동기화 (간단)
**ViewCountService에 메서드 추가 + Admin API**
- 관리자가 필요할 때 API 호출
- Bull Queue 없이 구현 가능

#### 옵션 2: 간단한 Cron (node-cron)
**package.json 추가:**
```json
"node-cron": "^3.0.3"
```
**장점**: 가볍고 의존성 문제 없음  
**단점**: NestJS 생명주기와 통합 약함

#### 옵션 3: 동기화 안 함
- Redis가 영구 저장소 역할
- 필요시 수동 동기화
- **가장 간단하고 안전**

### 권장 사항
**지금은 동기화 없이 진행하고, 나중에 필요하면 옵션 1 구현**

---

## 🎯 다음 세션에서 할 일

### 1단계: 문서 정리 (선택)
```bash
# 불필요한 파일 삭제
git rm BULL_QUEUE_GUIDE.md BULL_QUEUE_SUMMARY.md NEXT_SESSION.md REDIS_CONFIG.md MIGRATIONS.md
git rm -r src/common/processors src/modules/admin
git rm src/common/services/view-sync-queue.service.ts

# 커밋
git add .
git commit -m "chore: Remove Bull Queue related files and docs"
git push origin develop
```

### 2단계: 프론트엔드 연동 준비
- API 문서 확인 (http://server:3001/api)
- 엔드포인트 테스트
- CORS 설정 확인

### 3단계: 운영 개선 (선택)
- Swagger 예시 데이터 추가
- 에러 로그 모니터링
- 성능 최적화

---

## 📊 API 엔드포인트 요약

### Auth
```
POST /auth/login          # 로컬 로그인
POST /auth/register       # 회원가입
GET  /auth/google         # Google OAuth
GET  /auth/github         # GitHub OAuth
GET  /auth/profile        # 프로필 조회
```

### Projects
```
GET    /projects          # 목록
GET    /projects/:id      # 상세
POST   /projects          # 생성 (JWT)
PATCH  /projects/:id      # 수정 (JWT)
DELETE /projects/:id      # 삭제 (JWT)
```

### Posts
```
GET    /posts             # 목록 (페이징, 검색, 태그)
GET    /posts/:slug       # Slug로 조회
POST   /posts             # 생성 (JWT)
PUT    /posts/:id         # 수정 (JWT)
DELETE /posts/:id         # 삭제 (JWT)
```

### Comments
```
GET    /comments/:targetType/:targetId    # 목록
POST   /comments/:targetType/:targetId    # 생성 (JWT)
PUT    /comments/:id                      # 수정 (JWT)
DELETE /comments/:id                      # 삭제 (JWT)
```

### Likes
```
GET  /likes/:targetType/:targetId         # 상태 조회
POST /likes/:targetType/:targetId         # 토글 (JWT)
```

---

## 🔑 환경변수 (서버)

```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://vcegupzlmopajpqxttfo.supabase.co
SUPABASE_ANON_KEY=실제_키
SUPABASE_JWT_SECRET=실제_시크릿

# JWT (Local Auth)
JWT_SECRET=랜덤_문자열
JWT_EXPIRES_IN=7d

# Redis (Docker 환경)
REDIS_HOST=portfolio-redis-dev
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGINS=*
```

---

## 🐛 트러블슈팅

### Redis 조회수 안 증가
```bash
# Redis 키 확인
docker exec -it portfolio-redis-dev redis-cli
> KEYS view:count:*
> GET view:count:post:some-uuid
```

### Docker 로그 확인
```bash
docker logs -f portfolio-backend-dev
```

### Health Check
```bash
curl http://server-ip:3001/health
```

---

## ✅ 체크리스트

### 현재 배포 상태
- [x] Database 테이블 생성 완료
- [x] GIN 인덱스 생성 완료
- [x] 환경변수 설정 완료
- [x] Docker 배포 성공
- [x] Health Check 정상
- [x] Swagger 접속 가능
- [x] Redis 조회수 작동 중

### 다음 세션
- [ ] 불필요한 파일 정리 (선택)
- [ ] 프론트엔드 연동 시작
- [ ] API 테스트

---

**작성일**: 2026-02-10  
**마지막 성공 커밋**: 08be240  
**상태**: ✅ 모든 핵심 기능 정상 작동 중
