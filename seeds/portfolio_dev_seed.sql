-- ============================================================
-- BACK-35: Dev 환경 더미 데이터 시드
-- 대상 스키마: portfolio_dev
-- 재실행 가능: TRUNCATE → INSERT 순서로 작성됨
-- ============================================================

-- 순서 의존성 때문에 역순 TRUNCATE
TRUNCATE TABLE portfolio_dev.likes        RESTART IDENTITY CASCADE;
TRUNCATE TABLE portfolio_dev.comments     RESTART IDENTITY CASCADE;
TRUNCATE TABLE portfolio_dev.project_updates RESTART IDENTITY CASCADE;
TRUNCATE TABLE portfolio_dev.posts        RESTART IDENTITY CASCADE;
TRUNCATE TABLE portfolio_dev.projects     RESTART IDENTITY CASCADE;
TRUNCATE TABLE portfolio_dev.users        RESTART IDENTITY CASCADE;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO portfolio_dev.users
  (id, email, nickname, avatar_url, bio, github_url, website_url, is_admin, provider, created_at, updated_at)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'admin@example.com',
    '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    '풀스택 개발자입니다. NestJS, Next.js, PostgreSQL을 주로 사용합니다. 클린 코드와 테스트 가능한 아키텍처에 관심이 많습니다.',
    'https://github.com/hsm9411',
    'https://hsm9411-dev.duckdns.org',
    true, 'github', now() - interval '200 days', now()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'devuser@example.com',
    '김개발',
    'https://avatars.githubusercontent.com/u/1024025?v=4',
    '프론트엔드 개발자. React와 TypeScript를 좋아합니다.',
    'https://github.com/kimdev',
    null,
    false, 'github', now() - interval '90 days', now()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'reviewer@example.com',
    '이리뷰',
    null,
    null,
    null,
    null,
    false, 'google', now() - interval '30 days', now()
  );

