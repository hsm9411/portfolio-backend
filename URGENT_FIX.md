# ==========================================
# 🚨 긴급 수정 가이드
# ==========================================

## 문제 상황

```
portfolio-nginx-dev: unhealthy ❌
포트: 80, 443 (3001이 아님!)
```

## 원인

1. **포트 매핑 오류**: 3001이 아닌 80/443으로 열림
2. **Health Check 실패**: `/health` 엔드포인트 없음

---

## ✅ 해결 방법 (2가지 선택)

### 방법 1: 빠른 수동 수정 (5분) ⭐ 권장

**서버 SSH 접속:**
```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205
```

**컨테이너 중지:**
```bash
cd ~/portfolio-backend-dev
docker-compose down
```

**docker-compose.yml 수정:**
```bash
nano docker-compose.yml
```

**수정할 부분:**
```yaml
nginx:
  ports:
    - "3001:80"      # ← 이렇게 변경 (기존: "80:80")
    - "3443:443"     # ← 이렇게 변경 (기존: "443:443")
```

**저장 후 재시작:**
```bash
# Ctrl+O (저장)
# Enter
# Ctrl+X (종료)

docker-compose up -d

# 확인
docker ps | grep portfolio
```

**예상 결과:**
```
portfolio-nginx-dev: Up (healthy) 0.0.0.0:3001->80/tcp, 0.0.0.0:3443->443/tcp
```

---

### 방법 2: CI/CD로 자동 재배포 (10분)

**로컬에서:**
```bash
cd C:\hsm9411\portfolio-backend

# 수정된 파일 Push
git add .
git commit -m "fix: Dev 환경 포트 매핑 수정 (3001:80, 3443:443)"
git push origin develop
```

**GitHub Actions가 자동 재배포!**

---

## 🔍 확인 사항

### 1. 컨테이너 상태
```bash
docker ps | grep portfolio

# 예상 출력:
# portfolio-nginx-dev: Up (healthy) 0.0.0.0:3001->80/tcp, 0.0.0.0:3443->443/tcp ✅
```

### 2. HTTP 접속 (포트 3001)
```bash
curl http://158.180.75.205:3001
curl http://158.180.75.205:3001/api
```

### 3. HTTPS 접속 (포트 3443)
```bash
curl -k https://158.180.75.205:3443
curl -k https://158.180.75.205:3443/api
```

### 4. Nginx 로그
```bash
docker logs portfolio-nginx-dev --tail=50
```

---

## 📊 최종 포트 구조

### Production (변경 없음):
```
3000 → NestJS
6379 → Redis
```

### Development (수정됨):
```
3001 → Nginx (HTTP:80)
3443 → Nginx (HTTPS:443)
6380 → Redis (필요시)
```

---

## ⚠️ 주의사항

### Nginx Health Check

**현재 설정:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80"]
```

**왜 `/health`가 아닌 `/`를 사용?**
- Backend에 `/health` 엔드포인트가 없을 수 있음
- Nginx가 `localhost:80`에서 응답만 확인

**Backend `/health` 추가 (선택):**
```typescript
// src/app.controller.ts
@Get('health')
getHealth() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

---

## 🎯 빠른 해결 (추천)

**1분 안에 해결:**

```bash
# SSH 접속
ssh ubuntu@158.180.75.205

# 수정
cd ~/portfolio-backend-dev
nano docker-compose.yml

# nginx → ports 부분 찾아서:
# "3001:80"
# "3443:443"

# 저장 후:
docker-compose down && docker-compose up -d

# 확인:
docker ps | grep nginx
curl http://158.180.75.205:3001/api
```

---

**작성일:** 2026-02-15
