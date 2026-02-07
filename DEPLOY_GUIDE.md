# 🚀 Deployment Guide

Portfolio Backend를 Oracle Cloud에 배포하는 가이드입니다.

---

## 📋 사전 준비

### 1. Oracle Cloud 서버 정보
- **IP**: 158.180.75.205
- **User**: ubuntu (또는 opc)
- **SSH Key**: 서버 생성 시 다운로드한 private key

### 2. GitHub 저장소 설정

#### GitHub Container Registry 활성화
1. GitHub Repository → Settings → Packages
2. Package visibility를 Public으로 설정

#### GitHub Secrets 설정
Repository Settings → Secrets and variables → Actions에서 다음 3개를 추가:

| Secret Name | 설명 | 예시 값 |
|------------|------|---------|
| `ORACLE_SSH_KEY` | SSH private key 전체 내용 | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `ORACLE_HOST` | 서버 IP 주소 | `158.180.75.205` |
| `ORACLE_USER` | SSH 사용자명 | `ubuntu` 또는 `opc` |

**ORACLE_SSH_KEY 설정 방법:**
```bash
# Windows에서 SSH key 읽기
cat C:\path\to\your\oracle-cloud-key.pem

# 전체 내용을 복사하여 GitHub Secret에 붙여넣기
```

---

## 🔧 서버 초기 설정 (1회만)

### 1. 서버 접속
```bash
ssh -i /path/to/oracle-cloud-key.pem ubuntu@158.180.75.205
```

### 2. 초기 설정 스크립트 실행
```bash
# 설정 스크립트 다운로드
curl -O https://raw.githubusercontent.com/hsm9411/portfolio-backend/main/scripts/setup-server.sh

# 실행 권한 부여
chmod +x setup-server.sh

# 실행
./setup-server.sh

# 로그아웃 후 재접속 (Docker 그룹 적용)
exit
ssh -i /path/to/oracle-cloud-key.pem ubuntu@158.180.75.205
```

### 3. .env 파일 설정
```bash
# .env 템플릿 복사
cp ~/portfolio-backend/.env.template ~/portfolio-backend/.env

# .env 파일 편집
nano ~/portfolio-backend/.env
```

**필수 설정 항목:**
```env
DATABASE_URL=postgresql://postgres.vcegupzlmopajpqxttfo:H5xMZzT1dgnIEboL@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio
JWT_SECRET=portfolio_jwt_secret_2026_production_key
GOOGLE_CALLBACK_URL=http://158.180.75.205:3000/auth/google/callback
GITHUB_CALLBACK_URL=http://158.180.75.205:3000/auth/github/callback
CORS_ORIGIN=http://your-frontend-ip
FRONTEND_URL=http://your-frontend-ip
```

### 4. GitHub Container Registry 로그인
```bash
# Personal Access Token 생성
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Scopes: read:packages, write:packages

# 로그인
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

---

## 🚀 배포 방법

### 자동 배포 (GitHub Actions)

**main 브랜치에 push하면 자동 배포:**
```bash
git checkout main
git merge develop
git push origin main
```

**GitHub Actions 확인:**
- https://github.com/hsm9411/portfolio-backend/actions

### 수동 배포

**서버에서 직접 배포:**
```bash
ssh ubuntu@158.180.75.205

cd ~/portfolio-backend

# 최신 이미지 pull
docker pull ghcr.io/hsm9411/portfolio-backend:latest

# 재시작
docker-compose down
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

---

## 🔍 배포 확인

### 1. 서버에서 확인
```bash
# 컨테이너 상태 확인
docker ps

# 애플리케이션 로그
docker logs portfolio-backend

# Health check
curl http://localhost:3000
```

### 2. 외부에서 확인
```bash
# Health check
curl http://158.180.75.205:3000

# Swagger API Docs
# 브라우저에서 접속: http://158.180.75.205:3000/api
```

---

## 🐛 트러블슈팅

### 1. 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker-compose logs

# 컨테이너 재시작
docker-compose restart

# 완전 재시작
docker-compose down
docker-compose up -d
```

### 2. DB 연결 실패
```bash
# .env 파일 확인
cat ~/portfolio-backend/.env

# DATABASE_URL이 올바른지 확인
# Supabase Dashboard에서 연결 정보 재확인
```

### 3. 포트 접근 불가
```bash
# 방화벽 규칙 확인
sudo iptables -L -n

# Oracle Cloud 콘솔에서 Security List 확인
# Ingress Rules에 3000, 3001 포트 추가 필요
```

**Oracle Cloud 방화벽 설정:**
1. Oracle Cloud Console 접속
2. Networking → Virtual Cloud Networks
3. 사용 중인 VCN 선택
4. Security Lists → Default Security List
5. Ingress Rules 추가:
   - Source: 0.0.0.0/0
   - Destination Port: 3000, 3001, 80, 443

### 4. GitHub Actions 실패
```bash
# SSH 연결 확인
ssh -i /path/to/key ubuntu@158.180.75.205

# GitHub Secrets 재확인
# ORACLE_SSH_KEY가 올바르게 설정되었는지 확인
```

---

## 📊 모니터링

### Prometheus Metrics
```bash
curl http://158.180.75.205:3000/metrics
```

### Docker Stats
```bash
docker stats
```

### Logs
```bash
# 실시간 로그
docker-compose logs -f

# 최근 100줄
docker-compose logs --tail=100
```

---

## 🔄 업데이트 및 롤백

### 업데이트
```bash
# develop → main 머지
git checkout main
git merge develop
git push origin main

# GitHub Actions가 자동 배포
```

### 롤백
```bash
ssh ubuntu@158.180.75.205

cd ~/portfolio-backend

# 이전 이미지로 롤백
docker pull ghcr.io/hsm9411/portfolio-backend:main-<commit-sha>

# docker-compose.yml에서 이미지 태그 변경
nano docker-compose.yml

# 재시작
docker-compose down
docker-compose up -d
```

---

## 📝 환경별 배포

### Production (main 브랜치)
- **URL**: http://158.180.75.205:3000
- **디렉토리**: ~/portfolio-backend
- **포트**: 3000

### Development (develop 브랜치)
- **URL**: http://158.180.75.205:3001
- **디렉토리**: ~/portfolio-backend-dev
- **포트**: 3001

---

## 🔐 보안 고려사항

1. **SSH Key 보안**
   - GitHub Secrets에만 저장
   - 로컬에서는 안전한 위치에 보관

2. **.env 파일**
   - Git에 커밋하지 않음
   - 서버에서만 관리

3. **GitHub Token**
   - Personal Access Token 사용
   - 필요한 권한만 부여 (read:packages, write:packages)

4. **방화벽**
   - 필요한 포트만 개방
   - SSH는 특정 IP만 허용 권장

---

## 📞 문의

배포 관련 문제가 있으면 GitHub Issues에 등록해주세요.
- https://github.com/hsm9411/portfolio-backend/issues