-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO portfolio_dev.projects
  (id, title, summary, description, thumbnail_url, demo_url, github_url,
   tech_stack, tags, status, featured, view_count, like_count, comment_count,
   start_date, end_date, author_id, author_nickname, author_avatar_url,
   image_urls, created_at, updated_at)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    '포트폴리오 웹사이트',
    'NestJS + Next.js로 구축한 풀스택 포트폴리오 사이트. Supabase OAuth, Redis 캐싱, CI/CD 자동 배포 포함.',
    E'## 소개\n\nNestJS 백엔드와 Next.js 프론트엔드로 구성된 개인 포트폴리오 사이트입니다.\n\n## 주요 기능\n- Supabase OAuth 로그인 (GitHub, Google)\n- 프로젝트/블로그 CRUD 및 관리\n- Redis 캐싱 (60초) 및 조회수 Write-back\n- ISR 재검증 웹훅\n- Prometheus + Winston 로깅\n- GitHub Actions CI/CD → Oracle Cloud 자동 배포\n\n## 아키텍처\n- **백엔드**: NestJS, TypeORM, PostgreSQL(Supabase), Redis\n- **프론트엔드**: Next.js 14, Tailwind CSS, shadcn/ui\n- **인프라**: Oracle Cloud VM, Docker Compose, Nginx, Let''s Encrypt',
    'https://picsum.photos/seed/portfolio-proj/800/450',
    'https://hsm9411.duckdns.org',
    'https://github.com/hsm9411/portfolio-backend',
    ARRAY['NestJS', 'Next.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker'],
    ARRAY['풀스택', '포트폴리오', 'OAuth', 'CI/CD'],
    'completed', true, 245, 18, 3,
    '2024-01-01', '2024-06-01',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY['https://picsum.photos/seed/pf1/800/450', 'https://picsum.photos/seed/pf2/800/450'],
    now() - interval '60 days', now()
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'E-Commerce 플랫폼',
    'React + Node.js로 구현한 쇼핑몰. Stripe 결제 연동 및 재고 관리 시스템 포함.',
    E'## 소개\n\n실제 서비스 수준의 기능을 갖춘 E-Commerce 플랫폼입니다.\n\n## 주요 기능\n- 상품 등록/수정/삭제 (이미지 업로드)\n- 장바구니 및 주문 관리\n- Stripe 결제 연동 (웹훅 포함)\n- 재고 관리 및 알림\n- 관리자 대시보드\n\n## 기술 스택\n- **프론트엔드**: React, Redux Toolkit, React Query\n- **백엔드**: Node.js, Express, Prisma\n- **DB**: PostgreSQL\n- **결제**: Stripe',
    'https://picsum.photos/seed/ecommerce-proj/800/450',
    'https://demo.example.com/shop',
    'https://github.com/hsm9411/ecommerce',
    ARRAY['React', 'Node.js', 'Express', 'PostgreSQL', 'Stripe', 'Prisma'],
    ARRAY['E-Commerce', '풀스택', '결제', '관리자'],
    'completed', true, 187, 14, 2,
    '2023-06-01', '2023-12-01',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY['https://picsum.photos/seed/ec1/800/450', 'https://picsum.photos/seed/ec2/800/450', 'https://picsum.photos/seed/ec3/800/450'],
    now() - interval '120 days', now()
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'AI 채팅 어플리케이션',
    'OpenAI GPT-4o를 활용한 NestJS 기반 AI 채팅 서비스. 스트리밍 응답 및 대화 컨텍스트 유지.',
    E'## 소개\n\nOpenAI GPT-4o를 활용한 AI 채팅 서비스입니다. 현재 개발 중입니다.\n\n## 구현된 기능\n- Server-Sent Events 스트리밍 응답\n- Redis 기반 대화 컨텍스트 유지\n- 사용자별 대화 이력 저장\n- 토큰 사용량 트래킹\n\n## 예정 기능\n- 파일 첨부 (PDF, 이미지)\n- 커스텀 시스템 프롬프트\n- 모델 선택 (GPT-4o / GPT-4o-mini)',
    'https://picsum.photos/seed/aichat-proj/800/450',
    null,
    'https://github.com/hsm9411/ai-chat',
    ARRAY['NestJS', 'TypeScript', 'OpenAI', 'Redis', 'Server-Sent Events'],
    ARRAY['AI', 'OpenAI', '채팅', '스트리밍'],
    'in-progress', false, 76, 11, 1,
    '2024-08-01', null,
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY['https://picsum.photos/seed/ai1/800/450'],
    now() - interval '30 days', now()
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    '날씨 모바일 앱',
    'React Native + Expo로 개발한 iOS/Android 크로스플랫폼 날씨 앱. 위치 기반 실시간 날씨 및 7일 예보.',
    E'## 소개\n\nReact Native와 Expo를 사용해 iOS/Android 모두 지원하는 날씨 앱입니다.\n\n## 주요 기능\n- 현재 위치 기반 날씨 조회\n- 7일 예보 및 시간별 날씨\n- 도시 검색 및 즐겨찾기\n- 강수 확률 그래프\n- 홈 화면 위젯 (iOS)\n\n## 기술 스택\n- React Native, Expo\n- OpenWeatherMap API\n- AsyncStorage (로컬 캐싱)\n- Expo Location',
    'https://picsum.photos/seed/weather-proj/800/450',
    null,
    'https://github.com/hsm9411/weather-app',
    ARRAY['React Native', 'TypeScript', 'Expo', 'OpenWeatherMap API'],
    ARRAY['모바일', 'React Native', '날씨', 'iOS', 'Android'],
    'completed', false, 112, 9, 0,
    '2023-03-01', '2023-05-01',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY[]::text[],
    now() - interval '180 days', now()
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    '개인 블로그 엔진',
    'Express + MongoDB로 만든 초기 블로그 시스템. 마크다운 에디터 및 RSS 피드 지원.',
    E'## 소개\n\n백엔드를 처음 공부하며 만든 블로그 시스템입니다. 현재는 아카이브 상태입니다.\n\n## 주요 기능\n- 마크다운 에디터 (marked.js)\n- 태그 분류 및 검색\n- RSS 피드 생성\n- EJS 서버사이드 렌더링\n\n## 배운 점\n이 프로젝트를 통해 HTTP, RESTful API, MVC 패턴의 기초를 익혔습니다.',
    'https://picsum.photos/seed/blog-proj/800/450',
    null,
    'https://github.com/hsm9411/blog-engine',
    ARRAY['Node.js', 'Express', 'MongoDB', 'EJS', 'marked.js'],
    ARRAY['블로그', 'Node.js', 'MongoDB', '아카이브'],
    'archived', false, 45, 4, 0,
    '2022-01-01', '2022-06-01',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY[]::text[],
    now() - interval '300 days', now()
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    '실시간 데이터 대시보드',
    'FastAPI + React로 구성한 실시간 데이터 시각화 대시보드. WebSocket 기반 차트 업데이트.',
    E'## 소개\n\nPython FastAPI 백엔드와 React 프론트엔드로 구성한 데이터 시각화 대시보드입니다.\n\n## 주요 기능\n- WebSocket 실시간 차트 업데이트\n- CSV/Excel 데이터 업로드 및 자동 파싱\n- Recharts 기반 다양한 차트 (line, bar, pie, area)\n- 날짜 범위 필터 및 다운샘플링\n- 데이터 export (CSV, PNG)\n\n## 기술 스택\n- **백엔드**: Python 3.11, FastAPI, SQLAlchemy, WebSocket\n- **프론트엔드**: React, Recharts, React Table\n- **DB**: PostgreSQL\n- **배포**: Railway',
    'https://picsum.photos/seed/dashboard-proj/800/450',
    'https://demo.example.com/dashboard',
    'https://github.com/hsm9411/data-dashboard',
    ARRAY['Python', 'FastAPI', 'React', 'PostgreSQL', 'Recharts', 'WebSocket'],
    ARRAY['데이터', 'Python', '시각화', '대시보드', '실시간'],
    'completed', true, 134, 13, 2,
    '2024-03-01', '2024-07-01',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY['https://picsum.photos/seed/db1/800/450', 'https://picsum.photos/seed/db2/800/450'],
    now() - interval '90 days', now()
  );

