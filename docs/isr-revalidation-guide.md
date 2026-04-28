# ISR & Revalidation 가이드 — 구조와 흐름

> 최종 업데이트: 2026-04-24

---

## 1. ISR이란?

### Next.js의 렌더링 방식 비교

Next.js는 페이지를 미리 만들어두는 방식(정적 생성)과 요청마다 만드는 방식(서버 렌더링) 사이에 **ISR(Incremental Static Regeneration)** 이라는 절충점을 제공합니다.

```
┌────────────────────────────────────────────────────────────────┐
│  SSR (Server-Side Rendering)                                   │
│                                                                │
│  사용자 요청 → 서버가 그때그때 DB 조회 → HTML 생성 → 반환        │
│  장점: 항상 최신 데이터                                          │
│  단점: 매 요청마다 서버 부하, 응답 느림                           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  SSG (Static Site Generation)                                  │
│                                                                │
│  빌드 시점에 HTML 생성 → CDN에 배포 → 사용자 요청 시 즉시 반환  │
│  장점: 매우 빠름 (CDN 캐시)                                     │
│  단점: 데이터 변경돼도 재빌드 전까지 반영 안 됨                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ISR (Incremental Static Regeneration) ← 이 프로젝트           │
│                                                                │
│  빌드 시점에 HTML 생성 → CDN 제공 (빠름)                        │
│  + 백엔드가 "지금 다시 만들어" 신호를 보내면 → 페이지 재생성     │
│  장점: 빠름 + 데이터 변경 시 반영 가능                          │
└────────────────────────────────────────────────────────────────┘
```

### ISR의 핵심 개념: On-Demand Revalidation

Vercel은 두 가지 ISR 방식을 지원합니다.

```
방식 1. 시간 기반 (Time-based)
  → revalidate: 60  // 60초마다 백그라운드에서 페이지 재생성
  → 단점: 콘텐츠 바꿔도 최대 60초 뒤에 반영

방식 2. On-Demand (이 프로젝트)
  → 백엔드가 콘텐츠 변경 시 Vercel에 직접 신호를 보냄
  → 장점: 변경 즉시 반영
  → 신호: POST {vercel앱}/api/revalidate
```

---

## 2. 이 프로젝트의 전체 흐름

### 포스트/프로젝트 생성·수정·삭제 시

```
관리자 (브라우저)
    │
    │  POST /posts  (글 작성)
    ▼
NestJS 백엔드 (Oracle Cloud VM)
    │
    ├─① DB 저장 (Supabase PostgreSQL)
    │
    ├─② Redis 캐시 무효화 (fire-and-forget)
    │   posts:list:* 패턴의 모든 키 삭제
    │
    └─③ Vercel Revalidation Webhook 발송 (fire-and-forget)
         │
         │  POST https://{FRONTEND_URL}/api/revalidate
         │  Header: x-revalidate-secret: {REVALIDATE_SECRET}
         │  Body:   { type: "post", id: "abc-123" }
         │
         ▼
    Vercel 서버리스 함수 (/api/revalidate)
         │
         ├─ secret 검증
         │
         └─ revalidatePath('/blog') 호출
            revalidatePath('/blog/abc-123') 호출
                 │
                 ▼
            Vercel이 해당 페이지를 백그라운드에서 재생성
                 │
                 ▼
            다음 사용자 요청부터 새로운 HTML 제공
```

### 일반 사용자의 페이지 접근 시

```
일반 사용자 (브라우저)
    │
    │  GET https://portfolio.vercel.app/blog
    ▼
Vercel CDN
    │
    ├─ 캐시된 정적 HTML 즉시 반환 (수 ms)
    │  (Revalidation이 완료되어 있으면 최신 데이터)
    │
    └─ 필요 시 클라이언트에서 추가 API 호출
         │
         ▼
       NestJS 백엔드 (데이터 API)
```

---

## 3. 구성 요소별 코드 분석

### ① RevalidationService

**파일**: `src/common/services/revalidation.service.ts`

```typescript
private async trigger(
  payload: { type: string; id?: string },
  attempt = 1,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_SECRET;

  // 환경변수 미설정 시 조용히 스킵 (개발 환경 고려)
  if (!frontendUrl || !secret) {
    this.logger.warn('Revalidation skipped: FRONTEND_URL or REVALIDATE_SECRET not set');
    return;
  }

  await this.httpService.axiosRef.post(
    `${frontendUrl}/api/revalidate`,
    payload,
    {
      headers: { 'x-revalidate-secret': secret },
      timeout: 5000,
    },
  );
}
```

**재시도 로직 (Exponential Backoff)**:

```
1차 시도 실패
    │ 1초 대기
    ▼
2차 시도 실패
    │ 2초 대기
    ▼
3차 시도 실패
    │
    ▼
Logger.error 기록 후 포기
```

