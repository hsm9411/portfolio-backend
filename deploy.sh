#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Variables
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-hsm9411/portfolio-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"  # 환경 변수로 태그 지정, 기본값 latest
IMAGE_NAME="ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}"

# Pull image
echo "📦 Pulling Docker image (${IMAGE_TAG})..."
docker pull ${IMAGE_NAME}

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker-compose down || true

# Start new containers
echo "▶️  Starting new containers..."
export GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
export IMAGE_TAG=${IMAGE_TAG}
docker-compose up -d

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -af

# Show logs
echo "📋 Container logs:"
docker-compose logs --tail=50

echo "✅ Deployment completed!"
echo "🌐 Application: http://localhost:3000"
echo "📊 Metrics: http://localhost:3000/metrics"
