# 📁 파일 정리 가이드

## ❌ 삭제 권장 파일 (Bull Queue 관련)

```bash
# 다음 세션에서 실행
git rm BULL_QUEUE_GUIDE.md
git rm BULL_QUEUE_SUMMARY.md  
git rm NEXT_SESSION.md
git rm REDIS_CONFIG.md
git rm MIGRATIONS.md  # DATABASE_SETUP.md와 중복

# 커밋
git add -A
git commit -m "chore: Remove unused Bull Queue documentation"
git push origin develop
```

---

## ⚠️ 검토 필요 파일

### 중복 가능성
- `DEPLOYMENT.md` vs `DEPLOYMENT_CHECKLIST.md`
- `DEPLOY_GUIDE.md` vs `DEPLOYMENT_CHECKLIST.md`
- `CLAUDE.md` - 오래된 내용
- `AI_MEMORY.md` - 오래된 메모리
- `SESSION_RESUME.md` - 이전 세션 내용
- `NEXT_TASKS.md` - 오래된 작업 목록

### 권장 조치
**하나로 통합하거나 삭제**

---

## ✅ 유지 필수 파일

### 문서
- `START_HERE.md` ⭐ - **여기서 시작**
- `PROGRESS.md` - 프로젝트 진행 상황
- `DATABASE_SETUP.md` - Supabase 스키마 SQL
- `DEPLOYMENT_CHECKLIST.md` - 배포 체크리스트
- `README.md` - 프로젝트 개요

### 설정
- `.env.example` - 환경변수 템플릿
- `package.json` - 의존성
- `docker-compose.yml` - Docker 설정
- `Dockerfile` - 컨테이너 빌드

---

## 📋 현재 소스 파일 구조

```
src/
├── common/
│   ├── guards/
│   │   └── throttler-behind-proxy.guard.ts  ✅
│   ├── services/
│   │   ├── view-count.service.ts            ✅
│   │   └── index.ts                         ✅
│   ├── utils/
│   │   ├── ip.util.ts                       ✅
│   │   └── index.ts                         ✅
│   └── common.module.ts                     ✅
├── entities/
│   ├── user/                                ✅
│   ├── project/                             ✅
│   ├── post/                                ✅
│   ├── comment/                             ✅
│   └── like/                                ✅
└── modules/
    ├── auth/                                ✅
    ├── projects/                            ✅
    ├── posts/                               ✅
    ├── comments/                            ✅
    └── likes/                               ✅
```

**모두 정상 작동 중 ✅**

---

## 🎯 정리 후 상태

### 삭제 완료 시
```
- Bull Queue 관련 문서 제거
- 중복 배포 가이드 통합
- 오래된 메모 파일 제거
```

### 결과
```
✅ 깔끔한 문서 구조
✅ 혼란 없는 가이드
✅ 명확한 다음 단계
```

---

**선택 사항이므로 급하지 않으면 나중에 정리해도 됩니다.**
