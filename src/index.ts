import { Container, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";
import { cors } from "hono/cors";

export class AudioConverterContainer extends Container {
  // Port the container listens on (default: 8080)
  defaultPort = 8080;
  // Time before container sleeps due to inactivity (default: 5 minutes for processing time)
  sleepAfter = "5m";
  // Environment variables passed to the container
  envVars = {
    NODE_ENV: "production",
  };

  // Optional lifecycle hooks
  override onStart() {
    console.log("Audio Converter Container successfully started");
  }

  override onStop() {
    console.log("Audio Converter Container successfully shut down");
  }

  override onError(error: unknown) {
    console.error("Audio Converter Container error:", error);
  }
}

// Define request/response types
interface ConvertAudioRequest {
  audioUrl: string;
  accessToken: string;
  mimeType: string;
}

interface ConvertAudioResponse {
  success: boolean;
  mediaId?: string;
  error?: string;
  message?: string;
}

// Create Hono app with proper typing for Cloudflare Workers
const app = new Hono<{
  Bindings: { 
    AUDIO_CONVERTER_CONTAINER: DurableObjectNamespace<AudioConverterContainer>;
  };
}>();

// Enable CORS for all routes
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    service: "Audio Converter Service",
    status: "healthy",
    endpoints: {
      "POST /convert": "Convert WAV audio to AMR and upload to API",
      "GET /health": "Health check endpoint"
    },
    version: "1.0.0"
  });
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString() 
  });
});

// Main audio conversion endpoint
app.post("/convert", async (c) => {
  try {
    // Validate request body
    const body = await c.req.json<ConvertAudioRequest>();
    
    if (!body.audioUrl || !body.accessToken || !body.mimeType) {
      return c.json<ConvertAudioResponse>({
        success: false,
        error: "Missing required fields: audioUrl, accessToken, and mimeType are required"
      }, 400);
    }

    // Validate audio URL format
    try {
      new URL(body.audioUrl);
    } catch {
      return c.json<ConvertAudioResponse>({
        success: false,
        error: "Invalid audioUrl format"
      }, 400);
    }

    // Validate MIME type
    if (!body.mimeType.includes('audio/wav') && !body.mimeType.includes('audio/wave')) {
      return c.json<ConvertAudioResponse>({
        success: false,
        error: "Only WAV audio files are supported"
      }, 400);
    }

    console.log(`Processing conversion request for: ${body.audioUrl}`);

    // Get container instance for processing
    const containerId = `converter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const container = getContainer(c.env.AUDIO_CONVERTER_CONTAINER, containerId);
    
    console.log(`Using container ID: ${containerId}`);

    // Forward request to container for processing with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const containerResponse = await container.fetch(new Request('http://localhost:8080/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }));

      clearTimeout(timeoutId);

      if (!containerResponse.ok) {
        const errorText = await containerResponse.text();
        console.error('Container processing failed:', errorText);
        
        return c.json<ConvertAudioResponse>({
          success: false,
          error: `Container processing failed: ${containerResponse.status} - ${errorText}`
        }, 500);
      }

      const result = await containerResponse.json<ConvertAudioResponse>();
      console.log('Container processing completed successfully');
      
      return c.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Container fetch error:', fetchError);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return c.json<ConvertAudioResponse>({
          success: false,
          error: "Request timeout - audio conversion took too long"
        }, 504);
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Audio conversion error:', error);
    return c.json<ConvertAudioResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
});

// Error handling for unknown routes
app.notFound((c) => {
  return c.json({
    error: "Not Found",
    message: "The requested endpoint does not exist"
  }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json({
    error: "Internal Server Error",
    message: err.message
  }, 500);
});

export default app;
