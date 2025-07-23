const express = require('express');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const FormData = require('form-data');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

console.log('=== Audio Converter Container Starting ===');
console.log('Current working directory:', process.cwd());
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT
});

const app = express();
const PORT = process.env.PORT || 8080;

// Configure express
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Audio Converter Container',
    status: 'healthy',
    ffmpegVersion: ffmpeg.version || 'unknown'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Main conversion endpoint
app.post('/convert', async (req, res) => {
  let tempInputFile = null;
  let tempOutputFile = null;

  try {
    const { audioUrl, accessToken, mimeType } = req.body;

    console.log(`Starting conversion for: ${audioUrl}`);

    // Validate inputs
    if (!audioUrl || !accessToken || !mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: audioUrl, accessToken, and mimeType'
      });
    }

    // Step 1: Download the audio file
    console.log('Step 1: Downloading audio file...');
    const audioResponse = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'stream',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'AudioConverter/1.0.0'
      }
    });

    // Create temporary files
    tempInputFile = tmp.fileSync({ postfix: '.wav' });
    tempOutputFile = tmp.fileSync({ postfix: '.amr' });

    // Save downloaded file
    const writer = fs.createWriteStream(tempInputFile.name);
    audioResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('Step 2: Converting WAV to AMR...');

    // Step 2: Convert WAV to AMR using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputFile.name)
        .audioCodec('amr_nb') // AMR Narrowband codec
        .audioChannels(1) // AMR is mono only
        .audioFrequency(8000) // AMR sample rate
        .audioBitrate('12.2k') // AMR bitrate
        .format('amr')
        .output(tempOutputFile.name)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Conversion progress: ${progress.percent || 0}%`);
        })
        .on('end', () => {
          console.log('Conversion completed successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    // Step 3: Read the converted AMR file
    console.log('Step 3: Reading converted file...');
    const amrBuffer = fs.readFileSync(tempOutputFile.name);
    
    console.log(`Step 4: Uploading AMR file (${amrBuffer.length} bytes)...`);

    // Step 4: Upload to the 360Dialog API
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', amrBuffer, {
      filename: 'audio.amr',
      contentType: 'audio/amr'
    });

    // 360Dialog API endpoint
    const uploadUrl = 'https://waba-v2.360dialog.io/media';
    
    const uploadResponse = await axios({
      method: 'POST',
      url: uploadUrl,
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'D360-API-KEY': accessToken,
      },
      timeout: 60000, // 60 second timeout for upload
    });

    console.log('Upload response:', uploadResponse.data);

    // Extract mediaId from response
    const mediaId = uploadResponse.data.id;

    if (!mediaId) {
      throw new Error('No media ID returned from upload API');
    }

    console.log(`Conversion completed successfully. Media ID: ${mediaId}`);

    // Clean up temp files
    if (tempInputFile) tempInputFile.removeCallback();
    if (tempOutputFile) tempOutputFile.removeCallback();

    // Return success response
    res.json({
      success: true,
      mediaId: mediaId,
      message: 'Audio converted and uploaded successfully',
      metadata: {
        originalSize: audioResponse.headers['content-length'],
        convertedSize: amrBuffer.length,
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Conversion error:', error);

    // Clean up temp files on error
    try {
      if (tempInputFile) tempInputFile.removeCallback();
      if (tempOutputFile) tempOutputFile.removeCallback();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    // Handle specific error types
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Failed to download audio file - URL not accessible';
      statusCode = 400;
    } else if (error.response) {
      // API error
      errorMessage = `Upload API error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`;
      statusCode = error.response.status >= 500 ? 500 : 400;
    } else if (error.message.includes('FFmpeg')) {
      errorMessage = `Audio conversion failed: ${error.message}`;
      statusCode = 422;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Audio Converter Container listening on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Server binding to: 0.0.0.0:' + PORT);
  console.log('Process ID:', process.pid);
  console.log('Platform:', process.platform);
  console.log('Node version:', process.version);
  
  // Immediate health check
  setTimeout(() => {
    console.log('Server is running and ready to accept connections');
  }, 100);
  
  // Test FFmpeg availability
  ffmpeg.getAvailableCodecs((err, codecs) => {
    if (err) {
      console.error('FFmpeg not available:', err);
    } else {
      console.log('FFmpeg is available with codecs:', Object.keys(codecs).length);
      if (codecs.amr_nb) {
        console.log('✓ AMR Narrowband codec is available');
      } else {
        console.warn('⚠ AMR Narrowband codec not found');
      }
    }
  });
});

// Handle server startup errors
server.on('error', (err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
