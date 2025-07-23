// container_src/server.js
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
app.use(express.json());

// CRITICAL: Use PORT from environment or default to 8080
const PORT = process.env.PORT || 8080;

// Ensure temp directory exists
const TEMP_DIR = path.join(os.tmpdir(), 'audio-converter');

async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

// Health check endpoint - IMPORTANT for container startup
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Audio Converter Container',
    version: '1.0.0',
    endpoints: {
      '/': 'Service information',
      '/health': 'Health check',
      '/convert': 'Convert WAV to MP3 and upload (POST)'
    }
  });
});

// Main conversion endpoint
app.post('/convert', async (req, res) => {
  let tempFiles = [];
  
  try {
    const { audioUrl, accessToken, mimeType } = req.body;
    
    // Validate input
    if (!audioUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: audioUrl and accessToken'
      });
    }
    
    console.log(`Processing audio conversion for: ${audioUrl}`);
    
    // Ensure temp directory exists
    await ensureTempDir();
    
    // Generate unique filenames
    const timestamp = Date.now();
    const wavPath = path.join(TEMP_DIR, `input_${timestamp}.wav`);
    const mp3Path = path.join(TEMP_DIR, `output_${timestamp}.mp3`);
    tempFiles = [wavPath, mp3Path];
    
    // Download the WAV file
    console.log('Downloading audio file...');
    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });
    
    await fs.writeFile(wavPath, response.data);
    console.log('Audio file downloaded successfully');
    
    // Convert to MP3
    console.log('Converting to MP3 format...');
    await new Promise((resolve, reject) => {
      ffmpeg(wavPath)
        .audioCodec('libmp3lame')
        .audioChannels(1)
        .audioFrequency(8000)
        .audioBitrate('32k')
        .format('mp3')
        .on('end', () => {
          console.log('Conversion completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .save(mp3Path);
    });
    
    // Read the converted file
    const mp3Buffer = await fs.readFile(mp3Path);
    console.log(`Converted file size: ${mp3Buffer.length} bytes`);
    
    // Upload to API (example: 360Dialog WhatsApp API)
    console.log('Uploading to API...');
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', mp3Buffer, {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg'
    });
    
    // Update this URL to your actual API endpoint
    const uploadUrl = 'https://waba-v2.360dialog.io/media';
    
    const uploadResponse = await axios({
      method: 'POST',
      url: uploadUrl,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'D360-API-KEY': accessToken
      },
      timeout: 30000
    });
    
    console.log('Upload successful:', uploadResponse.data);
    
    // Clean up temp files
    await Promise.all(tempFiles.map(file => 
      fs.unlink(file).catch(err => console.error(`Error deleting ${file}:`, err))
    ));
    
    // Return success response
    res.json({
      success: true,
      mediaId: uploadResponse.data.id,
      message: 'Audio converted and uploaded successfully',
      metadata: {
        originalSize: response.data.length,
        convertedSize: mp3Buffer.length,
        processingTime: Date.now()
      }
    });
    
  } catch (error) {
    console.error('Error in /convert:', error);
    
    // Clean up temp files on error
    await Promise.all(tempFiles.map(file => 
      fs.unlink(file).catch(() => {})
    ));
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// CRITICAL: Start server and ensure it's listening properly
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log('Container is ready to accept requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});