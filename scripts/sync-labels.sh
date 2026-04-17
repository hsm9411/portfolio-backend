#!/usr/bin/env bash
# GitHub 라벨 동기화 스크립트
# 사전 조건: gh CLI 설치 및 gh auth login 완료
# 사용법: bash scripts/sync-labels.sh

set -e

REPO="hsm9411/portfolio-backend"

echo "Syncing labels to $REPO..."

create_or_update_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label list --repo "$REPO" --json name --jq '.[].name' | grep -qx "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null && \
      echo "  updated: $name" || echo "  skipped: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description" && \
      echo "  created: $name"
  fi
}

# ─── Type ───────────────────────────────────────────────
create_or_update_label "bug"          "d73a4a" "예상치 못한 동작 또는 오류"
create_or_update_label "feature"      "0075ca" "새로운 기능 추가"
create_or_update_label "enhancement"  "a2eeef" "기존 기능 개선"
create_or_update_label "refactor"     "e4e669" "기능 변경 없는 코드 개선"
create_or_update_label "docs"         "0075ca" "문서 추가 또는 수정"
create_or_update_label "test"         "bfd4f2" "테스트 코드 추가 또는 수정"
create_or_update_label "chore"        "fef2c0" "의존성, 설정, 빌드 변경"
create_or_update_label "task"         "d4c5f9" "일반 개발 작업 (리팩토링/문서/설정)"

# ─── Priority ────────────────────────────────────────────
create_or_update_label "priority: critical" "b60205" "즉시 처리 필요 - 서비스 불가 상태"
create_or_update_label "priority: high"     "e11d48" "빠른 처리 필요 - 주요 기능 영향"
create_or_update_label "priority: medium"   "f97316" "일반 우선순위"
create_or_update_label "priority: low"      "84cc16" "여유 있을 때 처리"

# ─── Status ──────────────────────────────────────────────
create_or_update_label "needs-triage"  "ededed" "분류 및 우선순위 미정"
create_or_update_label "in progress"   "fbca04" "현재 작업 중"
create_or_update_label "blocked"       "e4e669" "다른 작업 또는 외부 요인으로 대기 중"
create_or_update_label "review needed" "0052cc" "코드 리뷰 요청"
create_or_update_label "wontfix"       "ffffff" "의도적으로 수정하지 않음"
create_or_update_label "duplicate"     "cfd3d7" "중복 이슈 또는 PR"

# ─── Module ──────────────────────────────────────────────
create_or_update_label "module: auth"     "c5def5" "인증/인가 모듈 (JWT, OAuth)"
create_or_update_label "module: projects" "c5def5" "프로젝트 모듈"
create_or_update_label "module: blog"     "c5def5" "블로그 모듈"
create_or_update_label "module: common"   "c5def5" "공통/공유 모듈"

# ─── Infra ───────────────────────────────────────────────
create_or_update_label "infra: ci-cd"   "1d76db" "GitHub Actions CI/CD 파이프라인"
create_or_update_label "infra: docker"  "1d76db" "Docker / 컨테이너 관련"
create_or_update_label "infra: db"      "1d76db" "데이터베이스 / Supabase"

# ─── Environment ─────────────────────────────────────────
create_or_update_label "env: production"  "b60205" "프로덕션 환경 관련"
create_or_update_label "env: development" "0e8a16" "개발 환경 관련"

echo ""
echo "Done! Labels synced to $REPO"
