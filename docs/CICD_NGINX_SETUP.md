# ==========================================
# CI/CD 기반 Nginx HTTPS 구성 가이드
# ==========================================

> GitHub Actions를 활용한 자동 배포 (Nginx + HTTPS)

---

## 📋 전체 작업 흐름

```
로컬 작업 (Windows)
    ↓
Git Push (develop)
    ↓
GitHub Actions 자동 실행
    ↓
OCI 서버 배포 완료 (Nginx + HTTPS)
```

---

## ✅ 당신이 해야 할 작업 (5단계)

### 1. `.gitignore` 확인 ✅ (완료)

이미 올바르게 설정됨:
```
nginx/logs/      # 로그 파일 제외
nginx/ssl/       # SSL 인증서 제외
certbot/         # Let's Encrypt 제외
```

---

### 2. 로컬 파일 Git 커밋 & Push

```bash
cd /c/hsm9411/portfolio-backend

# 변경사항 확인
git status

# 추가할 파일:
# - .github/workflows/deploy.yml (수정됨)
# - docker-compose.dev.yml (신규)
# - nginx/nginx-selfsigned.conf (신규)
# - docs/CICD_NGINX_SETUP.md (신규)

git add .
git commit -m "feat: Add Nginx HTTPS with CI/CD automation"
git push origin develop
```

**이 시점에서 GitHub Actions가 자동 실행됩니다!**

---

### 3. GitHub Actions 실행 모니터링

**웹 브라우저:**
1. https://github.com/hsm9411/portfolio-backend/actions 접속
2. 최신 워크플로우 클릭 (`feat: Add Nginx HTTPS...`)
3. `deploy-develop` Job 확인

**예상 단계:**
```
✅ Checkout code
✅ Setup SSH
✅ Deploy Nginx configuration
✅ Generate Self-Signed Certificate
✅ Copy .env file
✅ Deploy docker-compose
✅ Configure firewall for HTTPS
✅ Verify development deployment
```

**실행 시간:** 약 3-5분

---

### 4. 배포 결과 확인

#### 4-1. 서버 SSH 접속 (선택)

```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205

# 컨테이너 확인
docker ps | grep portfolio

# 예상 출력:
# portfolio-nginx-dev        Up (healthy)
# portfolio-backend-dev      Up (healthy)
# portfolio-redis-dev        Up (healthy)
```

#### 4-2. HTTP/HTTPS 테스트

```bash
# HTTP (포트 80)
curl http://158.180.75.205/health

# HTTPS (포트 443, Self-Signed)
curl -k https://158.180.75.205/health
```

#### 4-3. 브라우저 확인

1. **HTTPS 접속:** https://158.180.75.205
2. **"안전하지 않음" 경고** → "고급" → "계속 진행"
3. **Swagger 확인:** https://158.180.75.205/api

---

### 5. Frontend (Vercel) 환경 변수 수정

#### Vercel Dashboard

1. **Settings** → **Environment Variables**
2. **기존 변수 수정:**

```env
# Before
VITE_API_URL=http://158.180.75.205:3001

# After
VITE_API_URL=https://158.180.75.205
```

3. **Redeploy:**
   - Deployments → 최신 배포 → "Redeploy"

#### 프론트엔드 코드 확인

```typescript
// src/api/axios.ts (예시)
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // https://158.180.75.205
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
```

**이제 Mixed Content 에러 없이 HTTPS 통신!**

---

## 🔍 CI/CD가 자동으로 처리하는 것들

### GitHub Actions가 자동 실행:

1. **Nginx 설정 파일 복사**
   - `nginx/nginx-selfsigned.conf` → 서버

2. **디렉토리 구조 생성**
   - `~/portfolio-backend-dev/nginx/`
   - `~/portfolio-backend-dev/nginx/ssl/`
   - `~/portfolio-backend-dev/nginx/logs/`

3. **Self-Signed 인증서 생성**
   - 서버에 인증서가 없으면 자동 생성
   - 이미 있으면 재사용

4. **docker-compose 배포**
   - `docker-compose.dev.yml` 복사
   - 컨테이너 재시작 (Nginx + Backend + Redis)

5. **방화벽 설정**
   - 포트 443 자동 오픈

6. **Health Check**
   - HTTP/HTTPS 엔드포인트 확인

---

## 📂 서버 디렉토리 구조 (자동 생성)

```
~/portfolio-backend-dev/
├── .env                        # 수동 생성 (1회)
├── docker-compose.yml          # CI/CD 자동
├── deploy.sh                   # CI/CD 자동
└── nginx/
    ├── nginx-selfsigned.conf   # CI/CD 자동
    ├── ssl/                    # CI/CD 자동 생성
    │   ├── nginx-selfsigned.crt
    │   └── nginx-selfsigned.key
    └── logs/                   # CI/CD 자동 생성
        ├── access.log
        └── error.log
```

---

## 🚨 중요: .env 파일 관리

### 첫 배포 시 (1회만)

**.env가 없으면 CI/CD가 자동으로:**
1. `~/portfolio-backend/.env` (Production) 복사 시도
2. 없으면 경고 메시지 출력

