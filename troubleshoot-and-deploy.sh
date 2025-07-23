#!/bin/bash
# troubleshoot-and-deploy.sh

echo "🔧 Cloudflare Container Audio Converter - Troubleshooting & Deployment Script"
echo "=========================================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler is installed: $(wrangler --version)"
fi

# Check authentication
echo ""
echo "📋 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not authenticated. Please run: wrangler login"
    exit 1
else
    echo "✅ Authenticated with Cloudflare"
fi

# Build the container locally first
echo ""
echo "🐳 Building container locally..."
docker build -t audio-converter:latest .

# Test the container locally
echo ""
echo "🧪 Testing container locally..."
docker run -d --name test-audio-converter -p 8080:8080 audio-converter:latest
sleep 5

# Check if container is running
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Container health check passed"
    docker stop test-audio-converter
    docker rm test-audio-converter
else
    echo "❌ Container health check failed"
    echo "Checking container logs:"
    docker logs test-audio-converter
    docker stop test-audio-converter
    docker rm test-audio-converter
    exit 1
fi

# Deploy to Cloudflare
echo ""
echo "🚀 Deploying to Cloudflare..."
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test your endpoint: https://audio-converter-container.<your-subdomain>.workers.dev/health"
echo "2. Send a test conversion request:"
echo '   curl -X POST https://audio-converter-container.<your-subdomain>.workers.dev/convert \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '\''{"audioUrl": "https://example.com/audio.wav", "accessToken": "your-token", "mimeType": "audio/wav"}'\'''