```typescript
// 지수 백오프: 1s → 2s → 4s
const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
```

> **왜 Exponential Backoff인가?**
> Vercel이 일시적으로 과부하 상태이거나 네트워크가 불안정할 때, 짧은 간격으로 계속 재시도하면 상황이 악화됩니다. 간격을 점점 늘려서 복구될 시간을 주는 패턴입니다.

---

### ② 트리거 시점 — PostsService / ProjectsService

**파일**: `src/modules/posts/posts.service.ts`

| 동작 | Redis 캐시 무효화 | Revalidation 발송 |
|------|-----------------|-----------------|
| 글 생성 (발행 상태) | ✅ | ✅ `revalidatePost(id)` |
| 글 생성 (초안) | ✅ | ❌ (미발행이므로 불필요) |
| 글 발행/비발행 전환 | ✅ | ✅ `revalidatePost(id)` |
| 글 수정 | ✅ | ✅ `revalidatePost(id)` |
| 글 삭제 | ✅ | ✅ `revalidatePost()` (id 없음 → 목록만) |

```typescript
// 생성 예시
const saved = await this.postRepository.save(post);

this.invalidateListCache().catch(() => {});        // Redis 캐시 삭제
if (isPublished) {
  this.revalidationService.revalidatePost(saved.id).catch(() => {}); // Vercel 알림
}
```

> **`.catch(() => {})`의 의미**: fire-and-forget 패턴입니다.
> Revalidation 실패가 글 생성 응답에 영향을 주면 안 됩니다.
> 사용자는 글이 저장됐다는 응답을 즉시 받고, Vercel 갱신은 백그라운드에서 처리됩니다.

---

### ③ Redis 캐시 무효화 — invalidateListCache()

**파일**: `src/modules/posts/posts.service.ts`

```typescript
private async invalidateListCache(): Promise<void> {
  try {
    // Redis 클라이언트에 직접 접근해서 패턴으로 키 삭제
    const client = (this.cacheManager.stores[0] as any).store?.client;
    const keys: string[] = await client.keys(`posts:list:*`);
    if (keys.length > 0) await client.del(keys);
  } catch { /* non-critical */ }
}
```

**왜 패턴 삭제인가?**

목록 API의 캐시 키는 쿼리 파라미터(정렬, 페이지, 검색어)를 포함합니다.

```
posts:list:{"page":1,"limit":10,"sortBy":"createdAt"}
posts:list:{"page":1,"limit":10,"sortBy":"viewCount"}
posts:list:{"page":2,"limit":10,"sortBy":"createdAt","search":"NestJS"}
...
```

특정 키를 정확히 알 수 없으므로, `posts:list:*` 패턴으로 관련 키를 전부 삭제합니다.

---

## 4. 두 개의 캐시 레이어

이 프로젝트에는 캐시가 두 군데 있습니다.

```
사용자 브라우저
    │
    ▼
┌─────────────────────────────────────────┐
│  Vercel CDN 캐시 (ISR)                  │  ← 레이어 1
│  정적 HTML 페이지 단위                   │
│  갱신 주기: On-Demand (백엔드가 신호 발송) │
└─────────────────┬───────────────────────┘
                  │ (클라이언트에서 데이터 API 호출 시)
                  ▼
┌─────────────────────────────────────────┐
│  Redis 캐시 (API 응답)                  │  ← 레이어 2
│  JSON 데이터 단위                        │
│  TTL: 60초 (자동 만료)                   │
└─────────────────┬───────────────────────┘
                  │ (캐시 미스 시)
                  ▼
┌─────────────────────────────────────────┐
│  Supabase PostgreSQL                    │
│  실제 데이터 저장소                       │
└─────────────────────────────────────────┘
```

**각 레이어의 역할**:

| 레이어 | 대상 | 갱신 방식 | 담당 |
|--------|------|---------|------|
| Vercel ISR | 정적 HTML 페이지 | 백엔드 webhook 신호 | 프론트엔드 |
| Redis 캐시 | API JSON 응답 | 변경 시 즉시 삭제 | 백엔드 |
| Supabase DB | 원본 데이터 | 항상 최신 | DB |

---

## 5. 환경변수 설정

```bash
# 백엔드 .env (Oracle Cloud VM)
FRONTEND_URL=https://portfolio.vercel.app   # Vercel 배포 URL
REVALIDATE_SECRET=your-secret-key           # Vercel과 공유하는 비밀키
```

```bash
# 프론트엔드 Vercel 환경변수
REVALIDATE_SECRET=your-secret-key           # 백엔드와 동일한 값
```

> **REVALIDATE_SECRET이 필요한 이유**:
> `/api/revalidate` 엔드포인트는 누구나 접근할 수 있는 공개 URL입니다.
> 악의적인 사용자가 계속 revalidation을 트리거해서 Vercel 서버에 과부하를 줄 수 있습니다.
> Secret 값을 알고 있는 백엔드만 revalidation을 요청할 수 있도록 검증합니다.

