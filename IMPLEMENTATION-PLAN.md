# Restaurant Video Ad Generator - Implementation Plan

**Target**: Working POC within 1 week
**Industry Focus**: Restaurants (optimized for food/dining websites)

---

## Overview

This document outlines the step-by-step implementation of the AI video ad generation pipeline. Each step will be implemented, tested, and validated before moving to the next.

---

## Step 1: Web Scraping (Playwright + Cheerio)

**Goal**: Extract brand assets from restaurant websites

**Files to create**:
- `src/lib/scraper/index.ts` - Main scraper orchestrator
- `src/lib/scraper/extractors.ts` - DOM extraction functions
- `src/lib/scraper/color-extractor.ts` - Brand color extraction
- `src/app/api/scrape/route.ts` - API endpoint

**What it extracts**:
- Logo (og:image, header img, favicon)
- Hero/product images (food photos)
- Brand text (tagline, meta description, h1/h2)
- Brand colors (via node-vibrant)
- Contact info (phone, address, hours)
- Menu items (if available)

**Test**:
```bash
# Start dev server
pnpm dev

# Test with a restaurant website
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.chipotle.com"}'
```

**Expected output**:
```json
{
  "success": true,
  "data": {
    "brand": { "name": "Chipotle", "tagline": "..." },
    "logo": "https://...",
    "images": ["url1", "url2", ...],
    "colors": { "primary": "#...", "secondary": "#..." },
    "contact": { "phone": "...", "address": "..." }
  }
}
```

---

## Step 2: Image Quality Filtering (Sharp.js)

**Goal**: Filter out low-quality images, score remaining ones

**Files to create**:
- `src/lib/image-filter/index.ts` - Main filter logic
- `src/lib/image-filter/blur-detector.ts` - Laplacian blur detection
- `src/lib/image-filter/scorer.ts` - Image quality scoring

**Filtering criteria**:
- Minimum size: 400x300px
- Blur detection (Laplacian variance)
- Aspect ratio validation (0.2 to 5.0)
- URL pattern filtering (exclude icons, favicons, trackers)

**Test**:
```typescript
// Test in a script or API endpoint
import { filterAndScoreImages } from '@/lib/image-filter';

const images = ['url1', 'url2', ...]; // from Step 1
const filtered = await filterAndScoreImages(images);
console.log(filtered); // Sorted by quality score
```

---

## Step 3: Smart Visual Selection (CLIP/BLIP) - ALREADY DONE

**Status**: ✅ Already implemented in `src/lib/visual-selector.ts`

**Features available**:
- `findBestMatchingImages()` - Match images to text
- `classifyImage()` - Classify image categories
- `generateCaption()` - Generate image captions
- `assignImagesToScenes()` - Map images to ad scenes

**Test**:
```typescript
import { findBestMatchingImages } from '@/lib/visual-selector';

const images = ['food1.jpg', 'food2.jpg'];
const results = await findBestMatchingImages(images, 'delicious pizza');
```

---

## Step 4: Script Generation (Groq/LLM)

**Goal**: Generate compelling 10-second ad script for restaurants

**Files to create**:
- `src/lib/script-generator/index.ts` - Main generator
- `src/lib/script-generator/prompts.ts` - Restaurant-specific prompts
- `src/app/api/generate-script/route.ts` - API endpoint

**Output format**:
```json
{
  "fullScript": "Fresh ingredients. Made daily. Taste the difference. Order now.",
  "scenes": [
    { "id": "hook", "voiceoverText": "Fresh ingredients.", "displayText": "FRESH INGREDIENTS", "duration": 2.5 },
    { "id": "value", "voiceoverText": "Made daily.", "displayText": "MADE DAILY", "duration": 2.5 },
    { "id": "benefit", "voiceoverText": "Taste the difference.", "displayText": "TASTE THE DIFFERENCE", "duration": 2.5 },
    { "id": "cta", "voiceoverText": "Order now.", "displayText": "ORDER NOW", "duration": 2.5 }
  ]
}
```

**Test**:
```bash
curl -X POST http://localhost:3000/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Pizza Palace",
    "brandDescription": "Family-owned pizzeria serving authentic Italian pizza",
    "tone": "friendly"
  }'
```

---

## Step 5: Stock Video Fetching (Pexels API)

**Goal**: Fetch relevant stock videos for restaurant backgrounds

**Status**: Partially exists at `/api/pexels-videos`

**Files to create/modify**:
- `src/lib/stock-video/index.ts` - Enhanced video search
- `src/lib/stock-video/restaurant-queries.ts` - Restaurant-specific search mappings

**Restaurant query mappings**:
- Pizza → "pizza making", "italian restaurant", "chef cooking"
- Coffee → "barista", "coffee pour", "cafe atmosphere"
- Sushi → "sushi chef", "japanese restaurant", "fresh fish"
- Generic → "restaurant cooking", "food preparation", "dining"

**Test**:
```bash
curl "http://localhost:3000/api/pexels-videos?query=pizza+cooking&per_page=5"
```

---

