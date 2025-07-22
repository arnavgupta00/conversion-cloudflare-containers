# Production Checklist

## ✅ Pre-Deployment

- [ ] **API Key**: Obtain valid 360Dialog API key
- [ ] **Cloudflare Account**: Workers and Containers enabled
- [ ] **Dependencies**: Node.js 18+, npm, wrangler CLI installed
- [ ] **Testing**: Local testing completed with sample WAV file

## ✅ Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Deploy to Production**
   ```bash
   npm run deploy
   ```

4. **Verify Deployment**
   ```bash
   # Check health endpoint
   curl https://your-worker.your-subdomain.workers.dev/health
   ```

## ✅ Post-Deployment

- [ ] **Health Check**: Verify `/health` endpoint returns 200
- [ ] **Service Info**: Check `/` endpoint shows correct service information
- [ ] **Test Conversion**: Upload a test WAV file and verify conversion
- [ ] **Monitor Logs**: Check Cloudflare Workers dashboard for any errors
- [ ] **Performance**: Monitor response times and container scaling

## ✅ Production Settings

### Container Configuration
- **Max Instances**: 10 (adjustable in wrangler.jsonc)
- **Sleep After**: 5 minutes of inactivity
- **Memory**: Optimized for audio processing
- **Timeout**: 60 seconds for uploads

### Security
- **CORS**: Enabled for cross-origin requests
- **Input Validation**: URL format, MIME type checking
- **Error Handling**: Sanitized error messages in production
- **Container Security**: Non-root user execution

### Monitoring
- **Health Checks**: Built-in container health monitoring
- **Logging**: Comprehensive request/response logging
- **Error Tracking**: Detailed error categorization
- **Performance Metrics**: Processing time tracking

## ✅ Usage Examples

### Basic Request
```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/recording.wav",
    "accessToken": "your_360dialog_api_key",
    "mimeType": "audio/wav"
  }'
```

### JavaScript/TypeScript
```javascript
const response = await fetch('https://your-worker.your-subdomain.workers.dev/convert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    audioUrl: 'https://example.com/recording.wav',
    accessToken: 'your_360dialog_api_key',
    mimeType: 'audio/wav'
  })
});

const result = await response.json();
console.log('Media ID:', result.mediaId);
```

## ✅ Maintenance

### Regular Tasks
- Monitor usage and scaling patterns
- Check for FFmpeg security updates
- Review error logs weekly
- Update dependencies monthly

### Scaling Considerations
- Adjust `max_instances` based on usage
- Monitor container startup times
- Consider regional deployment for global users
- Implement rate limiting if needed

## ✅ Troubleshooting

### Common Issues
1. **Container startup failures**: Check Docker logs and FFmpeg installation
2. **API authentication errors**: Verify 360Dialog API key permissions
3. **Conversion failures**: Ensure input files are valid WAV format
4. **Upload timeouts**: Check network connectivity and file sizes
5. **Memory issues**: Monitor container resource usage

### Debug Commands
```bash
# Check container logs
wrangler tail

# Test specific endpoints
curl https://your-worker.your-subdomain.workers.dev/health
curl https://your-worker.your-subdomain.workers.dev/

# Validate deployment
wrangler dev # for local testing
```

## 📞 Support Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Containers Guide](https://developers.cloudflare.com/containers/)
- [360Dialog API Documentation](https://docs.360dialog.com/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
