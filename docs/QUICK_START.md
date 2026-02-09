# 빠른 시작 가이드

> 자주 사용하는 명령어와 작업 흐름을 한눈에!

---

## 🚀 로컬 개발

### 서버 시작
```bash
cd C:\hsm9411\portfolio-backend
npm run start:dev
```

### Swagger 접속
```
http://localhost:3000/api
```

---

## 📦 배포

### Development 배포 (자동)
```bash
git add .
git commit -m "feat: 새 기능 추가"
git push origin develop
```
→ GitHub Actions가 자동으로 배포 (3-5분)
→ http://158.180.75.205:3001

### Production 배포 (자동)
```bash
git checkout main
git merge develop
git push origin main
```
→ GitHub Actions가 자동으로 배포
→ http://158.180.75.205:3000

---

## 🔧 서버 관리

### SSH 접속
```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205
```

### 컨테이너 상태 확인
```bash
docker ps | grep portfolio
```

### 로그 확인
```bash
# Dev 환경
docker logs portfolio-backend-dev --tail=100 -f

# Prod 환경
docker logs portfolio-backend --tail=100 -f
```

### 컨테이너 재시작
```bash
# Dev 환경
cd ~/portfolio-backend-dev
docker-compose restart

# Prod 환경
cd ~/portfolio-backend
docker-compose restart
```

### 컨테이너 재배포
```bash
# Dev 환경
cd ~/portfolio-backend-dev
docker-compose down
docker-compose pull
docker-compose up -d

# Prod 환경
cd ~/portfolio-backend
docker-compose down
docker-compose pull
docker-compose up -d
```

---

## 🔍 상태 확인

### API Health Check
```bash
# Dev
curl http://158.180.75.205:3001/health

# Prod
curl http://158.180.75.205:3000/health
```

### Database 연결 확인
```bash
docker logs portfolio-backend-dev 2>&1 | grep -i "database\|typeorm"
```

### Redis 연결 확인
```bash
docker exec -it portfolio-redis-dev redis-cli ping
# 응답: PONG
```

---

## 📝 자주 쓰는 Git 명령어

### 브랜치 전환
```bash
# develop 브랜치
git checkout develop

# main 브랜치
git checkout main

# 새 브랜치 생성
git checkout -b feature/new-feature
```

### 변경사항 확인
```bash
git status
git diff
```

### 커밋
```bash
git add .
git commit -m "feat: 기능 설명"
git push origin develop
```

### 최신 코드 받기
```bash
git pull origin develop
```

---

## 🐛 문제 해결

### 컨테이너가 안 뜰 때
```bash
# 1. 로그 확인
docker logs portfolio-backend-dev --tail=50

# 2. 컨테이너 상태 확인
docker ps -a | grep portfolio

# 3. 재시작
cd ~/portfolio-backend-dev
docker-compose down
docker-compose up -d
```

### Database 연결 안 될 때
```bash
# 1. .env 파일 확인
cat ~/portfolio-backend-dev/.env | grep DATABASE_URL

# 2. Circuit breaker 확인 (로그에서)
docker logs portfolio-backend-dev 2>&1 | grep -i "circuit"

# 3. Supabase 프로젝트 확인
# https://supabase.com/dashboard
```

### Redis 연결 안 될 때
```bash
# 1. Redis 컨테이너 확인
docker ps | grep redis

# 2. Redis 로그 확인
docker logs portfolio-redis-dev

# 3. Redis 재시작
docker restart portfolio-redis-dev
```

---

## 📂 주요 파일 위치

### 로컬
```
C:\hsm9411\portfolio-backend\
├── src/                    # 소스 코드
├── docs/                   # 문서
├── .env                    # 로컬 환경 변수 (절대 커밋 X)
├── docker-compose.yml      # 컨테이너 설정
└── package.json
```

### 서버
```
~/portfolio-backend-dev/     # Development 환경
├── .env
├── docker-compose.yml
└── deploy.sh

~/portfolio-backend/         # Production 환경
├── .env
├── docker-compose.yml
└── deploy.sh
```

---

## 🔗 유용한 링크

| 서비스 | URL |
|--------|-----|
| Dev API | http://158.180.75.205:3001 |
| Dev Swagger | http://158.180.75.205:3001/api |
| Prod API | http://158.180.75.205:3000 |
| Prod Swagger | http://158.180.75.205:3000/api |
| GitHub Repo | https://github.com/hsm9411/portfolio-backend |
| GitHub Actions | https://github.com/hsm9411/portfolio-backend/actions |
| GHCR | https://github.com/hsm9411/portfolio-backend/pkgs/container/portfolio-backend |
| Supabase | https://supabase.com/dashboard |

---

## 💡 팁

### 1. 로그 실시간 보기
```bash
docker logs -f portfolio-backend-dev
# Ctrl+C로 종료
```

### 2. 여러 컨테이너 한 번에 보기
```bash
docker-compose logs -f
```

### 3. 특정 컨테이너만 재시작
```bash
docker-compose restart app
```

### 4. 오래된 이미지 정리
```bash
docker image prune -a
```

### 5. GitHub Actions 로그 확인
```
https://github.com/hsm9411/portfolio-backend/actions
→ 최근 워크플로우 클릭 → Job 클릭 → 로그 확인
```

---

**마지막 업데이트**: 2026-02-09
