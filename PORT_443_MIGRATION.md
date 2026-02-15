# ✅ 최종 수정 - 표준 HTTPS 포트 (443)

## 문제 상황

**Frontend 에러:**
```
ERR_CONNECTION_TIMED_OUT
https://158.180.75.205:3443/projects
```

**원인:**
1. Frontend가 포트 `3443`로 접속 시도
2. 포트 `3443`은 방화벽에서 막혀있음
3. CI/CD는 표준 포트 `443`만 열어줌

---

## 해결 방법

### 1. Backend 포트를 표준 443으로 변경

**docker-compose.dev.yml:**
```yaml
nginx:
  ports:
    - "443:443"     # 표준 HTTPS 포트만 외부 노출
  expose:
    - "80"          # HTTP는 내부용 (health check)
```

**변경 이유:**
- ✅ 표준 포트 443 사용 (도메인 없을 때도 일반적)
- ✅ 방화벽이 자동으로 443 포트 허용 (CI/CD)
- ✅ Frontend 환경 변수 단순화

---

### 2. Frontend 환경 변수 수정

**Vercel → Settings → Environment Variables:**

```env
NEXT_PUBLIC_API_URL=https://158.180.75.205
```

**포트 명시 불필요** (443은 HTTPS 기본 포트)

---

## 포트 매핑 설명

### Docker 포트 매핑 구조

```yaml
ports:
  - "443:443"
```

**의미:**
```
외부 (Host OS)          컨테이너 내부
158.180.75.205:443  →  Nginx:443
```

**전체 흐름:**
```
1. Frontend (Vercel)
   ↓ HTTPS 요청
2. 158.180.75.205:443 (OCI 서버)
   ↓ iptables 방화벽 통과
3. Docker: portfolio-nginx-dev:443
   ↓ Nginx reverse proxy
4. Docker Network: portfolio-backend-dev:3000
   ↓ NestJS 처리
5. 응답
```

---

## 최종 포트 구성

### Production (변경 없음):
```
포트 3000 → NestJS (HTTP)
포트 6379 → Redis
```

### Development (수정):
```
포트 443 → Nginx (HTTPS) ✅ 외부 접근
포트 80  → Nginx (HTTP)  ✅ 내부용 (health check)
        ↓
포트 3000 → NestJS       ✅ 내부 전용
포트 6379 → Redis        ✅ 내부 전용
```

---

## Git Push & 배포

```bash
cd C:\hsm9411\portfolio-backend
git add .
git commit -m "fix: 표준 HTTPS 포트 443 사용"
git push origin develop
```

**GitHub Actions 자동 실행:**
1. Docker 이미지 빌드
2. 서버 배포
3. 포트 443 방화벽 자동 설정
4. SSL 인증서 자동 생성 (없을 경우)

---

## 배포 후 확인 (5분 후)

### 1. 서버 상태 확인

```bash
ssh ubuntu@158.180.75.205

# 컨테이너 상태
docker ps | grep portfolio-nginx-dev

# 예상 출력:
# Up (healthy) 0.0.0.0:443->443/tcp ✅
```

### 2. 방화벽 확인

```bash
sudo iptables -L -n | grep 443

# 예상 출력:
# ACCEPT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:443 ✅
```

### 3. HTTPS 접속 테스트

```bash
# 서버 내부에서
curl -k https://localhost:443/api

# 외부에서 (로컬 PC)
curl -k https://158.180.75.205/api
```

---

## Frontend 재배포

### Vercel 환경 변수 수정

```env
변수명: NEXT_PUBLIC_API_URL
값: https://158.180.75.205
```

**포트 제거!** (443은 기본값)

**Redeploy → 3-5분 대기**

---

## 체크리스트

- [ ] Backend Git Push (develop)
- [ ] GitHub Actions 성공 확인
- [ ] `docker ps` - Nginx healthy 확인
- [ ] 방화벽 443 포트 열림 확인
- [ ] `curl -k https://158.180.75.205/api` 성공
- [ ] Vercel 환경 변수 수정 (포트 제거)
- [ ] Vercel Redeploy
- [ ] Frontend 브라우저 테스트

---

## 예상 결과

### Backend:
```bash
docker ps | grep nginx
# Up (healthy) 0.0.0.0:443->443/tcp ✅
```

### Frontend (Vercel):
```
✅ API Client 초기화: { baseURL: "https://158.180.75.205" }
✅ [API Request] GET https://158.180.75.205/projects
✅ [API Response] 200 /projects
```

---

작성일: 2026-02-15
