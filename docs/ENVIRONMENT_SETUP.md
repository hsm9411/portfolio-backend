# 환경 설정 가이드

> .env 파일과 docker-compose.yml 설정 방법

---

## 📁 파일 위치

```
서버 (Oracle Cloud)
├── ~/portfolio-backend-dev/     # Development 환경
│   ├── .env                      # ← 이 파일 수정
│   └── docker-compose.yml        # ← 포트 매핑 확인
│
└── ~/portfolio-backend/          # Production 환경
    ├── .env                      # ← 이 파일 수정
    └── docker-compose.yml        # ← 포트 매핑 확인
```

---

## 🔐 .env 파일 설정

### Development 환경 (.env)

**위치**: `~/portfolio-backend-dev/.env`

```bash
# Database
DATABASE_URL=postgresql://postgres.vcegupzlmopajpqxttfo:N4xSSg9BKvpp3hq8@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio

# JWT
JWT_SECRET=portfolio_jwt_production_secret_2026_super_secure_key_hsm9411
JWT_EXPIRES_IN=7d

# OAuth (선택)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://158.180.75.205:3001/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://158.180.75.205:3001/auth/github/callback

# Redis
REDIS_HOST=portfolio-redis-dev
REDIS_PORT=6379
REDIS_TTL=600

# Server
PORT=3000
NODE_ENV=production
```

### Production 환경 (.env)

**위치**: `~/portfolio-backend/.env`

```bash
# Database
DATABASE_URL=postgresql://postgres.vcegupzlmopajpqxttfo:N4xSSg9BKvpp3hq8@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio

# JWT
JWT_SECRET=portfolio_jwt_production_secret_2026_super_secure_key_hsm9411
JWT_EXPIRES_IN=7d

# OAuth (선택)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://158.180.75.205:3000/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://158.180.75.205:3000/auth/github/callback

# Redis
REDIS_HOST=portfolio-redis
REDIS_PORT=6379
REDIS_TTL=600

# Server
PORT=3000
NODE_ENV=production
```

### 주요 차이점

| 환경 변수 | Development | Production |
|-----------|-------------|------------|
| `GOOGLE_CALLBACK_URL` | `:3001/auth/...` | `:3000/auth/...` |
| `GITHUB_CALLBACK_URL` | `:3001/auth/...` | `:3000/auth/...` |
| `REDIS_HOST` | `portfolio-redis-dev` | `portfolio-redis` |

⚠️ **주의**:
- `PORT`는 둘 다 `3000` (내부 포트)
- 외부 포트는 docker-compose.yml에서 매핑!

---

## 🐳 docker-compose.yml 포트 설정

### Development 환경

**위치**: `~/portfolio-backend-dev/docker-compose.yml`

```yaml
services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG:-latest}
    container_name: portfolio-backend-dev
    restart: unless-stopped
    ports:
      - "3001:3000"  # ← 외부:내부 (3001로 접속)
    env_file:
      - .env
    depends_on:
      - redis
    networks:
      - portfolio-network

  redis:
    image: redis:7-alpine
    container_name: portfolio-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - portfolio-network

networks:
  portfolio-network:
    driver: bridge

volumes:
  redis-data:
```

### Production 환경

**위치**: `~/portfolio-backend/docker-compose.yml`

```yaml
services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG:-latest}
    container_name: portfolio-backend
    restart: unless-stopped
    ports:
      - "3000:3000"  # ← 외부:내부 (3000으로 접속)
    env_file:
      - .env
    depends_on:
      - redis
    networks:
      - portfolio-network

  redis:
    image: redis:7-alpine
    container_name: portfolio-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - portfolio-network

networks:
  portfolio-network:
    driver: bridge

volumes:
  redis-data:
```

---

## 🔄 포트 매핑 이해하기

### 포트 구조

```
사용자 브라우저
    ↓
http://158.180.75.205:3001  ← 외부 포트
    ↓
Docker Host (서버)
    ↓
"3001:3000" 매핑
    ↓
컨테이너 내부 포트 3000  ← .env의 PORT=3000
    ↓
NestJS 앱이 리스닝
```