## Step 6: Image-to-Video (Kling/Runway API)

**Goal**: Animate food images to create dynamic video clips

**Files to create**:
- `src/lib/image-to-video/index.ts` - API wrapper
- `src/lib/image-to-video/providers/fal.ts` - FAL.ai provider (Kling)
- `src/app/api/animate-image/route.ts` - API endpoint

**Primary provider**: FAL.ai (Kling) - ~$0.02/5s video

**Test**:
```bash
curl -X POST http://localhost:3000/api/animate-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/pizza.jpg",
    "prompt": "subtle steam rising, appetizing food shot"
  }'
```

---

## Step 7: Image Generation (Fallback)

**Goal**: Generate images when scraping yields insufficient visuals

**Files to create**:
- `src/lib/image-generator/index.ts` - Image generation wrapper
- Uses Pollinations.ai (FREE, no API key)

**Test**:
```bash
curl "https://image.pollinations.ai/prompt/delicious%20pepperoni%20pizza%20professional%20food%20photography"
```

---

## Step 8: Voiceover Generation (Edge-TTS)

**Goal**: Generate professional voiceovers for ad scripts

**Files to create**:
- `src/lib/voiceover/index.ts` - Edge-TTS wrapper
- `src/lib/voiceover/voices.ts` - Voice presets
- `src/app/api/generate-voice/route.ts` - API endpoint

**Recommended voices**:
- `en-US-AriaNeural` - Warm female (default)
- `en-US-GuyNeural` - Professional male
- `en-US-JennyNeural` - Friendly female

**Test**:
```bash
curl -X POST http://localhost:3000/api/generate-voice \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Fresh ingredients. Made daily. Order now.",
    "voice": "en-US-AriaNeural"
  }'
# Returns: audio file path
```

---

## Step 9: Background Music (Pixabay Music API)

**Goal**: Fetch royalty-free background music

**Files to create**:
- `src/lib/music/index.ts` - Pixabay music wrapper
- `src/app/api/fetch-music/route.ts` - API endpoint

**Mood mappings**:
- professional → "corporate inspiring"
- playful → "upbeat fun happy"
- urgent → "energetic dramatic"
- friendly → "warm acoustic"

**Test**:
```bash
curl -X POST http://localhost:3000/api/fetch-music \
  -H "Content-Type: application/json" \
  -d '{"mood": "friendly", "duration": 15}'
```

---

## Step 10: Template Assembly (Timeline Builder)

**Goal**: Combine all assets into editor-compatible JSON

**Files to create**:
- `src/lib/timeline-builder/index.ts` - Main assembler
- `src/lib/timeline-builder/templates/restaurant-showcase.ts` - Restaurant template
- `src/lib/timeline-builder/types.ts` - Timeline types

**Output**: JSON compatible with react-video-editor timeline format

**Test**:
```typescript
import { buildTimeline } from '@/lib/timeline-builder';

const timeline = await buildTimeline({
  script: scriptFromStep4,
  images: imagesFromStep2,
  stockVideos: videosFromStep5,
  voiceover: voiceoverFromStep8,
  music: musicFromStep9,
  colors: colorsFromStep1
});
```

---

## Step 11: Editor Integration

**Goal**: Load generated timeline into react-video-editor

**Files to modify**:
- Create generation UI component
- Add "Generate from URL" button in editor
- Load timeline into DesignCombo state

**Test**:
1. Navigate to editor at `http://localhost:3000`
2. Click "Generate from URL"
3. Enter restaurant website URL
4. Wait for pipeline to complete
5. See generated ad in timeline

---

## Main Orchestration Endpoint

**File**: `src/app/api/generate/route.ts`

Combines all steps into single endpoint:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.pizzahut.com",
    "tone": "friendly"
  }'
```

---

## Environment Variables Needed

```env
# .env.local

# Pexels (FREE - already have)
PEXELS_API_KEY=your_key

# Groq (FREE)
GROQ_API_KEY=your_key

# FAL.ai (for Kling image-to-video)
FAL_API_KEY=your_key

# Pixabay (FREE)
PIXABAY_API_KEY=your_key
```

---

## Estimated Timeline

| Day | Steps | Focus |
|-----|-------|-------|
| 1 | Step 1-2 | Scraping + Image Filtering |
| 2 | Step 4-5 | Script Generation + Stock Video |
| 3 | Step 8-9 | Voiceover + Music |
| 4 | Step 6-7 | Image-to-Video + Fallbacks |
| 5 | Step 10 | Timeline Builder |
| 6 | Step 11 | Editor Integration |
| 7 | Testing | End-to-end testing, bug fixes |

---

## Success Criteria

1. ✅ Enter any restaurant URL
2. ✅ System scrapes brand assets automatically
3. ✅ Generates 10-second ad script
4. ✅ Fetches relevant stock video backgrounds
5. ✅ Animates key food image
6. ✅ Generates professional voiceover
7. ✅ Adds background music
8. ✅ Loads in editor for customization
9. ✅ Can export final video

---

*Let's start with Step 1!*
