#!/bin/bash
set -e

echo "🚀 Starting deployment..."

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-hsm9411/portfolio-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}"

# Pull image
echo "📦 Pulling Docker image (${IMAGE_TAG})..."
docker pull ${IMAGE_NAME}

# app 컨테이너만 재시작 (nginx, redis는 건드리지 않음)
echo "🔄 Restarting app container only..."
docker compose stop app || true
docker compose rm -f app || true

export GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
export IMAGE_TAG=${IMAGE_TAG}
docker compose up -d --no-deps app

# 오래된 이미지 정리
echo "🧹 Cleaning up old images..."
docker image prune -af

# 상태 확인
echo "📋 Container status:"
docker compose ps

echo "✅ Deployment completed!"