---

## 6. 실제 데이터 흐름 예시

### 시나리오: 새 블로그 포스트 작성

```
시간    이벤트
──────────────────────────────────────────────────────
T+0ms   관리자가 POST /posts 요청 전송

T+150ms DB 저장 완료 (Supabase 왕복)
        → 응답 반환 (사용자는 이미 완료 메시지 받음)

T+150ms [백그라운드] Redis 캐시 무효화 시작
T+155ms posts:list:* 키 전부 삭제 완료

T+150ms [백그라운드] Vercel Revalidation 요청 전송
T+300ms Vercel 응답 수신 (200 OK)
        Vercel이 /blog 페이지 재생성 예약

T+500ms Vercel 백그라운드에서 /blog 페이지 재생성
        - NestJS API 호출 → 최신 포스트 목록 fetch
        - 새 HTML 생성 완료

다음 방문자부터 새 포스트가 포함된 페이지 제공
```

### 시나리오: Vercel Revalidation 실패 시

```
T+150ms Vercel Revalidation 1차 시도 → 실패 (Vercel 일시 장애)
T+1150ms 1초 대기 후 2차 시도 → 실패
T+3150ms 2초 대기 후 3차 시도 → 실패
T+3150ms Logger.error 기록

결과: 글은 DB에 저장됨 ✅
      Redis 캐시는 무효화됨 ✅
      Vercel 페이지는 갱신 안 됨 ❌ (다음 배포 or 수동 재배포까지 구 버전)
```

---

## 7. 주의사항 및 트러블슈팅

### 백엔드 장애 시 Vercel ISR 동작

**오늘(2026-04-24) 실제로 발생한 상황:**

```
PR #46 머지 → 백엔드 502 (약 15분간)
              │
              ▼
Vercel 백그라운드 revalidation 실행
              │
              ▼
백엔드 API 호출 → 502 응답
              │
              ▼
프론트엔드 에러 처리 → 빈 배열 반환
              │
              ▼
Vercel이 빈 배열로 페이지 캐시
              │
              ▼
백엔드 복구 후에도 카드 목록이 비어있는 증상
```

**복구 방법**: Vercel 강제 Redeploy → 빌드 시점에 정상 백엔드에서 데이터 fetch

> **Next.js ISR 원칙**: 백그라운드 revalidation이 실패하면 이전 캐시를 유지해야 하지만,
> 프론트엔드 에러 핸들러가 빈 배열을 props로 반환하면 그 빈 상태가 캐시됩니다.
> 백엔드 장애 시간이 revalidate 주기와 겹치는 경우 발생할 수 있습니다.

---

### 환경변수 미설정 시 동작

```typescript
if (!frontendUrl || !secret) {
  this.logger.warn('Revalidation skipped: FRONTEND_URL or REVALIDATE_SECRET not set');
  return; // 조용히 종료
}
```

환경변수가 없으면 글을 저장해도 Vercel에 신호가 가지 않습니다.
로컬 개발 환경에서는 Vercel이 없으므로 정상적인 동작입니다.
**prod 서버에는 반드시 두 값이 설정되어 있어야 합니다.**

확인 방법:
```bash
# 서버에서 로그 확인 시 아래 메시지가 뜨면 환경변수 미설정
# [RevalidationService] Revalidation skipped: FRONTEND_URL or REVALIDATE_SECRET not set
```

---

## 8. 전체 구조 한눈에 보기

```
┌──────────────────────────────────────────────────────────────┐
│  관리자 액션 (글 생성/수정/삭제)                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  NestJS (Oracle Cloud VM)                                    │
│                                                              │
│  1. DB 저장 (await)         ← 응답 블로킹 O                  │
│  2. Redis 캐시 삭제 (async) ← 응답 블로킹 X (fire-and-forget)│
│  3. Vercel webhook (async)  ← 응답 블로킹 X (fire-and-forget)│
│     └─ 실패 시 최대 3회 재시도 (지수 백오프)                  │
└──────────┬───────────────────────────┬────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────┐         ┌──────────────────────────────────┐
│  Supabase       │         │  Vercel                          │
│  PostgreSQL     │         │                                  │
│                 │         │  /api/revalidate 수신            │
│  원본 데이터    │         │  secret 검증                      │
│  항상 최신      │         │  revalidatePath() 호출           │
└─────────────────┘         │  페이지 백그라운드 재생성          │
                            └──────────────────────────────────┘
                                        │
                                        ▼
                            ┌──────────────────────────────────┐
                            │  사용자 브라우저                  │
                            │  다음 방문부터 최신 페이지 제공    │
                            └──────────────────────────────────┘
```
