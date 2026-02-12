#!/bin/bash
set -e

echo "🔧 Setting up Oracle Cloud server for Portfolio Backend..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Configure firewall
echo "🔥 Configuring firewall..."
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT

# Save iptables rules
sudo mkdir -p /etc/iptables
sudo iptables-save | sudo tee /etc/iptables/rules.v4
echo "✅ Firewall configured"

# Create project directory
echo "📁 Creating project directory..."
mkdir -p ~/portfolio-backend
mkdir -p ~/portfolio-backend-dev

# Create .env template
echo "📝 Creating .env template..."
cat > ~/portfolio-backend/.env.template << 'EOF'
# Database
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=portfolio

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://158.180.75.205:3000/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://158.180.75.205:3000/auth/github/callback

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_TTL=600

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://your-frontend-domain.com

# Frontend
FRONTEND_URL=http://your-frontend-domain.com

# Admin
ADMIN_EMAIL=your_admin_email@example.com
EOF

echo ""
echo "✅ Server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy ~/portfolio-backend/.env.template to ~/portfolio-backend/.env"
echo "2. Edit .env file with actual credentials: nano ~/portfolio-backend/.env"
echo "3. Log in to GitHub Container Registry:"
echo "   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin"
echo "4. Pull and run the application:"
echo "   cd ~/portfolio-backend && docker-compose pull && docker-compose up -d"
echo ""
echo "⚠️  Note: You need to log out and log back in for Docker group changes to take effect!"
