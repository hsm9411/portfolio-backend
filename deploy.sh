#!/bin/bash
set -e

echo "🚀 Starting deployment..."

GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-hsm9411/portfolio-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}"

# Pull latest image
echo "📦 Pulling Docker image (${IMAGE_TAG})..."
docker pull ${IMAGE_NAME}

# app + redis 재시작 (nginx는 별도 compose 파일로 관리)
echo "🔄 Restarting containers..."
export GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
export IMAGE_TAG=${IMAGE_TAG}
docker compose up -d --force-recreate app

# 오래된 이미지 정리
echo "🧹 Cleaning up old images..."
docker image prune -af

# 상태 확인
echo "📋 Container status:"
docker compose ps

echo "✅ Deployment completed!"
