#!/bin/bash
set -e

echo "🚀 Starting deployment..."

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-hsm9411/portfolio-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}"
PREVIOUS_IMAGE="ghcr.io/${GITHUB_REPOSITORY}:previous-${IMAGE_TAG}"

# 롤백 대상 보존: pull 전에 현재 :${IMAGE_TAG} 를 :previous-${IMAGE_TAG} 로 retag.
# pull 후 :${IMAGE_TAG} 는 새 이미지를 가리키지만, :previous-* 태그가 살아있어 dangling
# 정리(`docker image prune -f`) 로 사라지지 않음. 첫 배포 시 로컬에 없으면 skip.
if docker image inspect ${IMAGE_NAME} >/dev/null 2>&1; then
  echo "🔖 Tagging current image as ${PREVIOUS_IMAGE} for rollback..."
  docker tag ${IMAGE_NAME} ${PREVIOUS_IMAGE}
else
  echo "ℹ️  No existing image to tag as previous (first deploy?)"
fi

# Pull latest image
echo "📦 Pulling Docker image (${IMAGE_TAG})..."
docker pull ${IMAGE_NAME}

# docker-compose.yml 의 모든 서비스를 reconcile.
# Compose v2 는 image diff + config diff 를 자동 처리 → 변경된 서비스만 재생성.
# --remove-orphans 는 사용하지 않음: prod 에서 nginx 가 같은 디렉토리/프로젝트명을
# 공유해, orphan 으로 인식되어 삭제될 위험이 있음 (warning 으로만 표시되도록 둠).
echo "🔄 Reconciling services..."
export GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
export IMAGE_TAG=${IMAGE_TAG}
docker compose up -d

# 오래된 이미지 정리
echo "🧹 Cleaning up old images..."
docker image prune -f

# 상태 확인
echo "📋 Container status:"
docker compose ps

echo "✅ Deployment completed!"
