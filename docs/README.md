# Portfolio Backend - 문서 인덱스

> 프로젝트 문서 모음 📚

---

## 🚀 시작하기

처음이신가요? 이 순서대로 읽어보세요:

1. **[빠른 시작 가이드](QUICK_START.md)** ⚡
   - 자주 쓰는 명령어
   - 로컬 개발, 배포, 서버 관리
   - 5분 안에 시작 가능

2. **[환경 설정 가이드](ENVIRONMENT_SETUP.md)** 🔧
   - .env 파일 설정 방법
   - docker-compose.yml 포트 매핑
   - 환경 변수 검증 체크리스트

3. **[프로젝트 아키텍처](PROJECT_ARCHITECTURE.md)** 🏗️
   - 전체 시스템 구조
   - 기술 스택 선택 이유
   - CI/CD 파이프라인
   - 주요 개념 설명

---

## 📊 현재 상태

### ✅ 완료된 작업
- [x] NestJS 프로젝트 초기 설정
- [x] TypeORM + Supabase 연동
- [x] Redis 캐싱 설정
- [x] Entity 정의 (6개 테이블)
- [x] Auth 모듈 구현 (JWT + OAuth)
- [x] Docker 컨테이너화
- [x] GitHub Actions CI/CD
- [x] Development 환경 배포 ✨

### 🔜 다음 작업
- [ ] Projects 모듈 구현 (우선순위 1)
- [ ] Posts 모듈 구현
- [ ] Comments 모듈 구현
- [ ] OAuth 로그인 활성화
- [ ] Production 환경 첫 배포

---

## 📚 문서 목록

### 개발 가이드
| 문서 | 설명 | 대상 |
|------|------|------|
| [QUICK_START.md](QUICK_START.md) | 빠른 시작 및 자주 쓰는 명령어 | 모든 개발자 |
| [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) | 환경 설정 상세 가이드 | 초기 설정 시 |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | 전체 아키텍처 및 기술 문서 | 구조 이해 필요 시 |
| [SESSION_SUMMARY.md](SESSION_SUMMARY.md) | 최근 세션 작업 요약 | 작업 이력 확인 |

### 템플릿
| 파일 | 설명 | 용도 |
|------|------|------|
| `development.env.template` | Dev 환경 .env 템플릿 | Dev 서버 설정 |
| `production.env.template` | Prod 환경 .env 템플릿 | Prod 서버 설정 |

### 프로젝트 루트
| 파일 | 설명 |
|------|------|
| `../CLAUDE.md` | Claude Code 작업 가이드 |
| `../schema.sql` | 데이터베이스 스키마 |
| `../.env.example` | 환경 변수 템플릿 |
| `../AI_MEMORY.md` | AI 작업 히스토리 |

---

## 🔗 주요 링크

### 환경
| 환경 | URL | Swagger |
|------|-----|---------|
| Dev | http://158.180.75.205:3001 | http://158.180.75.205:3001/api |
| Prod | http://158.180.75.205:3000 | http://158.180.75.205:3000/api |

### 서비스
| 서비스 | URL |
|--------|-----|
| GitHub Repo | https://github.com/hsm9411/portfolio-backend |
| GitHub Actions | https://github.com/hsm9411/portfolio-backend/actions |
| GHCR Packages | https://github.com/hsm9411/portfolio-backend/pkgs/container/portfolio-backend |
| Supabase Dashboard | https://supabase.com/dashboard |

---

## 💡 빠른 참조

### SSH 접속
```bash
ssh -i /c/Users/hasun/Desktop/portfolio/ssh-key-2026-02-07.key ubuntu@158.180.75.205
```

### 로그 확인
```bash
# Dev
docker logs portfolio-backend-dev -f

# Prod
docker logs portfolio-backend -f
```

### 재시작
```bash
# Dev
cd ~/portfolio-backend-dev && docker-compose restart

# Prod
cd ~/portfolio-backend && docker-compose restart
```

### 배포
```bash
# Dev 자동 배포
git push origin develop

# Prod 자동 배포
git push origin main
```

---

## 🎯 다음 단계

### 1. Projects 모듈 구현 시작
```
src/modules/projects/
├── projects.controller.ts
├── projects.service.ts
├── projects.module.ts
└── dto/
```

### 2. API 엔드포인트 설계
- `POST /projects` - 프로젝트 생성
- `GET /projects` - 목록 조회 (페이지네이션)
- `GET /projects/:id` - 상세 조회
- `PATCH /projects/:id` - 수정
- `DELETE /projects/:id` - 삭제
- `POST /projects/:id/like` - 좋아요 토글
- `POST /projects/:id/view` - 조회수 증가

---

## 📞 도움이 필요하신가요?

### 문제 해결
1. 먼저 [QUICK_START.md](QUICK_START.md)의 "문제 해결" 섹션 확인
2. [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)의 "트러블슈팅" 확인
3. GitHub Issues에 질문 남기기

### 문서 개선
문서에 오류나 개선점이 있다면 PR을 보내주세요!

---

## 📝 업데이트 히스토리

| 날짜 | 버전 | 변경 사항 |
|------|------|----------|
| 2026-02-09 | 1.0 | 초기 문서 작성, Dev 환경 배포 완료 |

---

**작성자**: Claude Sonnet 4.5 + hsm9411
**마지막 업데이트**: 2026-02-09
**문서 상태**: ✅ 완료
