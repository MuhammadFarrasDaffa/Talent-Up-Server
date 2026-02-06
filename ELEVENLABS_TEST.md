# ElevenLabs Voice Response Test

Test file untuk memverifikasi fitur response dengan suara menggunakan ElevenLabs.

## Quick Test

1. **Start the server:**

```bash
cd Talent-Up-Server
npm run dev
```

2. **Start the client:**

```bash
cd Talent-Up-Client/my-app
npm run dev
```

3. **Test Flow:**
   - Login ke aplikasi
   - Mulai interview session
   - Jawab beberapa pertanyaan
   - Lihat apakah HRD response diputar dengan suara

## Expected Behavior

### Server Side (InterviewController.js)

- ✅ ElevenLabs client initialized with API key
- ✅ `generateVoiceForResponse()` function added
- ✅ Audio generation replacing simulation mode
- ✅ Response returns `audioBase64` instead of empty string
- ✅ Flag `audioEnabled: true` in response

### Client Side (interview/room/page.tsx)

- ✅ `base64ToBlob()` function converts audio data
- ✅ `playAudio()` function plays audio in browser
- ✅ Audio auto-plays after HRD response
- ✅ UI shows audio playing indicator

## Debug Logs to Monitor

### Server Console:

```
[ELEVENLABS ACTIVE] Characters: 45, Actual cost: $0.000099 (AUDIO GENERATED)
[AI COST TRACKING] responseToAnswer (MEMORY BUFFERED) - User: xxx, ElevenLabs: $0.000099 (ACTUAL)
```

### Client Console:

```
Audio playing: true
Audio ended: true
```

### Network Tab (DevTools):

- POST `/interviews/response` should return `audioBase64` with actual base64 data
- Response should have `audioEnabled: true`

## Troubleshooting

### No Audio Generated

1. Check ELEVENLABS_API_KEY in server .env
2. Check console for "[ELEVENLABS ERROR]" messages
3. Verify internet connection for ElevenLabs API

### Audio Generation Failed (Fallback)

```
[ELEVENLABS FALLBACK] Characters: 45, Simulated cost: $0.000099 (AUDIO FAILED)
```

- Server will still work but without audio
- Cost tracking continues normally

### Client Audio Not Playing

1. Check browser audio permissions
2. Verify `hasUserInteracted` state is true
3. Check browser console for audio playback errors

## Cost Monitoring

Production cost tracking is active:

- **Characters**: Based on response text length
- **Cost**: $0.00022 per character
- **Example**: 100 character response = $0.022

Monitor costs in TokenUsageLog collection in MongoDB.

## Manual Test Script

```javascript
// Test ElevenLabs function directly (in server console)
const {
  generateVoiceForResponse,
} = require("./controllers/InterviewController.js");

async function testVoice() {
  try {
    const result = await generateVoiceForResponse(
      "Hello, this is a test response from HRD.",
      true,
    );
    console.log("Audio generated successfully:", result.costMetrics);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testVoice();
```

---

**Status**: ✅ Voice response with ElevenLabs is now ACTIVE
**Updated**: February 6, 2026
