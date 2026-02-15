# ==========================================
# 체크리스트: CI/CD 기반 Nginx HTTPS 구성
# ==========================================

## ✅ 당신이 직접 해야 할 작업 (순서대로)

### 1단계: 로컬 파일 Git 작업 (Windows)

```bash
cd /c/hsm9411/portfolio-backend

# 변경사항 확인
git status

# 스테이징
git add .

# 커밋
git commit -m "feat: Add Nginx HTTPS with CI/CD automation"

# Push (이 시점에서 GitHub Actions 자동 실행!)
git push origin develop
```

**시간:** 1분  
**난이도:** ⭐☆☆☆☆

---

### 2단계: GitHub Actions 모니터링 (웹 브라우저)

**URL:** https://github.com/hsm9411/portfolio-backend/actions

**확인할 것:**
- [x] `deploy-develop` Job 시작됨
- [x] 모든 Step 녹색 체크 표시
- [x] "✅ Development deployment verified!" 메시지

**시간:** 3-5분 대기  
**난이도:** ⭐☆☆☆☆ (그냥 지켜보기)

---

### 3단계: 배포 결과 확인 (선택)

#### 옵션 A: 서버 SSH 접속

```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205

# 컨테이너 확인
docker ps | grep portfolio

# 로그 확인
docker logs portfolio-nginx-dev --tail=20
```

#### 옵션 B: 브라우저 확인 (권장)

1. **HTTP:** http://158.180.75.205
2. **HTTPS:** https://158.180.75.205
   - "안전하지 않음" 경고 → "고급" → "계속 진행"
3. **Swagger:** https://158.180.75.205/api

**시간:** 2분  
**난이도:** ⭐☆☆☆☆

---

### 4단계: Vercel 환경 변수 수정 (웹 브라우저)

**URL:** https://vercel.com/your-project/settings/environment-variables

**변경:**
```env
# 기존
VITE_API_URL=http://158.180.75.205:3001

# 신규
VITE_API_URL=https://158.180.75.205
```

**Redeploy:**
- Deployments 탭 → 최신 배포 → "Redeploy" 버튼

**시간:** 2분  
**난이도:** ⭐☆☆☆☆

---

### 5단계: Frontend 테스트

**브라우저에서 Frontend 접속:**
1. https://your-app.vercel.app
2. API 호출하는 기능 테스트
3. 브라우저 콘솔에서 Mixed Content 에러 없는지 확인

**예상 결과:**
```
✅ API 호출 성공 (200 OK)
✅ Mixed Content 에러 없음
✅ HTTPS 통신 정상
```

**시간:** 3분  
**난이도:** ⭐⭐☆☆☆

---

## 🤖 GitHub Actions가 자동으로 하는 것들

### CI/CD가 자동 실행하는 작업:

1. **Docker 이미지 빌드**
   - NestJS 코드 → Docker 이미지
   - GHCR에 자동 푸시

2. **서버 디렉토리 구조 생성**
   - `~/portfolio-backend-dev/nginx/`
   - `~/portfolio-backend-dev/nginx/ssl/`
   - `~/portfolio-backend-dev/nginx/logs/`

3. **Nginx 설정 파일 배포**
   - `nginx-selfsigned.conf` 복사

4. **Self-Signed SSL 인증서 생성**
   - 없으면 자동 생성
   - 있으면 재사용

5. **방화벽 설정**
   - 포트 443 자동 오픈

6. **Docker Compose 실행**
   - Nginx + Backend + Redis 컨테이너 시작

7. **Health Check**
   - HTTP/HTTPS 엔드포인트 확인

---

## 🚫 당신이 하지 않아도 되는 것들

### ❌ 서버에 SSH 접속해서 명령어 입력
- ~~docker-compose up~~
- ~~docker pull~~
- ~~openssl 인증서 생성~~

### ❌ 서버에서 파일 수동 복사
- ~~scp docker-compose.yml~~
- ~~scp nginx.conf~~

### ❌ 방화벽 수동 설정
- ~~sudo iptables~~

---

## 📦 최종 서버 디렉토리 구조 (자동 생성)

```
~/portfolio-backend-dev/
├── .env                      # ⚠️ 수동 (1회만, 이미 있음)
├── docker-compose.yml        # ✅ CI/CD 자동
├── deploy.sh                 # ✅ CI/CD 자동
└── nginx/
    ├── nginx-selfsigned.conf # ✅ CI/CD 자동
    ├── ssl/                  # ✅ CI/CD 자동
    │   ├── nginx-selfsigned.crt
    │   └── nginx-selfsigned.key
    └── logs/                 # ✅ CI/CD 자동
        ├── access.log
        └── error.log
```

---

## ⚠️ 주의사항

### .env 파일 확인 (중요!)

**첫 배포 전 확인:**

```bash
# 서버에 .env 파일 있는지 확인
ssh ubuntu@158.180.75.205
cat ~/portfolio-backend-dev/.env
```

**없으면 수동 생성:**

```bash
nano ~/portfolio-backend-dev/.env
```

```env
DATABASE_URL=postgresql://postgres.vcegupzlmopajpqxttfo:N4xSSg9BKvpp3hq8@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio
SUPABASE_URL=https://vcegupzlmopajpqxttfo.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
JWT_SECRET=portfolio_jwt_production_secret_2026_super_secure_key_hsm9411
JWT_EXPIRES_IN=7d
REDIS_HOST=portfolio-redis-dev
REDIS_PORT=6379
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://your-app.vercel.app
```

---

## 🔄 이후 개발 흐름

### 코드 변경 → 배포:

```bash
# 1. 코드 수정
vi src/modules/projects/projects.service.ts

# 2. Git 커밋
git add .
git commit -m "feat: Update project logic"

# 3. Push (끝!)
git push origin develop
```

**나머지는 GitHub Actions가 자동으로 처리!**

---

## 📊 전체 흐름 요약

```
┌─────────────────┐
│  1. Git Push    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. GitHub      │ ← 3-5분 대기
│     Actions     │
│     자동 실행   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. OCI 서버    │
│     Nginx +     │
│     Backend +   │
│     Redis       │
│     자동 배포   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. 브라우저    │
│     확인        │
│  https://       │
│  158.180.75.205 │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  5. Vercel      │
│     환경 변수   │
│     수정 +      │
│     Redeploy    │
└─────────────────┘
```

---

## ✅ 최종 체크리스트

### 필수 작업:
- [ ] Git Push (develop)
- [ ] GitHub Actions 성공 확인
- [ ] 브라우저 HTTPS 접속 확인
- [ ] Vercel 환경 변수 수정
- [ ] Frontend 테스트

### 선택 작업 (나중에):
- [ ] 도메인 구입
- [ ] DNS 설정
- [ ] Let's Encrypt 인증서 발급

---

**총 소요 시간:** 약 10-15분  
**난이도:** ⭐⭐☆☆☆ (매우 쉬움)

---

**작성일:** 2026-02-15
