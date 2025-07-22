# Quick Deployment Guide

## 🚀 Quick Start

### 1. Prerequisites
- Cloudflare account with Workers enabled
- 360Dialog API key
- Node.js 18+ and npm

### 2. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 3. Login to Cloudflare
```bash
wrangler login
```

### 4. Deploy
```bash
cd /path/to/audio-converter
npm install
npm run deploy
```

### 5. Test
```bash
# Replace YOUR_WORKER_URL and YOUR_API_KEY
curl -X POST "https://your-worker.your-subdomain.workers.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/sample.wav",
    "accessToken": "YOUR_360DIALOG_API_KEY",
    "mimeType": "audio/wav"
  }'
```

## 📝 Expected Response

### Success
```json
{
  "success": true,
  "mediaId": "1699448688491179",
  "message": "Audio converted and uploaded successfully",
  "metadata": {
    "originalSize": "1024000",
    "convertedSize": "256000",
    "processingTime": 1640995200000
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error description"
}
```

## 🔧 Configuration

The service is pre-configured for 360Dialog WhatsApp Business API:
- **API Endpoint**: `https://waba-v2.360dialog.io/media`
- **Authentication**: `D360-API-KEY` header
- **Format**: Form data with `messaging_product=whatsapp`

## 📊 Monitoring

- Health check: `GET /health`
- Service info: `GET /`
- Logs available in Cloudflare Workers dashboard

## 🛠️ Troubleshooting

1. **Deployment fails**: Check Wrangler configuration and login status
2. **Container won't start**: Verify Docker build and FFmpeg installation
3. **API upload fails**: Confirm 360Dialog API key and permissions
4. **Audio conversion fails**: Ensure input is valid WAV format

## 📞 Support

For issues:
1. Check service logs in Cloudflare dashboard
2. Verify API key permissions
3. Test with a simple WAV file first