**수동 생성이 필요한 경우:**

```bash
# 서버 SSH 접속
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205

# .env 파일 생성
nano ~/portfolio-backend-dev/.env
```

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_JWT_SECRET=...
JWT_SECRET=...
REDIS_HOST=portfolio-redis-dev
REDIS_PORT=6379
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://your-app.vercel.app
```

---

## 🔄 이후 배포 흐름

### 코드 변경 시:

```bash
# 1. 로컬에서 코드 수정
vi src/modules/projects/projects.service.ts

# 2. Git 커밋
git add .
git commit -m "feat: Add new feature"

# 3. Push (자동 배포 트리거)
git push origin develop
```

**GitHub Actions가 자동으로:**
1. Docker 이미지 빌드
2. GHCR에 푸시
3. 서버에 배포
4. Nginx 설정 업데이트 (변경 있으면)
5. 컨테이너 재시작
6. Health Check

---

## 📊 아키텍처 최종 구조

```
┌──────────────────────────────────┐
│     GitHub Repository            │
│  (develop 브랜치)                │
└────────┬─────────────────────────┘
         │ git push
         ▼
┌──────────────────────────────────┐
│     GitHub Actions               │
│  1. Build Docker Image           │
│  2. Push to GHCR                 │
│  3. SSH to OCI                   │
│  4. Deploy Nginx Config          │
│  5. Generate SSL Cert            │
│  6. Start Containers             │
└────────┬─────────────────────────┘
         │ Automatic Deployment
         ▼
┌──────────────────────────────────┐
│   OCI Server (158.180.75.205)    │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Nginx (HTTPS:443)          │ │
│  │ - Self-Signed SSL          │ │
│  │ - Reverse Proxy            │ │
│  └──────┬─────────────────────┘ │
│         │ HTTP (Docker)          │
│         ▼                        │
│  ┌────────────────────────────┐ │
│  │ NestJS (:3000)             │ │
│  └────────────────────────────┘ │
│         │                        │
│         ▼                        │
│  ┌────────────────────────────┐ │
│  │ Redis (:6379)              │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
         ▲
         │ HTTPS
┌────────┴─────────────────────────┐
│   Vercel (Frontend)              │
│   https://your-app.vercel.app    │
└──────────────────────────────────┘
```

---

## ✅ 최종 체크리스트

### 로컬 작업:
- [ ] `.gitignore` 확인 (완료)
- [ ] Git 커밋 & Push (develop)
- [ ] GitHub Actions 실행 확인

### 자동 배포 확인:
- [ ] GitHub Actions 성공 (`deploy-develop` Job)
- [ ] 서버 컨테이너 상태 (`docker ps`)
- [ ] HTTP 접속 (`http://158.180.75.205`)
- [ ] HTTPS 접속 (`https://158.180.75.205`)
- [ ] Swagger 확인 (`https://158.180.75.205/api`)

### Frontend 연동:
- [ ] Vercel 환경 변수 수정 (`VITE_API_URL`)
- [ ] Vercel Redeploy
- [ ] Frontend에서 API 호출 테스트

### 선택 (나중에):
- [ ] 도메인 구입
- [ ] DNS A 레코드 설정
- [ ] Let's Encrypt 인증서 발급
- [ ] Nginx 설정 업데이트 (server_name)

---

## 🔧 트러블슈팅

### GitHub Actions 실패 시

**1. SSH 연결 실패:**
```
Error: Permission denied (publickey)
```

**해결:** GitHub Secrets 확인
- `ORACLE_SSH_KEY`: SSH Private Key
- `ORACLE_HOST`: 158.180.75.205
- `ORACLE_USER`: ubuntu

**2. Docker 명령 실패:**
```
Error: Cannot connect to the Docker daemon
```

**해결:** 서버에서 Docker 상태 확인
```bash
ssh ubuntu@158.180.75.205
sudo systemctl status docker
sudo systemctl start docker
```

**3. Health Check 실패:**
```
Error: curl: (7) Failed to connect
```

**해결:** 컨테이너 로그 확인
```bash
docker logs portfolio-nginx-dev
docker logs portfolio-backend-dev
```

---

## 📚 관련 파일

| 파일 | 역할 | 위치 |
|------|------|------|
| `.github/workflows/deploy.yml` | CI/CD 워크플로우 | 로컬 |
| `docker-compose.dev.yml` | Dev 환경 설정 | 로컬 |
| `nginx/nginx-selfsigned.conf` | Nginx 설정 | 로컬 |
| `.env` | 환경 변수 | 서버 (수동) |

---

## 🎯 핵심 포인트

1. **CI/CD 자동화:** Git Push만 하면 배포 완료
2. **Self-Signed SSL:** Let's Encrypt 전까지 임시 사용
3. **환경 분리:** develop → Dev 서버 (자동)
4. **Mixed Content 해결:** Vercel HTTPS ↔ OCI HTTPS

---

**작성일:** 2026-02-15  
**마지막 업데이트:** 2026-02-15
