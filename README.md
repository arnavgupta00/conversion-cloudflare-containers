# Audio Converter Service

A production-ready Cloudflare Container Worker that converts WAV audio files to AMR format using FFmpeg and uploads them to a specified API endpoint.

## Features

- 🎵 **Audio Conversion**: Converts WAV files to AMR (Adaptive Multi-Rate) format using FFmpeg
- 📤 **API Upload**: Uploads converted files to external APIs (e.g., WhatsApp Business API)
- 🏗️ **Container-based**: Runs in Cloudflare Containers with FFmpeg pre-installed
- 🚀 **Production Ready**: Includes error handling, logging, health checks, and graceful shutdown
- 🔒 **Secure**: CORS enabled, input validation, and non-root container execution
- ⚡ **Fast**: Efficient conversion and upload pipeline with temporary file management

## API Specification

### POST /convert

Converts a WAV audio file to AMR format and uploads it to the specified API.

**Request Body:**
```json
{
  "audioUrl": "https://example.com/audio.wav",
  "accessToken": "your_api_access_token",
  "mimeType": "audio/wav"
}
```

**Response (Success):**
```json
{
  "success": true,
  "mediaId": "123456789",
  "message": "Audio converted and uploaded successfully",
  "metadata": {
    "originalSize": "1024000",
    "convertedSize": "256000",
    "processingTime": 1640995200000
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Setup and Deployment

### Prerequisites

- Node.js 18+ 
- npm/pnpm/yarn
- Cloudflare account with Workers and Containers enabled
- Wrangler CLI installed (`npm install -g wrangler`)

### Local Development

1. **Clone and install dependencies:**
```bash
cd /path/to/audio-converter
npm install
```

2. **Configure the API endpoint:**
Edit `container_src/server.js` and update the `uploadUrl` variable with your actual API endpoint:
```javascript
// Replace with your actual API endpoint
const uploadUrl = 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/media';
```

3. **Start development server:**
```bash
npm run dev
```

The service will be available at `http://localhost:8787`

### Production Deployment

1. **Login to Cloudflare:**
```bash
wrangler login
```

2. **Deploy to Cloudflare:**
```bash
npm run deploy
```

3. **Test the deployment:**
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/convert \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/sample.wav",
    "accessToken": "your_token",
    "mimeType": "audio/wav"
  }'
```

## Configuration

### Environment Variables

The container supports the following environment variables:

- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Port for the container (default: 8080)

### Wrangler Configuration

Key settings in `wrangler.jsonc`:

- `max_instances`: Maximum number of container instances (default: 10)
- `sleepAfter`: Container idle timeout (default: 5 minutes)
- `compatibility_date`: Cloudflare Workers compatibility date

### Container Configuration

The Docker container includes:

- Node.js 18 Alpine Linux
- FFmpeg with AMR codec support
- Security hardening (non-root user)
- Health checks
- Graceful shutdown handling

## API Integration

### 360Dialog WhatsApp Business API

The service is configured to work with the 360Dialog WhatsApp Business API:

**API Endpoint**: `https://waba-v2.360dialog.io/media`

**Request Format**:
```bash
curl --location "https://waba-v2.360dialog.io/media" \
--header "D360-API-KEY: YOUR_API_KEY" \
--form "messaging_product=\"whatsapp\"" \
--form "file=@/local/path/file.jpg;type=image/jpeg"
```

**Response Format**:
```json
{
  "id": "1699448688491179"
}
```

The service automatically:
1. Downloads the WAV file from the provided URL
2. Converts it to AMR format using FFmpeg
3. Uploads the AMR file to 360Dialog API
4. Returns the media ID from the response

### Custom API Integration

For other APIs, modify the upload section in `server.js`:

```javascript
// Customize form data and headers based on your API requirements
const formData = new FormData();
formData.append('messaging_product', 'whatsapp');
formData.append('file', amrBuffer, {
  filename: 'audio.amr',
  contentType: 'audio/amr'
});

const uploadResponse = await axios({
  method: 'POST',
  url: 'YOUR_API_ENDPOINT',
  data: formData,
  headers: {
    ...formData.getHeaders(),
    'D360-API-KEY': accessToken, // or 'Authorization': `Bearer ${accessToken}`
    // Add any other required headers
  }
});
```

## Audio Conversion Details

### Supported Input Formats
- WAV (audio/wav, audio/wave)

### Output Format
- AMR Narrowband (audio/amr)
  - Sample Rate: 8 kHz
  - Channels: 1 (mono)
  - Bitrate: 12.2 kbps
  - Codec: AMR-NB

### FFmpeg Configuration

The conversion uses the following FFmpeg parameters:
```javascript
ffmpeg(inputFile)
  .audioCodec('amr_nb')     // AMR Narrowband codec
  .audioChannels(1)         // Mono audio
  .audioFrequency(8000)     // 8 kHz sample rate
  .audioBitrate('12.2k')    // 12.2 kbps bitrate
  .format('amr')            // AMR container format
```

## Error Handling

The service includes comprehensive error handling for:

- **Network errors**: Download failures, API timeouts
- **Validation errors**: Invalid URLs, missing fields, unsupported formats
- **Conversion errors**: FFmpeg failures, codec issues
- **Upload errors**: API authentication, file size limits
- **System errors**: Memory limits, disk space

## Monitoring and Logging

### Health Checks

- Container health check every 30 seconds
- Worker health endpoint at `/health`
- FFmpeg codec availability verification

### Logging

All operations are logged with timestamps:
- Request processing start/end
- Download progress
- Conversion progress
- Upload status
- Error details

### Monitoring Endpoints

- `GET /`: Service information and available endpoints
- `GET /health`: Health status with system metrics

## Performance Considerations

### File Size Limits

- Maximum input file size: Limited by Cloudflare Workers request size (100MB)
- Container memory: Optimized for audio file processing
- Processing timeout: 5 minutes per conversion

### Scaling

- Auto-scaling up to 10 concurrent container instances
- Container sleep after 5 minutes of inactivity
- Load balancing across available containers

## Security

### Input Validation
- URL format validation
- MIME type verification
- Request size limits
- Access token validation

### Container Security
- Non-root user execution
- Minimal Alpine Linux base image
- No unnecessary packages or dependencies
- Temporary file cleanup

### CORS Configuration
```javascript
// Configured for cross-origin requests
origin: '*',
allowMethods: ['GET', 'POST', 'OPTIONS'],
allowHeaders: ['Content-Type', 'Authorization']
```

## Troubleshooting

### Common Issues

1. **FFmpeg not available**
   - Ensure the Docker image includes FFmpeg
   - Check codec availability in logs

2. **Download failures**
   - Verify audio URL is publicly accessible
   - Check network connectivity and timeouts

3. **Upload failures**
   - Verify API endpoint URL is correct
   - Check access token validity
   - Review API documentation for required fields

4. **Conversion errors**
   - Ensure input file is valid WAV format
   - Check FFmpeg logs for codec issues

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and additional logging.

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Cloudflare Container documentation
3. Open an issue in the repository