### 예시

| 환경 | docker-compose ports | .env PORT | 접속 URL |
|------|---------------------|-----------|----------|
| Dev | `"3001:3000"` | `3000` | http://158.180.75.205:3001 |
| Prod | `"3000:3000"` | `3000` | http://158.180.75.205:3000 |

---

## 🛠️ .env 파일 수정 방법

### SSH로 접속
```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205
```

### nano 에디터로 수정
```bash
# Dev 환경
nano ~/portfolio-backend-dev/.env

# Prod 환경
nano ~/portfolio-backend/.env
```

### nano 단축키
- `Ctrl+O`: 저장
- `Enter`: 확인
- `Ctrl+X`: 종료
- `Ctrl+K`: 한 줄 삭제
- `Ctrl+W`: 검색

### 수정 후 적용
```bash
# 컨테이너 재시작 (환경 변수 다시 로드)
cd ~/portfolio-backend-dev
docker-compose down
docker-compose up -d
```

---

## ✅ 검증 체크리스트

### .env 파일 검증

```bash
# 1. 공백 확인 (앞에 공백 없어야 함!)
cat .env | head -1 | od -c
# 첫 문자가 '#' 또는 'D'(DATABASE_URL)로 시작해야 함

# 2. DATABASE_URL 확인
cat .env | grep DATABASE_URL
# postgresql://postgres.vcegupzlmopajpqxttfo:N4xSSg9BKvpp3hq8@... 확인

# 3. 한 줄인지 확인
cat .env | grep DATABASE_URL | wc -l
# 1이 나와야 함

# 4. REDIS_HOST 확인
cat .env | grep REDIS_HOST
# Dev: portfolio-redis-dev
# Prod: portfolio-redis

# 5. PORT 확인
cat .env | grep "^PORT"
# PORT=3000 (둘 다 동일)
```

### docker-compose.yml 검증

```bash
# Dev 환경 포트 확인
cat ~/portfolio-backend-dev/docker-compose.yml | grep -A 2 "ports:"
# "3001:3000" 이어야 함

# Prod 환경 포트 확인
cat ~/portfolio-backend/docker-compose.yml | grep -A 2 "ports:"
# "3000:3000" 이어야 함
```

### 실행 중인 컨테이너 확인

```bash
docker ps | grep portfolio
# Dev:  0.0.0.0:3001->3000/tcp
# Prod: 0.0.0.0:3000->3000/tcp
```

---

## 🚨 흔한 실수

### ❌ 실수 1: .env 파일에 공백
```bash
# 잘못됨
  DATABASE_URL=postgresql://...

# 올바름
DATABASE_URL=postgresql://...
```

### ❌ 실수 2: DATABASE_URL 줄바꿈
```bash
# 잘못됨
DATABASE_URL=postgresql://postgres.xxx:password@host
:5432/postgres?schema=portfolio

# 올바름
DATABASE_URL=postgresql://postgres.xxx:password@host:5432/postgres?schema=portfolio
```

### ❌ 실수 3: .env의 PORT 변경
```bash
# 잘못됨
PORT=3001  # Dev 환경이라고 3001로 설정

# 올바름
PORT=3000  # 항상 3000!
```

### ❌ 실수 4: .env 수정 후 재시작 안 함
```bash
# 잘못됨
nano .env  # 수정만 하고 끝

# 올바름
nano .env  # 수정 후
docker-compose restart  # 재시작!
```

---

## 📋 템플릿 파일

완전한 템플릿 파일은 다음 위치에 있습니다:
- `docs/development.env.template` - Dev 환경용
- `docs/production.env.template` - Prod 환경용

---

## 🔗 관련 문서

- `docs/QUICK_START.md` - 빠른 시작 가이드
- `docs/PROJECT_ARCHITECTURE.md` - 전체 아키텍처
- `docs/SESSION_SUMMARY.md` - 세션 요약

---

**마지막 업데이트**: 2026-02-09
