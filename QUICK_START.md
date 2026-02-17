# 🚀 Quick Start Guide

빠르게 시작하기 위한 필수 가이드

---

## 📋 Prerequisites

```bash
Node.js 22+
Docker & Docker Compose
Supabase 계정 (무료)
```

---

## 🔧 Local Development

### 1. Installation
```bash
git clone https://github.com/hsm9411/portfolio-backend.git
cd portfolio-backend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
nano .env  # 환경변수 설정
```

**필수 환경변수:**
```env
DATABASE_URL=postgresql://...?schema=portfolio
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_JWT_SECRET=xxx
JWT_SECRET=xxx
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Database Setup
Supabase SQL Editor에서 **DATABASE_SETUP.md** 실행

### 4. Start Development Server
```bash
# Redis 시작
docker run -d -p 6379:6379 redis:7-alpine

# 개발 서버
npm run start:dev
```

접속: http://localhost:3000/api

---

## 🚀 Deployment

### Automatic Deployment (GitHub Actions)
```bash
# Development
git push origin develop  # → http://158.180.75.205:3001

# Production
git push origin main     # → http://158.180.75.205:3000
```

### Manual Deployment
```bash
# SSH 접속
ssh ubuntu@158.180.75.205

# 프로젝트 디렉토리
cd ~/portfolio-backend-dev  # or ~/portfolio-backend

# 배포
docker-compose down
docker-compose pull
docker-compose up -d

# 로그 확인
docker-compose logs -f app
```

---

## 🧪 Common Commands

```bash
# Development
npm run start:dev        # Hot reload

# Build
npm run build

# Production
npm run start:prod

# Tests
npm test                 # Unit tests
npm run test:e2e         # E2E tests

# Code Quality
npm run lint
npm run format

# Docker
docker-compose up -d     # Start
docker-compose down      # Stop
docker-compose logs -f   # Logs
docker-compose restart   # Restart
```

---

## 🐛 Troubleshooting

### Redis Connection Failed
```bash
docker ps | grep redis   # Redis 실행 확인
docker logs [container]  # 로그 확인
```

### Database Connection Failed
```bash
# .env 확인
cat .env | grep DATABASE_URL

# schema=portfolio 확인 필수!
```

### Port Already in Use
```bash
# 포트 확인
lsof -i :3000
lsof -i :6379

# 프로세스 종료
kill -9 [PID]
```

---

## 📚 More Documentation

- **README.md** - 전체 프로젝트 개요
- **DATABASE_SETUP.md** - DB 테이블 생성 가이드
- **DEPLOYMENT_CHECKLIST.md** - 배포 후 체크리스트

---

**Last Updated**: 2026-02-17
