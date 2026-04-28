# Redis 가이드 — 개념부터 이 프로젝트 활용까지

> 최종 업데이트: 2026-04-24

---

## 1. Redis란 무엇인가

### 한 줄 정의

> **메모리에 데이터를 저장하는 Key-Value 저장소**

일반 DB(PostgreSQL 등)는 데이터를 디스크에 저장합니다. Redis는 **RAM에 저장**하기 때문에 읽기/쓰기 속도가 압도적으로 빠릅니다.

```
PostgreSQL (Supabase 원격)  →  100~300ms 왕복
Redis (같은 서버 내)         →  1ms 미만
```

### Redis가 빠른 이유

```
┌────────────────────────────────────────────────────┐
│  일반 DB 조회 흐름                                    │
│                                                    │
│  앱 → 네트워크 → DB 서버 → 디스크 읽기 → 네트워크 → 앱   │
│       (왕복 지연)          (I/O 지연)   (왕복 지연)    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Redis 조회 흐름                                      │
│                                                    │
│  앱 → (같은 서버 내) → RAM 조회 → 앱                   │
│       (거의 0ms)      (나노초)                        │
└────────────────────────────────────────────────────┘
```

### Redis의 주요 특징

| 특징 | 설명 |
|------|------|
| **TTL (Time To Live)** | 키마다 만료 시간 설정 가능. 시간이 지나면 자동 삭제 |
| **다양한 자료구조** | String, List, Set, Sorted Set, Hash 등 지원 |
| **Pub/Sub** | 메시지 발행/구독 패턴 지원 |
| **영속성** | 설정에 따라 디스크에도 백업 가능 (선택적) |
| **단순성** | SQL 없이 `GET key` / `SET key value` 방식 |

---

## 2. 이 프로젝트에서 Redis를 사용하는 이유

이 프로젝트의 핵심 구조:

```
NestJS 백엔드 ──→ Supabase (원격 PostgreSQL)
                  (한국 서버 → 해외 DB)
                  왕복 100~300ms
```

Supabase가 원격에 있어서 DB 왕복 비용이 크기 때문에, **자주 쓰이거나 빠른 응답이 필요한 데이터**를 Redis에 올려둡니다.

---

## 3. 현재 사용 중인 4가지 패턴

### 패턴 1 — API 응답 캐싱 (Cache-Aside)

**위치**: `src/modules/posts/posts.service.ts`, `src/modules/projects/projects.service.ts`

**동작 방식**:

```
클라이언트 GET /projects 요청
        │
        ▼
  Redis에 캐시 있음? ──Yes──→ Redis에서 즉시 반환 (1ms)
        │
       No
        │
        ▼
  DB에서 조회 (100~300ms)
        │
        ▼
  결과를 Redis에 저장 (TTL 60초)
        │
        ▼
  클라이언트에 반환
```

**코드**:

```typescript
const CACHE_TTL = 60 * 1000; // 60초 (ms 단위)

async findAll(dto: GetProjectsDto): Promise<PaginatedProjectsResponseDto> {
  const cacheKey = `projects:list:${JSON.stringify(dto)}`;

  // 1. 캐시 조회
  const cached = await this.cacheManager.get<PaginatedProjectsResponseDto>(cacheKey);
  if (cached) return cached; // 캐시 히트 → 즉시 반환

  // 2. DB 조회
  const result = await this.projectRepository.find({ ... });

  // 3. 캐시 저장
  await this.cacheManager.set(cacheKey, result, CACHE_TTL);
  return result;
}
```

**왜 쓰나**: 목록 API는 초당 여러 번 호출될 수 있습니다. 매번 DB를 치는 대신 60초 동안 캐시를 제공하면 DB 부하가 크게 줄어듭니다.

**주의할 점**: 데이터가 변경되면 캐시를 무효화해야 합니다.

```typescript
// 프로젝트/포스트 수정·삭제 시 캐시 무효화
async invalidateListCache(type: 'projects' | 'posts') {
  const pattern = `${type}:list:*`;
  // 패턴에 매칭되는 모든 캐시 키 삭제
}
```

---

### 패턴 2 — JWT 블랙리스트 (Token Revocation)

**위치**: `src/modules/auth/auth.service.ts`, `src/modules/auth/strategies/jwt.strategy.ts`

**문제 상황**:

JWT는 서버가 상태를 저장하지 않는 **Stateless** 토큰입니다. 로그아웃해도 토큰 자체가 만료되기 전까지는 유효합니다.

```
로그아웃 후에도...
클라이언트가 기존 토큰으로 요청 → 서버는 유효하다고 판단 → 보안 취약점
```

**Redis로 해결**:

```
POST /auth/logout
        │
        ▼
  토큰의 jti(고유 ID)를 Redis에 저장
  key: "auth:blacklist:{jti}"
  TTL: 토큰 만료까지 남은 시간 (자동 삭제)
        │
        ▼
  이후 모든 API 요청 진입 시
        │
        ▼
  Redis에서 jti 조회
  있으면 → 401 Unauthorized
  없으면 → 정상 통과
```

**코드**:

```typescript
// 로그아웃 시
async logout(token: string): Promise<void> {
  const decoded = this.jwtService.decode(token);
  const ttl = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000; // ms

  if (ttl > 0) {
    // 블랙리스트에 추가 (토큰 만료 시 자동 삭제)
    await this.cacheManager.set(`auth:blacklist:${decoded.jti}`, '1', ttl);
  }
}

// 요청 검증 시
async validateRequest(jti: string): Promise<boolean> {
  const blacklisted = await this.cacheManager.get(`auth:blacklist:${jti}`);
  return !blacklisted;
}
```

**왜 Redis인가**: DB에 블랙리스트를 저장하면 모든 API 요청마다 DB를 쿼리해야 합니다. 요청이 많아질수록 DB 부하가 커집니다. Redis는 1ms 미만으로 처리하고, TTL로 만료된 항목을 자동 삭제합니다.

---

### 패턴 3 — Refresh Token 저장

**위치**: `src/modules/auth/auth.service.ts`

**Token Rotation 방식**:

```
클라이언트                          서버 (Redis)
    │                                   │
    │── POST /auth/refresh ──────────→  │
    │   (Refresh Token A 전송)          │
    │                                   │  Redis 조회: Token A 있나?
    │                                   │  있으면 → 사용자 확인
    │                                   │  Token A 삭제
    │                                   │  Token B 새로 저장 (7일 TTL)
    │← Access Token 새로 발급 ──────────│
    │  + Refresh Token B 발급           │
    │                                   │
    │  (Token A는 이미 삭제됨 → 재사용 불가) │
```

**왜 Redis인가**:
- DB에 저장하면 만료된 토큰을 직접 주기적으로 정리해야 합니다
- Redis TTL을 7일로 설정하면 만료 후 자동 삭제됩니다
- Rotation 방식이므로 갱신 시 즉각적인 삭제가 필요한데, Redis는 `del` 명령이 즉각적입니다

---

### 패턴 4 — 조회수 Write-Back (Buffer & Batch)

**위치**: `src/common/services/view-count.service.ts`

**문제 상황**:

```
포스트 하나가 1시간에 100번 조회된다면?
→ DB UPDATE를 100번 실행
→ DB 부하 + 잦은 쓰기로 인한 성능 저하
```

**Write-Back 패턴으로 해결**:

```
조회 발생할 때마다
        │
        ▼
  Redis에만 카운트 증가 (즉각, 1ms)
  "view:post:{id}" = 37
        │
        ▼ (30분마다 Cron)
  Redis 카운트를 DB에 한 번에 반영
  UPDATE posts SET view_count = view_count + 37
  Redis 카운트 초기화
```

**IP 중복 방지**도 Redis로 처리:

```typescript
const ipKey = `view:ip:${type}:${id}:${clientIp}`;

// 이 IP가 24시간 내에 이미 조회했나?
const hasViewed = await this.cacheManager.get(ipKey);
if (hasViewed) return; // 중복 조회 무시

// 처음 조회라면 IP 기록 (24시간 TTL)
await this.cacheManager.set(ipKey, '1', 24 * 60 * 60 * 1000);
```

**Redis Key 구조 정리**:

```
view:ip:{type}:{id}:{ip}   TTL: 24h   IP 중복 방지
view:count:{type}:{id}     TTL: 없음  누적 카운트 (명시적 삭제)
```

---

## 4. Redis 설정 구조 (이 프로젝트)

**패키지 스택**:

```
@nestjs/cache-manager  v3   ← NestJS Redis 통합 모듈
cache-manager          v7   ← 캐시 추상화 레이어 (Keyv 기반)
@keyv/redis            v5   ← Redis용 Keyv 어댑터 (keyv v5 공식)
redis (node-redis)     v5   ← Redis 클라이언트
```

> **삽질 이력**: `cache-manager-redis-yet` v5는 cache-manager v5용이라 v7과 호환 안 됨.
> BACK-36에서 발견, BACK-37에서 `@keyv/redis`로 교체. (2026-04-24)

**설정 코드** (`src/config/redis.config.ts`):

