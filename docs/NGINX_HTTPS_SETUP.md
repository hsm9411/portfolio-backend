# Nginx + HTTPS 구성 가이드

> OCI 서버에 Nginx Reverse Proxy를 추가하여 HTTPS 통신 구성

---

## 📋 목차

1. [왜 Nginx가 필요한가?](#왜-nginx가-필요한가)
2. [아키텍처 비교](#아키텍처-비교)
3. [빠른 시작](#빠른-시작)
4. [단계별 설정](#단계별-설정)
5. [Let's Encrypt 설정](#lets-encrypt-설정)
6. [트러블슈팅](#트러블슈팅)

---

## 왜 Nginx가 필요한가?

### 문제점 (Before)

```
Vercel (HTTPS) → OCI Backend (HTTP:3001)
└─ Mixed Content 에러
└─ 프론트에서 rewrite/proxy로 우회
```

### 해결 (After)

```
Vercel (HTTPS) → Nginx (HTTPS:443) → NestJS (HTTP:3000)
└─ 깔끔한 HTTPS 통신
└─ 표준 아키텍처
```

**장점:**
- Mixed Content 문제 완전 해결
- 무료 SSL 인증서 (Let's Encrypt)
- 프론트 코드 단순화
- 표준 Reverse Proxy 패턴

---

## 아키텍처 비교

### 기존 구조

```
┌─────────────┐
│   Vercel    │ HTTPS
│  (Frontend) │
└──────┬──────┘
       │ ❌ Mixed Content Error
       ▼
┌─────────────┐
│ OCI Backend │ HTTP:3001
│   (NestJS)  │
└─────────────┘
```

### 새로운 구조

```
┌─────────────┐
│   Vercel    │ HTTPS
│  (Frontend) │
└──────┬──────┘
       │ ✅ HTTPS
       ▼
┌─────────────┐
│    Nginx    │ HTTPS:443
│ (Reverse    │
│  Proxy)     │
└──────┬──────┘
       │ HTTP (Docker 내부)
       ▼
┌─────────────┐
│   NestJS    │ HTTP:3000
│  Backend    │
└─────────────┘
```

---

## 빠른 시작

### 1. Self-Signed 인증서 생성 (임시)

```bash
# 로컬 (Windows Git Bash)
cd /c/hsm9411/portfolio-backend
bash scripts/generate-selfsigned-cert.sh
```

### 2. docker-compose 실행

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. 확인

```bash
# HTTP
curl http://158.180.75.205/health

# HTTPS (Self-Signed)
curl -k https://158.180.75.205/health
```

---

## 단계별 설정

### Step 1: Self-Signed 인증서 생성

**목적:** Let's Encrypt 발급 전까지 임시로 HTTPS 테스트

```bash
# 서버 SSH 접속
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205

# 프로젝트 디렉토리
cd ~/portfolio-backend-dev

# Self-Signed 인증서 생성
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx-selfsigned.key \
  -out nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Portfolio/CN=158.180.75.205"
```

**결과:**
```
nginx/ssl/
├── nginx-selfsigned.crt  # 공개 인증서
└── nginx-selfsigned.key  # 비밀 키
```

### Step 2: docker-compose 업데이트

**파일:** `docker-compose.dev.yml`

```yaml
services:
  nginx:
    image: nginx:1.25-alpine
    container_name: portfolio-nginx-dev
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-selfsigned.conf:/etc/nginx/conf.d/default.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app

  app:
    # 포트 노출 제거 (Nginx를 통해서만 접근)
    expose:
      - "3000"
```

### Step 3: 컨테이너 시작

```bash
# 기존 컨테이너 정지
docker-compose down

# 새 구성으로 시작
docker-compose -f docker-compose.dev.yml up -d

# 로그 확인
docker-compose -f docker-compose.dev.yml logs -f nginx
```

### Step 4: 방화벽 확인

```bash
# Oracle Cloud 방화벽에서 443 포트 열기
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### Step 5: 테스트

```bash
# HTTP
curl http://158.180.75.205/health

# HTTPS (Self-Signed - 경고 무시)
curl -k https://158.180.75.205/health

# Swagger
https://158.180.75.205/api
```

**브라우저:**
- `https://158.180.75.205` 접속
- "안전하지 않음" 경고 → "계속 진행" 클릭
- Swagger 정상 표시

---

## Let's Encrypt 설정

### 전제 조건

1. **도메인 필요** (예: `api.yourdomain.com`)
2. **DNS A 레코드** → `158.180.75.205`
3. **포트 80 열림** (ACME Challenge용)

### Step 1: 도메인 DNS 설정

```
도메인 등록 업체 (Cloudflare, GoDaddy 등)
→ DNS 관리
→ A 레코드 추가

Type: A
Name: api  (또는 @)
Value: 158.180.75.205
TTL: Auto
```

### Step 2: Let's Encrypt 인증서 발급

```bash
# 서버 SSH 접속
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205

cd ~/portfolio-backend-dev

# Certbot 실행
bash scripts/setup-letsencrypt.sh api.yourdomain.com your-email@example.com
```

**발급 과정:**
```
1. Certbot이 ACME Challenge 파일 생성
2. Let's Encrypt 서버가 http://api.yourdomain.com/.well-known/acme-challenge/ 접근
3. 도메인 소유권 검증
4. 인증서 발급 → certbot/conf/live/api.yourdomain.com/
```

### Step 3: Nginx 설정 업데이트

**파일:** `nginx/nginx.conf`

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;  # ← 도메인 변경

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # ... 나머지 설정 동일
}
```

### Step 4: docker-compose 수정

```yaml
nginx:
  volumes:
    # Self-Signed 제거
    # - ./nginx/nginx-selfsigned.conf:/etc/nginx/conf.d/default.conf
    # - ./nginx/ssl:/etc/nginx/ssl
    
    # Let's Encrypt 추가
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
```

### Step 5: Nginx 재시작

```bash
docker-compose -f docker-compose.dev.yml restart nginx
```

### Step 6: 자동 갱신 설정

Let's Encrypt 인증서는 90일 유효 → Cron으로 자동 갱신

```bash
# Crontab 편집
crontab -e

# 매일 새벽 2시 갱신 체크
0 2 * * * cd ~/portfolio-backend-dev && docker-compose -f docker-compose.dev.yml run --rm certbot renew && docker-compose -f docker-compose.dev.yml restart nginx
```

---

## 트러블슈팅

### 1. "Connection Refused" (포트 443)

```bash
# 방화벽 확인
sudo iptables -L -n | grep 443

# 포트 열기
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Nginx 상태 확인
docker logs portfolio-nginx-dev
```

### 2. "SSL Certificate Not Found"

```bash
# 인증서 파일 확인
ls -la nginx/ssl/
# 또는
ls -la certbot/conf/live/yourdomain/

# 권한 확인
chmod 644 nginx/ssl/*.crt
chmod 600 nginx/ssl/*.key
```

### 3. "502 Bad Gateway"

```bash
# Backend 컨테이너 상태 확인
docker ps | grep portfolio-backend-dev

# Backend 로그 확인
docker logs portfolio-backend-dev

# 네트워크 연결 확인
docker exec portfolio-nginx-dev ping portfolio-backend-dev
```

### 4. Let's Encrypt 발급 실패

```bash
# 도메인 DNS 전파 확인
nslookup api.yourdomain.com
dig api.yourdomain.com

# ACME Challenge 접근 테스트
curl http://api.yourdomain.com/.well-known/acme-challenge/test

# Certbot 디버그 모드
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --dry-run \
  --webroot --webroot-path=/var/www/certbot \
  -d api.yourdomain.com
```

### 5. "Mixed Content" 여전히 발생

**Frontend 코드 확인:**

```typescript
// ❌ 잘못된 설정
const API_URL = 'http://158.180.75.205:3001';

// ✅ 올바른 설정
const API_URL = 'https://158.180.75.205';  // Self-Signed
// 또는
const API_URL = 'https://api.yourdomain.com';  // Let's Encrypt
```

**Vercel 환경 변수:**
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## 체크리스트

### Self-Signed 인증서 사용 시

- [ ] `nginx/ssl/` 디렉토리에 인증서 생성
- [ ] `docker-compose.dev.yml` 업데이트
- [ ] Nginx 컨테이너 시작
- [ ] 포트 80, 443 방화벽 열기
- [ ] 브라우저에서 "안전하지 않음" 경고 무시하고 진행

### Let's Encrypt 인증서 사용 시

- [ ] 도메인 구매
- [ ] DNS A 레코드 설정 (`158.180.75.205`)
- [ ] DNS 전파 확인 (`nslookup`)
- [ ] Certbot으로 인증서 발급
- [ ] `nginx/nginx.conf`에서 도메인 변경
- [ ] `docker-compose.dev.yml` 업데이트
- [ ] Nginx 재시작
- [ ] Cron 자동 갱신 설정

---

## 참고 자료

- [Nginx Reverse Proxy 공식 문서](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt 가이드](https://letsencrypt.org/getting-started/)
- [Certbot Docker](https://hub.docker.com/r/certbot/certbot)

---

**작성일:** 2026-02-15  
**마지막 업데이트:** 2026-02-15