-- ============================================================
-- PROJECT UPDATES (Changelog)
-- ============================================================
INSERT INTO portfolio_dev.project_updates
  (id, project_id, update_type, title, content, external_url, created_at)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'MANUAL', 'Supabase MCP 연동 완료',
    'Claude Code에서 Supabase MCP를 통해 DB를 직접 조회·수정할 수 있게 됐습니다. execute_sql, list_tables, get_advisors 등 18개 도구 사용 가능.',
    null,
    now() - interval '1 day'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'MANUAL', 'Refresh Token 구현 (Redis rotation)',
    'Access Token 15분 / Refresh Token 7일 구조로 전환. Redis에 저장하고 rotation 방식으로 보안 강화.',
    'https://github.com/hsm9411/portfolio-backend/pull/38',
    now() - interval '14 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'MANUAL', 'ProjectUpdates Changelog 모듈 추가',
    '프로젝트별 변경 이력을 기록하는 Changelog 기능을 추가했습니다. MANUAL / GITHUB_PR 두 가지 타입 지원.',
    'https://github.com/hsm9411/portfolio-backend/pull/39',
    now() - interval '20 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'MANUAL', 'Stripe 결제 웹훅 안정화',
    '결제 완료 이벤트 중복 처리 버그 수정. 멱등성 키(idempotency key) 도입으로 중복 결제 방지.',
    null,
    now() - interval '45 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    'MANUAL', 'SSE 스트리밍 응답 구현',
    'OpenAI 응답을 Server-Sent Events로 실시간 스트리밍. 첫 글자 응답 시간 200ms 이하 달성.',
    null,
    now() - interval '10 days'
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000006',
    'MANUAL', 'WebSocket 실시간 차트 업데이트 추가',
    '기존 폴링 방식에서 WebSocket으로 전환. 업데이트 지연 시간 3초 → 100ms로 단축.',
    null,
    now() - interval '50 days'
  );

