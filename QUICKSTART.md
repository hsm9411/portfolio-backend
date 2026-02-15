# 🚀 Nginx HTTPS 구성 - 빠른 시작 가이드

## 당신이 할 일 (5단계, 15분)

### 1️⃣ Git Push
```bash
cd /c/hsm9411/portfolio-backend
git add .
git commit -m "feat: Add Nginx HTTPS with CI/CD"
git push origin develop
```

### 2️⃣ GitHub Actions 확인
https://github.com/hsm9411/portfolio-backend/actions
- `deploy-develop` Job이 모두 녹색인지 확인 (3-5분 대기)

### 3️⃣ HTTPS 접속 확인
https://158.180.75.205/api
- "안전하지 않음" 경고 → "계속 진행"
- Swagger 화면 나오면 성공!

### 4️⃣ Vercel 환경 변수 수정
```env
VITE_API_URL=https://158.180.75.205
```
- Settings → Environment Variables 수정
- Redeploy

### 5️⃣ Frontend 테스트
- https://your-app.vercel.app 접속
- Mixed Content 에러 없으면 완료!

---

## CI/CD가 자동으로 하는 것

- ✅ Docker 이미지 빌드 & 푸시
- ✅ Nginx 설정 파일 배포
- ✅ Self-Signed SSL 인증서 생성
- ✅ 방화벽 포트 443 오픈
- ✅ 컨테이너 재시작 (Nginx + Backend + Redis)
- ✅ Health Check

---

## 트러블슈팅

### GitHub Actions 실패 시
1. Actions 탭에서 에러 로그 확인
2. SSH 접속해서 상태 확인:
```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205
docker ps | grep portfolio
docker logs portfolio-nginx-dev
```

### HTTPS 접속 안 될 시
- 방화벽 확인: `sudo iptables -L | grep 443`
- 포트 열기: `sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT`

---

**전체 문서:** `docs/CICD_NGINX_SETUP.md`  
**체크리스트:** `CHECKLIST.md`
