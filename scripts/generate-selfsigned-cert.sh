#!/bin/bash
set -e

# ==========================================
# Self-Signed SSL 인증서 생성 스크립트
# Let's Encrypt 발급 전까지 임시 사용
# ==========================================

echo "🔐 Self-Signed SSL 인증서 생성 중..."

# SSL 디렉토리 생성
mkdir -p nginx/ssl

# Self-Signed 인증서 생성 (10년 유효)
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx-selfsigned.key \
  -out nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Portfolio/CN=158.180.75.205"

echo "✅ Self-Signed 인증서 생성 완료!"
echo "📁 위치: nginx/ssl/"
echo "⚠️  브라우저에서 '안전하지 않음' 경고가 나오지만 무시하고 진행 가능"
echo ""
echo "🚀 다음 단계:"
echo "   docker-compose -f docker-compose.dev.yml up -d"
