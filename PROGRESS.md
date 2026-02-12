# 🚀 Portfolio Backend API

## 📌 프로젝트 상태

| 구분 | 상태 | 설명 |
|------|------|------|
| **System Config** | ✅ 완료 | Trust Proxy, CORS, Throttler (Cloudflare 대응) |
| **Auth 모듈** | ✅ 완료 | Supabase OAuth (Google/GitHub) + Local 로그인 |
| **Projects 모듈** | ✅ 완료 | 포트폴리오 프로젝트 CRUD |
| **Posts 모듈** | ✅ 완료 | CRUD, Slug 자동생성, Tags 검색 |
| **Comments 모듈** | ✅ 완료 | Polymorphic, 익명 마스킹, Nested |
| **Likes 모듈** | ✅ 완료 | Polymorphic, 트랜잭션 기반 토글 |
| **Redis 조회수** | ✅ 완료 | IP 기반 캐싱, 24h TTL, Write-Back |

**최근 작업 (2026-02-10):**
- ✅ Redis 조회수: IP 기반 중복 방지 (24h TTL)
- ✅ ViewCountService: Redis 캐싱 + Write-Back 전략
- ✅ IP 추출: CF-Connecting-IP 우선 순위
- ✅ Posts/Projects Controller에 Redis 조회수 적용

---

## 🏗️ 아키텍처

### Traffic Flow (Cloudflare Proxy)
```
User → Cloudflare (DDoS/SSL) → Oracle Cloud (NestJS Docker)
                              → Vercel (Next.js Frontend)
```

### 핵심 설정
1. **Trust Proxy**: `req.ip` 보정
2. **CF-Connecting-IP**: Throttler IP 추출
3. **CORS**: Vercel 도메인만 허용

---

## 🔐 보안 설정

### Rate Limiting
```typescript
// 60회/분 (글로벌)
ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])
```

### IP 추출 우선순위
```
CF-Connecting-IP > X-Real-IP > X-Forwarded-For > req.ip
```

### Redis 조회수 캐싱
```typescript
// IP 기반 중복 방지
Key: view:ip:{type}:{id}:{ip} (TTL 24h)

// 누적 카운트
Key: view:count:{type}:{id}

// Write-Back: Redis → DB 주기적 동기화
```

---

## 📦 DB Schema

### Posts (완료)
- `slug` (unique, SEO 친화적)
- `tags` (text[], GIN 인덱스)
- `summary` (메타 태그용)
- `viewCount`, `likeCount`

### Comments (완료)
- Polymorphic: `target_type` (project/post)
- Authenticated Anonymity: `is_anonymous`
- Nested: `parent_id` (self-referencing)
- Masking: 익명 댓글은 작성자/Admin에게만 원본 정보 노출

### Likes (완료)
- Polymorphic: `(target_type, target_id, user_id)` UNIQUE
- Transaction: 좋아요 토글 + 카운트 증감 원자성 보장

---

## 🚀 배포 후 필수 작업

### 즉시 실행
1. **GIN 인덱스 생성** (MIGRATIONS.md 참고)
   ```sql
   CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);
   ```

2. **환경변수 확인**
   - CORS_ORIGINS: 실제 프론트엔드 도메인
   - NODE_ENV=production

3. **Redis 동기화 Cron Job 확인**
   - 매일 자정 자동 실행

### 선택 사항
- 테스트 코드 작성
- 에러 모니터링 (Sentry)
- Admin API 구현

자세한 내용은 **DEPLOYMENT_CHECKLIST.md** 참고

---

## 📝 환경변수

```bash
# CORS (다중 도메인)
CORS_ORIGINS=http://localhost:5173,https://yourapp.vercel.app

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your_jwt_secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

**기술 스택:** NestJS 11 | TypeORM | Supabase PostgreSQL | Redis | Cloudflare
