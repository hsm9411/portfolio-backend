#!/bin/bash
set -e

# ==========================================
# Let's Encrypt SSL 인증서 발급 스크립트
# 실제 도메인이 있을 때 사용
# ==========================================

DOMAIN=${1:-"api.yourdomain.com"}
EMAIL=${2:-"your-email@example.com"}

echo "🔐 Let's Encrypt SSL 인증서 발급 시작..."
echo "📧 도메인: $DOMAIN"
echo "📧 이메일: $EMAIL"
echo ""

# 디렉토리 생성
mkdir -p certbot/conf
mkdir -p certbot/www

# Certbot으로 인증서 발급
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL 인증서 발급 완료!"
    echo "📁 위치: certbot/conf/live/$DOMAIN/"
    echo ""
    echo "🔄 Nginx 설정 업데이트 필요:"
    echo "   1. nginx/nginx.conf에서 server_name을 $DOMAIN으로 변경"
    echo "   2. SSL 인증서 경로 확인"
    echo "   3. docker-compose restart nginx"
else
    echo ""
    echo "❌ 인증서 발급 실패"
    echo "💡 확인 사항:"
    echo "   - 도메인이 이 서버 IP(158.180.75.205)를 가리키는지 확인"
    echo "   - 포트 80이 열려있는지 확인"
    echo "   - 방화벽 설정 확인"
fi
