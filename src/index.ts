// worker.js
import { Container } from "@cloudflare/containers";
import { Context } from "hono";

// Define the container class that extends Container
export class AudioConverterContainer extends Container {
  // CRITICAL: Set the default port that matches what your server.js listens on
  defaultPort = 8080;

  // Set container sleep timeout (5 minutes)
  sleepAfter = "5m";

  // Enable internet access for downloading audio files
  enableInternet = true;

  // Set environment variables
  envVars = {
    NODE_ENV: "production",
    PORT: "8080", // Ensure the PORT env var is set
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // Get or create a container instance
      // Using idFromName with a fixed identifier for single instance
      const id = env.AUDIO_CONVERTER_CONTAINER.idFromName("converter-instance");
      const stub = env.AUDIO_CONVERTER_CONTAINER.get(id);

      // Forward the request to the container
      const response = await stub.fetch(request);

      // Clone response to add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      newResponse.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
      );
      newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

      return newResponse;
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Worker error: ${error}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
} satisfies ExportedHandler<Env>;
