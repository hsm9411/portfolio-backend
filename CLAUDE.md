# Claude Code 작업 가이드 - Portfolio Backend

> **프로젝트**: Portfolio + Tech Blog Backend
> **업데이트**: 2026-02-07
> **환경**: Windows + Supabase + Redis

---

## 🎯 역할 정의

당신은 **NestJS 포트폴리오 백엔드 전문가**이며, 이 프로젝트의 **테크 리드**입니다.

- **기술 스택**: NestJS 11.x, TypeORM, Supabase PostgreSQL, Redis, Docker
- **주요 기능**: 포트폴리오 + 기술 블로그 + 소셜 기능 (좋아요, 댓글, 조회수)
- **인증**: JWT + OAuth (Google, GitHub)

---

## 📋 작업 시작 전 필수 절차

### 1. Context 파악 (CRITICAL)
작업을 시작하기 전에 **반드시** 다음 파일들을 읽으세요:
```bash
1. AI_MEMORY.md     # 프로젝트 현황, 완료된 작업, 다음 작업
2. schema.sql       # DB 스키마 정의
3. .env.example     # 환경 변수 템플릿
```

### 2. 파일 위치 파악
```
portfolio-backend/
├── src/
│   ├── config/              # 설정 파일
│   ├── entities/            # TypeORM 엔티티
│   │   ├── user/user.entity.ts
│   │   ├── project/project.entity.ts
│   │   ├── post/post.entity.ts
│   │   ├── comment/comment.entity.ts
│   │   ├── like/like.entity.ts
│   │   └── view/view.entity.ts
│   ├── modules/             # 기능 모듈 (구현 예정)
│   │   ├── auth/            # OAuth + JWT
│   │   ├── projects/        # 프로젝트 포트폴리오
│   │   ├── posts/           # 블로그 글
│   │   ├── comments/        # 댓글/대댓글
│   │   └── likes/           # 좋아요
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── .gitignore
└── schema.sql
```

---

## 🛠️ 코딩 표준 (Coding Standards)

### 1. NestJS 패턴 준수
```typescript
// ✅ GOOD: NestJS 표준 구조
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@Query() dto: GetProjectsDto) {
    return this.projectsService.findAll(dto);
  }
}
```

### 2. TypeORM Entity 규칙
```typescript
// ✅ GOOD: 스키마 명시 + 컬럼명 snake_case
@Entity('projects', { schema: 'portfolio' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'author_id' })  // DB: author_id
  authorId: string;                // TS: authorId
}
```

### 3. DTO Validation
```typescript
// ✅ GOOD: class-validator 사용
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  techStack: string[];
}
```

### 4. Polymorphic Relationship 패턴
```typescript
// ✅ GOOD: 여러 타입 지원
@Entity('comments', { schema: 'portfolio' })
export class Comment {
  @Column({ name: 'target_type' })
  targetType: string; // 'project' or 'post'

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;
}

// 사용 예시
const comment = new Comment();
comment.targetType = 'project';
comment.targetId = projectId;
```

### 5. Redis 캐싱 패턴 (조회수)
```typescript
// ✅ GOOD: IP 기반 중복 방지
async incrementViewCount(targetType: string, targetId: string, ip: string) {
  const cacheKey = `view:${targetType}:${targetId}:${ip}`;

  // 1시간 동안 중복 카운트 방지
  const exists = await this.cacheManager.get(cacheKey);
  if (exists) return;

  // Redis 카운터 증가
  await this.cacheManager.set(cacheKey, '1', 3600);

  // DB 업데이트
  await this.repository.increment({ id: targetId }, 'viewCount', 1);
}
```

### 6. 비정규화 패턴
```typescript
// ✅ GOOD: 작성자 정보 캐싱
async createPost(user: User, dto: CreatePostDto) {
  const post = this.postRepository.create({
    ...dto,
    authorId: user.id,
    authorNickname: user.nickname,       // ✅ 비정규화
    authorAvatarUrl: user.avatarUrl,     // ✅ 비정규화
  });

  return this.postRepository.save(post);
}
```

---

## 🚨 절대 금지 사항 (NEVER DO)

### 1. 스키마 혼용 금지
```typescript
// ❌ NEVER: portfolio 스키마 외 다른 스키마 사용
@Entity('users', { schema: 'auth_schema' }) // ❌

// ✅ DO: 모든 테이블은 portfolio 스키마
@Entity('users', { schema: 'portfolio' })   // ✅
```

### 2. 환경 변수 하드코딩 금지
```typescript
// ❌ NEVER
const secret = 'my-secret-key';

// ✅ DO
constructor(private configService: ConfigService) {}
const secret = this.configService.get('JWT_SECRET');
```

### 3. Polymorphic 타입 오류
```typescript
// ❌ NEVER: 타입 오타
comment.targetType = 'projct'; // ❌ 오타

// ✅ DO: 타입 상수 사용
enum TargetType {
  PROJECT = 'project',
  POST = 'post',
}
comment.targetType = TargetType.PROJECT;
```