-- ============================================================
-- POSTS
-- ============================================================
INSERT INTO portfolio_dev.posts
  (id, title, summary, content, thumbnail_url, category, tags,
   is_published, view_count, like_count, comment_count, reading_time,
   author_id, author_nickname, author_avatar_url,
   image_urls, created_at, updated_at, published_at)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'NestJS로 REST API 구축하기 — 실전 가이드',
    'NestJS의 핵심 개념인 모듈, 컨트롤러, 서비스, 가드를 실전 예제로 설명합니다. TypeORM 연동 및 JWT 인증까지 포함.',
    E'# NestJS로 REST API 구축하기\n\nNestJS는 Node.js 기반의 프레임워크로, Angular에서 영감을 받은 모듈형 아키텍처를 제공합니다.\n\n## 1. 프로젝트 초기 세팅\n\n```bash\nnpm i -g @nestjs/cli\nnest new my-api\n```\n\n## 2. 모듈 구조\n\nNestJS의 핵심은 **모듈**입니다. 각 기능 단위로 모듈을 분리합니다.\n\n```typescript\n@Module({\n  imports: [TypeOrmModule.forFeature([User])],\n  controllers: [UsersController],\n  providers: [UsersService],\n  exports: [UsersService],\n})\nexport class UsersModule {}\n```\n\n## 3. 컨트롤러와 서비스\n\n컨트롤러는 라우팅을, 서비스는 비즈니스 로직을 담당합니다.\n\n```typescript\n@Controller(''users'')\nexport class UsersController {\n  constructor(private readonly usersService: UsersService) {}\n\n  @Get()\n  findAll() {\n    return this.usersService.findAll();\n  }\n}\n```\n\n## 4. JWT 인증 가드\n\n```typescript\n@Injectable()\nexport class JwtAuthGuard extends AuthGuard(''jwt'') {}\n```\n\n## 마무리\n\nNestJS는 구조가 명확해서 팀 프로젝트에 특히 적합합니다. 다음 편에서는 TypeORM 마이그레이션을 다룹니다.',
    'https://picsum.photos/seed/nestjs-post/1200/630',
    'tutorial',
    ARRAY['NestJS', 'TypeScript', 'REST API', 'JWT', '백엔드'],
    true, 312, 24, 4, 8,
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY['https://picsum.photos/seed/nest1/800/450'],
    now() - interval '45 days', now(), now() - interval '45 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'PostgreSQL 인덱스 완벽 가이드 — 언제, 어떻게 쓸까',
    'B-Tree, GIN, GiST 등 PostgreSQL 인덱스 종류와 사용 시나리오를 실제 쿼리 플랜과 함께 설명합니다.',
    E'# PostgreSQL 인덱스 완벽 가이드\n\n인덱스는 데이터베이스 성능의 핵심입니다. 하지만 잘못 사용하면 오히려 성능을 해칩니다.\n\n## 인덱스의 기본 원리\n\nPostgreSQL은 기본적으로 **B-Tree** 인덱스를 사용합니다.\n\n```sql\nCREATE INDEX idx_users_email ON users(email);\n```\n\n## EXPLAIN ANALYZE로 확인하기\n\n```sql\nEXPLAIN ANALYZE SELECT * FROM posts WHERE is_published = true ORDER BY created_at DESC;\n```\n\n## GIN 인덱스 — 배열과 전문 검색\n\n배열 컬럼이나 `tsvector`에 유리합니다.\n\n```sql\nCREATE INDEX idx_posts_tags ON posts USING GIN(tags);\n```\n\n## 인덱스를 만들지 말아야 할 때\n\n- 카디널리티가 낮은 컬럼 (예: `is_published` — true/false만 존재)\n- 쓰기가 읽기보다 훨씬 많은 테이블\n- 소규모 테이블 (풀 스캔이 더 빠를 수 있음)\n\n## 미사용 인덱스 찾기\n\n```sql\nSELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;\n```',
    'https://picsum.photos/seed/postgres-post/1200/630',
    'tutorial',
    ARRAY['PostgreSQL', '인덱스', 'DB 최적화', 'SQL'],
    true, 198, 19, 2, 10,
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY[]::text[],
    now() - interval '30 days', now(), now() - interval '30 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'Redis 캐싱 전략 — 포트폴리오에 적용한 방법',
    'Cache-Aside, Write-back 패턴을 실제 포트폴리오 백엔드에 적용한 경험을 공유합니다.',
    E'# Redis 캐싱 전략\n\n포트폴리오 백엔드에 Redis를 도입하면서 배운 내용을 공유합니다.\n\n## 왜 Redis인가\n\n매 요청마다 DB에서 프로젝트 목록을 조회하는 건 비효율적입니다. Redis로 60초간 캐싱하면 DB 부하를 크게 줄일 수 있습니다.\n\n## Cache-Aside 패턴\n\n```typescript\nasync findAll(dto: GetProjectsDto) {\n  const cached = await this.redis.get(cacheKey);\n  if (cached) return JSON.parse(cached);\n\n  const result = await this.repo.findAndCount(query);\n  await this.redis.setex(cacheKey, 60, JSON.stringify(result));\n  return result;\n}\n```\n\n## Write-back으로 조회수 처리\n\n조회수는 요청마다 DB에 쓰면 너무 많은 쓰기가 발생합니다. Redis에 누적했다가 30분마다 DB에 반영합니다.\n\n```typescript\n@Cron(CronExpression.EVERY_30_MINUTES)\nasync flushViewCounts() {\n  const keys = await this.redis.keys(''view:count:*'');\n  // ... DB 일괄 업데이트\n}\n```\n\n## 주의사항\n\n- 캐시 무효화 타이밍을 신중하게 설계해야 합니다\n- Redis 메모리는 유한하므로 TTL을 항상 설정하세요',
    'https://picsum.photos/seed/redis-post/1200/630',
    'essay',
    ARRAY['Redis', '캐싱', 'NestJS', '백엔드', '성능'],
    true, 156, 16, 3, 7,
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY[]::text[],
    now() - interval '20 days', now(), now() - interval '20 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'TypeScript 제네릭 실전 패턴 5가지',
    '실무에서 자주 쓰이는 TypeScript 제네릭 패턴을 예제 코드와 함께 정리했습니다.',
    E'# TypeScript 제네릭 실전 패턴 5가지\n\n제네릭은 타입스크립트의 강력한 기능이지만, 처음에는 어렵게 느껴집니다.\n\n## 1. Repository 패턴\n\n```typescript\ninterface Repository<T> {\n  findById(id: string): Promise<T | null>;\n  save(entity: T): Promise<T>;\n  delete(id: string): Promise<void>;\n}\n```\n\n## 2. API 응답 래퍼\n\n```typescript\ninterface ApiResponse<T> {\n  data: T;\n  meta: { total: number; page: number };\n  timestamp: string;\n}\n```\n\n## 3. 조건부 타입\n\n```typescript\ntype NonNullable<T> = T extends null | undefined ? never : T;\n```\n\n## 4. keyof + 제네릭\n\n```typescript\nfunction pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {\n  return keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>);\n}\n```\n\n## 5. Mapped Types\n\n```typescript\ntype Optional<T> = { [K in keyof T]?: T[K] };\ntype ReadOnly<T> = { readonly [K in keyof T]: T[K] };\n```',
    'https://picsum.photos/seed/typescript-post/1200/630',
    'tutorial',
    ARRAY['TypeScript', '제네릭', '타입시스템', '프론트엔드'],
    true, 287, 21, 2, 6,
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY[]::text[],
    now() - interval '10 days', now(), now() - interval '10 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    '2024년 개발자 회고 — 배운 것들과 내년 계획',
    '2024년 한 해를 돌아보며 성장한 부분과 아쉬웠던 점, 2025년 목표를 정리합니다.',
    E'# 2024년 개발자 회고\n\n벌써 2024년이 마무리되고 있습니다. 올해를 돌아보며 생각을 정리해봅니다.\n\n## 잘 된 것들\n\n### 풀스택 전환\n2023년까지 프론트엔드 위주였는데, 올해 NestJS를 깊이 파고들며 백엔드에 자신감이 생겼습니다.\n\n### 인프라 경험\nDocker, Nginx, CI/CD를 직접 구축하며 DevOps에 대한 감각을 키웠습니다.\n\n## 아쉬운 것들\n\n테스트 코드를 초반부터 작성하지 않은 게 늘 아쉽습니다. 나중에 추가하는 게 훨씬 어렵더군요.\n\n## 2025년 계획\n\n- Kubernetes 입문\n- 오픈소스 기여 1건 이상\n- 알고리즘 꾸준히',
    'https://picsum.photos/seed/retrospect-post/1200/630',
    'essay',
    ARRAY['회고', '2024', '성장', '계획'],
    false, 0, 0, 0, 5,
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    ARRAY[]::text[],
    now() - interval '5 days', now(), null
  );

