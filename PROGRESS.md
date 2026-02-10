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
| **Redis 조회수** | ⏳ 대기 | IP 기반 캐싱 (TTL 24h) |

**최근 작업 (2026-02-10):**
- ✅ Comments: Polymorphic Entity, 로그인 기반 익명, Nested 댓글
- ✅ Comments Masking: 작성자/Admin에게만 원본 정보 노출
- ✅ Likes: Polymorphic Entity, UNIQUE 제약, 트랜잭션 토글
- ✅ OptionalJwtAuthGuard: 선택적 인증 (비로그인 조회 허용)

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

## 🚀 다음 작업

1. Redis 조회수 캐싱 (IP+PostID, TTL 24h)
2. 프론트엔드 연동 (Next.js + Supabase SDK)
3. Docker Compose 배포 구성 최적화

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