```typescript
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';

export const getRedisConfig = (configService: ConfigService): CacheModuleOptions => {
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');
  const ttlSeconds = configService.get<number>('REDIS_TTL') || 600;

  return {
    stores: [
      new Keyv({
        store: new KeyvRedis(`redis://${host}:${port}`),
        ttl: ttlSeconds * 1000, // keyv v5는 ms 단위
      }),
    ],
  };
};
```

**환경변수**:

```
REDIS_HOST=localhost   # Docker 컨테이너명 (portfolio-redis)
REDIS_PORT=6379
REDIS_TTL=600          # 기본 TTL (초 단위, 실제로는 cacheManager.set() 호출 시 명시적으로 전달)
```

---

## 5. 앞으로 활용할 수 있는 패턴

### 5-1. Rate Limiting Redis화 (서버 분리 시 필수)

**현재 문제**:

```
ThrottlerModule이 in-memory 방식
→ 서버가 1대일 때는 정상
→ 서버 2대로 분리하면?
   Server1: 이 IP 50회 요청
   Server2: 이 IP 50회 요청
   → 실제로는 100회인데 각 서버는 50회로 인식 → rate limit 우회 가능
```

**Redis 기반으로 교체하면**:

```
Server1, Server2 모두 같은 Redis를 바라봄
→ 어느 서버로 가든 IP당 요청 수가 정확히 집계됨
```

```typescript
// 교체 예시
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [{ ttl: 60000, limit: 60 }],
    storage: new ThrottlerStorageRedisService(redisClient),
  }),
})
```

**적용 시점**: 서버 2대 분리 결정 시

---

### 5-2. trackedTargets를 Redis Set으로 교체 (서버 분리 시 필요)

**현재 문제**:

```typescript
// ViewCountService 내부
private readonly trackedTargets = new Set<string>(); // ← in-memory
```

서버 재시작 시 이 Set이 초기화됩니다. Redis에 조회수 카운트는 남아있는데, cron이 어떤 키를 동기화할지 모르게 됩니다.

**Redis Set으로 교체**:

```typescript
// 조회 발생 시
await this.redis.sadd('view:tracked', `${type}:${id}`);

// Cron 실행 시
const targets = await this.redis.smembers('view:tracked');
for (const target of targets) {
  await this.syncToDB(target);
}
await this.redis.del('view:tracked');
```

**적용 시점**: 서버 2대 분리 결정 시

---

### 5-3. 알림 큐 (BACK-33 Discord Webhook 구현 시)

**문제**:

```
댓글 저장 → Discord API 호출 (외부 서비스, 지연 가능) → 응답
           ↑ 이 부분이 느리거나 실패하면 댓글 저장 전체가 느려짐
```

**Bull 큐 (Redis 기반) 적용**:

```
댓글 저장 완료 → Redis 큐에 job 추가 → 즉시 응답 반환
                         │
                         ▼ (백그라운드 워커)
                   Discord API 호출
                   실패 시 자동 retry (3회)
```

```typescript
// @nestjs/bull 사용 예시
@InjectQueue('notifications') private queue: Queue

// 댓글 생성 후
await this.queue.add('discord', { commentId: saved.id });

// 워커
@Process('discord')
async handleDiscord(job: Job) {
  await this.discordService.sendNewCommentAlert(job.data.commentId);
}
```

**적용 시점**: BACK-33 구현 시

---

## 6. Redis 패턴 한눈에 보기

```
┌─────────────────────────────────────────────────────────────┐
│                    이 프로젝트의 Redis 구조                    │
│                                                             │
│  auth:blacklist:{jti}     TTL: 토큰 만료까지   JWT 블랙리스트  │
│  auth:refresh:{rti}       TTL: 7일             Refresh Token │
│                                                             │
│  projects:list:{query}    TTL: 60s             API 캐시      │
│  posts:list:{query}       TTL: 60s             API 캐시      │
│                                                             │
│  view:ip:{type}:{id}:{ip} TTL: 24h             중복 방지      │
│  view:count:{type}:{id}   TTL: 없음            조회수 버퍼     │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 핵심 개념 요약

| 개념 | 한 줄 설명 | 이 프로젝트 적용 |
|------|-----------|----------------|
| **Cache-Aside** | 요청 시 캐시 먼저 확인, 없으면 DB 조회 후 캐시 저장 | API 목록 캐싱 |
| **TTL** | 키 자동 만료. 정리 로직 불필요 | JWT 블랙리스트, Refresh Token |
| **Write-Back** | 쓰기를 Redis에 버퍼링 후 배치로 DB 반영 | 조회수 |
| **Token Rotation** | 사용된 Refresh Token을 즉시 폐기하고 새 토큰 발급 | Refresh Token |
| **Fire-and-Forget** | 부수 작업은 응답 블로킹 없이 백그라운드 처리 | 댓글 count 업데이트 |
| **분산 Rate Limit** | 여러 서버가 공유 Redis로 요청 수 집계 | (서버 분리 시 적용 예정) |
