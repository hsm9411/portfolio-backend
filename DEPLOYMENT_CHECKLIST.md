# 🚀 Portfolio Backend - 배포 후 체크리스트

## ✅ 필수 작업

### 1. Database 설정
**DATABASE_SETUP.md 파일의 SQL을 순서대로 실행하세요.**

1. Users 테이블
2. Projects 테이블
3. Posts 테이블 (GIN 인덱스 포함)
4. Comments 테이블
5. Likes 테이블
6. 스키마 확인

⚠️ **중요:** 각 SQL 블록을 개별적으로 실행하세요.

### 2. 환경변수 확인
```bash
# Oracle Cloud 서버에서 확인
cat .env

# 필수 확인 항목:
# - CORS_ORIGINS=* (개발/테스트용) 또는 특정 도메인
# - NODE_ENV=production
# - SUPABASE_JWT_SECRET 정확성
# - REDIS_HOST, REDIS_PORT
# - DATABASE_URL 정확성
```

### 3. Redis 동기화 확인
```bash
# Redis CLI에서 확인
redis-cli

# 조회수 카운트 키 확인
KEYS view:count:*

# IP 중복 체크 키 확인
KEYS view:ip:*
```

---

## 🔄 운영 작업

### Redis → DB 동기화

**자동 동기화:** 매일 자정 (KST 00:00)
- `TasksService.syncViewCountsToDB()` Cron Job 실행

**수동 동기화 (필요 시):**
```typescript
// 특정 Post 동기화
await viewCountService.syncSingleTarget('post', 'post-uuid');

// 특정 Project 동기화
await viewCountService.syncSingleTarget('project', 'project-uuid');
```

---

## 📊 모니터링

### 1. Health Check
```bash
curl https://your-api.com/health
```

### 2. Prometheus Metrics
```bash
curl https://your-api.com/metrics
```

### 3. Swagger API Docs
```
https://your-api.com/api
```

---

## 🐛 트러블슈팅

### 조회수가 증가하지 않는 경우
1. Redis 연결 확인
2. IP 추출 로직 확인 (CF-Connecting-IP)
3. Redis 키 TTL 확인

### CORS 에러
1. `CORS_ORIGINS` 환경변수에 프론트엔드 도메인 추가
2. Docker 재시작

### Rate Limiting 걸림
1. Throttler 설정 확인 (현재 60회/분)
2. IP 추출이 정상적으로 되는지 확인

---

## 🔧 다음 개선 사항

1. **테스트 코드 작성**
   - Unit Tests (Service)
   - E2E Tests (API)

2. **에러 모니터링**
   - Sentry 연동
   - 에러 알림 설정

3. **성능 최적화**
   - Query 최적화
   - 캐싱 확대

4. **Admin API**
   - 통계 조회
   - 사용자 관리

---

## 📞 문제 발생 시

1. 로그 확인: `docker logs portfolio-backend`
2. Redis 상태: `redis-cli ping`
3. DB 연결: Supabase 대시보드 확인
