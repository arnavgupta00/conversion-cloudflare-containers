#!/bin/bash

# Audio Converter Service Test Script

set -e

echo "🎵 Audio Converter Service Test Script"
echo "======================================"

# Default values
WORKER_URL="${WORKER_URL:-http://localhost:8787}"
TEST_AUDIO_URL="${TEST_AUDIO_URL:-https://www.soundjay.com/misc/sounds/bell-ringing-05.wav}"
ACCESS_TOKEN="${ACCESS_TOKEN:-your_360dialog_api_key_here}"

echo "Worker URL: $WORKER_URL"
echo "Test Audio URL: $TEST_AUDIO_URL"
echo "Note: Provide your actual 360Dialog API key in ACCESS_TOKEN environment variable"
echo ""

# Test 1: Health Check
echo "🔍 Test 1: Health Check"
echo "----------------------"
curl -s "$WORKER_URL/health" | jq . || echo "Health check failed"
echo ""

# Test 2: Service Info
echo "ℹ️  Test 2: Service Info"
echo "----------------------"
curl -s "$WORKER_URL/" | jq . || echo "Service info failed"
echo ""

# Test 3: Convert Audio (with sample URL)
echo "🎵 Test 3: Audio Conversion"
echo "-------------------------"
echo "Note: This will fail if the API endpoint is not configured"
echo "Testing with sample data..."

curl -X POST "$WORKER_URL/convert" \
  -H "Content-Type: application/json" \
  -d "{
    \"audioUrl\": \"$TEST_AUDIO_URL\",
    \"accessToken\": \"$ACCESS_TOKEN\",
    \"mimeType\": \"audio/wav\"
  }" | jq . || echo "Conversion test failed (expected if API not configured)"

echo ""
echo "✅ Tests completed!"
echo ""
echo "📝 Notes:"
echo "- Update the API endpoint in container_src/server.js before production use"
echo "- Provide a valid access token for real testing"
echo "- Use a publicly accessible WAV file URL for testing"
