#!/bin/bash
set -e

echo "🚀 Starting deployment..."

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-hsm9411/portfolio-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}"

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
