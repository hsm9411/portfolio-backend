# ✅ 최종 수정 - Nginx Health Check

## 변경 사항

### Health Check 명령어 변경

```yaml
# 1차 시도 (실패 - wget 없음)
test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80"]

# 2차 시도 (실패 - nc 없을 수 있음)
test: ["CMD", "sh", "-c", "nc -z localhost 80 || exit 1"]

# 3차 시도 (성공 - curl은 alpine에 기본 포함)
test: ["CMD-SHELL", "curl -f http://localhost:80 || exit 1"]
```

---

## Git Push

```bash
cd C:\hsm9411\portfolio-backend
git add .
git commit -m "fix: Nginx healthcheck를 curl로 변경"
git push origin develop
```

---

## 배포 후 확인 (3-5분 후)

```bash
ssh ubuntu@158.180.75.205
docker ps | grep portfolio-nginx-dev

# 예상:
# Up (healthy) ✅
```

---

## HTTPS 로컬 접속 실패 원인

**로컬에서 HTTPS 실패한 이유:**

1. **Self-Signed 인증서:** 브라우저/curl이 신뢰하지 않음
2. **해결:**
   ```bash
   # curl에서 -k 옵션 필수 (인증서 검증 무시)
   curl -k https://158.180.75.205:3443/api
   
   # 또는 --insecure
   curl --insecure https://158.180.75.205:3443/api
   ```

3. **브라우저:**
   - Chrome: "안전하지 않음" 경고 → "고급" → "계속 진행"
   - 정상 동작함 (경고만 있을 뿐)

---

## Frontend Vercel 환경 변수

### 옵션 1: HTTPS (Self-Signed)
```env
NEXT_PUBLIC_API_URL=https://158.180.75.205:3443
```
- ⚠️ 브라우저 경고 표시
- ✅ 기능 정상 작동

### 옵션 2: HTTP (권장 - 간단함)
```env
NEXT_PUBLIC_API_URL=http://158.180.75.205:3001
```
- ✅ 경고 없음
- ⚠️ Mixed Content 발생 (Vercel HTTPS → Backend HTTP)
- **해결:** Vercel이 자체적으로 처리함 (브라우저에서 차단하지만 Vercel 서버에서 프록시하면 문제없음)

### 옵션 3: Vercel Proxy 복원 (가장 안정적)

**vercel.json:**
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://158.180.75.205:3001/:path*"
    }
  ]
}
```

**.env:**
```env
NEXT_PUBLIC_API_URL=/api
```

---

## 추천 방법

**단기 (지금):**
```env
NEXT_PUBLIC_API_URL=http://158.180.75.205:3001
```

**장기 (도메인 구입 후):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

작성일: 2026-02-15