-- ============================================================
-- COMMENTS
-- ============================================================
INSERT INTO portfolio_dev.comments
  (id, target_type, target_id, parent_id, content,
   author_id, author_nickname, author_avatar_url, author_email, author_ip,
   is_anonymous, is_deleted, created_at, updated_at)
VALUES
  -- 포트폴리오 프로젝트 댓글
  (
    'e0000000-0000-0000-0000-000000000001',
    'project', 'b0000000-0000-0000-0000-000000000001', null,
    '완성도가 높네요! Redis 캐싱 구조가 특히 인상적입니다. Write-back 패턴 적용하신 이유가 있나요?',
    'a0000000-0000-0000-0000-000000000002', '김개발',
    'https://avatars.githubusercontent.com/u/1024025?v=4',
    'devuser@example.com', null, false, false,
    now() - interval '10 days', now()
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'project', 'b0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    '조회수는 요청마다 DB에 쓰면 부하가 너무 크거든요. 30분마다 일괄 반영하는 게 훨씬 효율적이었습니다!',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    'admin@example.com', null, false, false,
    now() - interval '9 days', now()
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'project', 'b0000000-0000-0000-0000-000000000001', null,
    'Oracle Cloud 무료 티어 사용하신 거 맞죠? VM 스펙이 낮은데 어떻게 최적화하셨는지 궁금합니다.',
    'a0000000-0000-0000-0000-000000000003', '이리뷰',
    null, 'reviewer@example.com', null, false, false,
    now() - interval '7 days', now()
  ),
  -- E-Commerce 댓글
  (
    'e0000000-0000-0000-0000-000000000004',
    'project', 'b0000000-0000-0000-0000-000000000002', null,
    'Stripe 웹훅 구현이 까다로웠을 것 같은데, 멱등성 처리는 어떻게 하셨나요?',
    'a0000000-0000-0000-0000-000000000002', '김개발',
    'https://avatars.githubusercontent.com/u/1024025?v=4',
    'devuser@example.com', null, false, false,
    now() - interval '30 days', now()
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'project', 'b0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000004',
    'Stripe 이벤트 ID를 DB에 저장해서 중복 처리를 방지했습니다. 자세한 내용은 Changelog에 추가했어요!',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    'admin@example.com', null, false, false,
    now() - interval '29 days', now()
  ),
  -- 데이터 대시보드 댓글
  (
    'e0000000-0000-0000-0000-000000000006',
    'project', 'b0000000-0000-0000-0000-000000000006', null,
    'Python FastAPI 선택 이유가 있나요? Django REST Framework와 비교해서요.',
    'a0000000-0000-0000-0000-000000000002', '김개발',
    'https://avatars.githubusercontent.com/u/1024025?v=4',
    'devuser@example.com', null, false, false,
    now() - interval '20 days', now()
  ),
  (
    'e0000000-0000-0000-0000-000000000007',
    'project', 'b0000000-0000-0000-0000-000000000006',
    'e0000000-0000-0000-0000-000000000006',
    'FastAPI가 비동기 처리와 타입 힌트 기반 자동 문서화가 훨씬 편리했습니다. Pydantic이랑 궁합도 좋고요.',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    'admin@example.com', null, false, false,
    now() - interval '19 days', now()
  ),
  -- NestJS 포스트 댓글
  (
    'e0000000-0000-0000-0000-000000000008',
    'post', 'd0000000-0000-0000-0000-000000000001', null,
    '정말 잘 정리된 글이네요! NestJS 처음 공부할 때 이런 글이 있었으면 좋았을 텐데. 다음 편 기대됩니다!',
    'a0000000-0000-0000-0000-000000000002', '김개발',
    'https://avatars.githubusercontent.com/u/1024025?v=4',
    'devuser@example.com', null, false, false,
    now() - interval '40 days', now()
  ),
  (
    'e0000000-0000-0000-0000-000000000009',
    'post', 'd0000000-0000-0000-0000-000000000001', null,
    'TypeORM 마이그레이션 편도 꼭 써주세요! 저도 NestJS 입문 중인데 마이그레이션 부분이 항상 헷갈려요.',
    'a0000000-0000-0000-0000-000000000003', '이리뷰',
    null, 'reviewer@example.com', null, false, false,
    now() - interval '38 days', now()
  ),
  (
    'e0000000-0000-0000-0000-000000000010',
    'post', 'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000009',
    '다음 편 주제로 등록해뒀습니다! 곧 올릴게요 :)',
    'a0000000-0000-0000-0000-000000000001', '한성민',
    'https://avatars.githubusercontent.com/u/583231?v=4',
    'admin@example.com', null, false, false,
    now() - interval '37 days', now()
  ),
  -- Redis 포스트 댓글
  (
    'e0000000-0000-0000-0000-000000000011',
    'post', 'd0000000-0000-0000-0000-000000000003', null,
    'Cache stampede 문제는 어떻게 해결하셨나요? 여러 요청이 동시에 캐시 miss가 나면 DB에 부하가 몰리지 않나요?',
    'a0000000-0000-0000-0000-000000000002', '김개발',
    'https://avatars.githubusercontent.com/u/1024025?v=4',
    'devuser@example.com', null, false, false,
    now() - interval '15 days', now()
  ),
  -- 익명 댓글
  (
    'e0000000-0000-0000-0000-000000000012',
    'post', 'd0000000-0000-0000-0000-000000000002', null,
    '인덱스 관련해서 궁금한 게 있는데, partial index는 어떤 상황에서 쓰는 건가요?',
    null, '익명',
    null, null, '192.168.1.100', true, false,
    now() - interval '25 days', now()
  );

-- ============================================================
-- LIKES
-- ============================================================
INSERT INTO portfolio_dev.likes
  (id, target_type, target_id, user_id, ip_address, created_at)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'project', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', null, now() - interval '9 days'),
  ('f0000000-0000-0000-0000-000000000002', 'project', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', null, now() - interval '7 days'),
  ('f0000000-0000-0000-0000-000000000003', 'project', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', null, now() - interval '28 days'),
  ('f0000000-0000-0000-0000-000000000004', 'project', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', null, now() - interval '5 days'),
  ('f0000000-0000-0000-0000-000000000005', 'project', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', null, now() - interval '18 days'),
  ('f0000000-0000-0000-0000-000000000006', 'post', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', null, now() - interval '40 days'),
  ('f0000000-0000-0000-0000-000000000007', 'post', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', null, now() - interval '38 days'),
  ('f0000000-0000-0000-0000-000000000008', 'post', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', null, now() - interval '28 days'),
  ('f0000000-0000-0000-0000-000000000009', 'post', 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', null, now() - interval '18 days'),
  ('f0000000-0000-0000-0000-000000000010', 'post', 'd0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', null, now() - interval '8 days');