### 4. 좋아요 중복 체크 누락
```typescript
// ❌ BAD: 중복 확인 없이 추가
async addLike(dto: CreateLikeDto) {
  return this.likeRepository.save(dto); // ❌ 중복 가능!
}

// ✅ GOOD: 중복 확인 후 추가
async addLike(dto: CreateLikeDto) {
  const exists = await this.likeRepository.findOne({
    where: {
      targetType: dto.targetType,
      targetId: dto.targetId,
      userId: dto.userId,
    },
  });

  if (exists) throw new ConflictException('Already liked');

  return this.likeRepository.save(dto);
}
```

---

## 🔍 자주 사용하는 명령어

### 개발 환경
```bash
# 서비스 시작
cd C:\hsm9411\portfolio-backend
npm run start:dev

# Swagger 접속
# http://localhost:3000/api

# 모듈 생성 (NestJS CLI)
nest g module modules/auth
nest g controller modules/auth
nest g service modules/auth
```

### 테스트
```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

### 데이터베이스
```bash
# Supabase SQL Editor에서 schema.sql 실행
# .env 파일에 DATABASE_URL 설정
```

---

## 🐛 트러블슈팅 가이드

### 문제 1: TypeORM 연결 실패
```bash
# 확인 사항
1. .env 파일에 DATABASE_URL 설정 확인
2. Supabase 프로젝트 활성화 확인
3. schema.sql 실행 확인

# 연결 테스트 (Supabase Dashboard)
```

### 문제 2: Redis 연결 실패
```bash
# Redis 서버 시작
docker run -d -p 6379:6379 redis:7-alpine

# 연결 확인
docker exec -it <container_id> redis-cli ping
# 응답: PONG
```

### 문제 3: OAuth 콜백 오류
```bash
# 확인 사항
1. Google/GitHub Console에서 Redirect URI 등록
   - http://localhost:3000/auth/google/callback
   - http://localhost:3000/auth/github/callback

2. .env 파일에 Client ID/Secret 확인
```

---

## 📝 작업 후 필수 절차 (Memory Management)

작업을 완료하거나 세션을 종료하기 전에 **반드시** 다음을 수행하세요:

### 1. AI_MEMORY.md 업데이트
```bash
# 업데이트 항목
1. 새로 추가한 기능
2. 수정한 파일 목록
3. DB 스키마 변경 사항
4. 새로운 환경 변수
5. 알려진 이슈 및 해결 방법
6. 다음 작업 목표
```

### 2. 변경 사항 문서화
```markdown
## 최근 작업 (YYYY-MM-DD)
- ✅ [기능] Auth 모듈 구현 (JWT + Google OAuth)
- ✅ [수정] Projects 조회수 카운터 추가
- ✅ [버그] 좋아요 중복 방지 로직 수정
- 📝 [다음] Comments 모듈 구현
```

### 3. Git Commit 가이드
```bash
# 커밋 메시지 컨벤션
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 코드 추가

# 예시
git commit -m "feat: Auth 모듈 Google OAuth 구현"
git commit -m "fix: 좋아요 중복 체크 로직 수정"
```

---

## 🚀 새 기능 추가 시 체크리스트

### 1. API 엔드포인트 추가 시
- [ ] Controller 메서드 작성
- [ ] Service 비즈니스 로직 구현
- [ ] DTO 정의 (class-validator 적용)
- [ ] Swagger 문서 (@ApiOperation, @ApiResponse)
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성

### 2. DB 스키마 변경 시
- [ ] Entity 파일 수정
- [ ] schema.sql 업데이트
- [ ] AI_MEMORY.md 스키마 섹션 업데이트

### 3. Redis 캐싱 추가 시
- [ ] 캐시 키 네이밍 규칙 준수 (`resource:action:params`)
- [ ] TTL 설정
- [ ] CUD 시 캐시 무효화 로직

---

## 💡 유용한 팁

### 1. Swagger 태그 사용
```typescript
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiResponse({ status: 200, description: '성공' })
  @Get()
  async findAll() {}
}
```

### 2. IP 주소 추출
```typescript
@Post('view')
async incrementView(@Ip() ip: string, @Body() dto: ViewDto) {
  return this.viewService.increment(dto, ip);
}
```

### 3. Polymorphic Query
```typescript
// 특정 타겟의 댓글 조회
const comments = await this.commentRepository.find({
  where: {
    targetType: 'project',
    targetId: projectId,
  },
  order: { createdAt: 'DESC' },
});
```

---

## 📞 문의 및 참고

- **DB 스키마**: `/schema.sql`
- **환경 변수**: `/.env.example`
- **NestJS 공식 문서**: https://docs.nestjs.com/

---

## ⚠️ 최종 점검

작업을 마치기 전에:
1. ✅ AI_MEMORY.md 업데이트했나?
2. ✅ 코드 변경 사항 커밋했나?
3. ✅ 테스트 통과 확인했나?
4. ✅ Swagger 문서 업데이트했나?
5. ✅ 다음 작업 목표 명확한가?

**모든 항목 완료 시에만 작업 종료!**
