# Restaurant Video Ad Generator - Implementation Plan

**Target**: Working POC
**Industry Focus**: Restaurants (optimized for food/dining websites)

---

## Overview

This document outlines the step-by-step implementation of the AI video ad generation pipeline.

**Key Principle**: The ad must feel dynamic and alive - NOT a slideshow with zoom/pan effects. Image-to-video animation is essential for a professional ad feel.

---

## Step 1: Web Scraping (Playwright)

**Goal**: Extract brand assets from restaurant websites

**Files**:
- `src/lib/scraper/index.ts` - Main scraper orchestrator
- `src/lib/scraper/extractors.ts` - DOM extraction functions
- `src/lib/scraper/color-extractor.ts` - Brand color extraction from CSS/theme
- `src/lib/scraper/types.ts` - TypeScript interfaces
- `src/app/api/scrape/route.ts` - API endpoint

**What it extracts**:
- Logo (og:image, header img, favicon)
- Hero/product images (categorized as hero/product/background)
- Brand text (name, tagline, meta description)
- Brand colors (from CSS variables, header, buttons - NOT from food images)
- Contact info (phone, address, hours)
- Cuisine type detection
- Social links

**Test**:
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.joespizza.com"}'
```

---

## Step 2: Script Generation (Groq/LLM)

**Goal**: Generate compelling 10-second ad script for restaurants

**Files**:
- `src/lib/script-generator/index.ts` - Main generator
- `src/lib/script-generator/prompts.ts` - Restaurant-specific prompts
- `src/app/api/generate-script/route.ts` - API endpoint

**Input** (from Step 1):
```typescript
{
  brandName: "Joe's Pizza",
  tagline: "New York Style Pizza",
  description: "Family-owned pizzeria serving authentic NY pizza since 1975",
  cuisine: "italian"
}
```

**Output format**:
```json
{
  "fullScript": "Fresh ingredients. Made daily. Taste the difference. Order now.",
  "scenes": [
    { "id": "hook", "voiceoverText": "Fresh ingredients.", "displayText": "FRESH INGREDIENTS", "duration": 2.5 },
    { "id": "value", "voiceoverText": "Made daily.", "displayText": "MADE DAILY", "duration": 2.5 },
    { "id": "benefit", "voiceoverText": "Taste the difference.", "displayText": "TASTE THE DIFFERENCE", "duration": 2.5 },
    { "id": "cta", "voiceoverText": "Order now.", "displayText": "ORDER NOW", "duration": 2.5 }
  ],
  "tone": "friendly",
  "totalDuration": 10
}
```

**Test**:
```bash
curl -X POST http://localhost:3000/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Pizza Palace",
    "tagline": "Authentic Italian",
    "description": "Family-owned pizzeria serving authentic Italian pizza",
    "cuisine": "italian",
    "tone": "friendly"
  }'
```

---

## Step 3: Smart Image Selection (CLIP)

**Goal**: Match scraped images to script scenes semantically

**Files**:
- `src/lib/visual-selector.ts` - CLIP integration (already implemented)

**Key function**:
```typescript
import { assignImagesToScenes } from '@/lib/visual-selector';

const assignments = await assignImagesToScenes(
  images.map(img => img.url),
  scenes.map(s => ({ id: s.id, text: s.voiceoverText }))
);
// Returns: { hook: "pizza.jpg", value: "chef.jpg", benefit: "interior.jpg", cta: "logo.jpg" }
```

---

## Step 4: Stock Video Fetching (Pexels API)

**Goal**: Fetch relevant stock videos for restaurant backgrounds

**Files**:
- `src/lib/stock-video/index.ts` - Enhanced video search
- `src/lib/stock-video/restaurant-queries.ts` - Cuisine-specific search mappings

**Restaurant query mappings**:
```typescript
{
  italian: ["pizza making", "italian restaurant", "pasta cooking"],
  mexican: ["taco preparation", "mexican food", "salsa making"],
  japanese: ["sushi chef", "japanese restaurant", "ramen cooking"],
  american: ["burger grilling", "american diner", "fries cooking"],
  cafe: ["barista", "coffee pour", "cafe atmosphere"],
  bakery: ["bakery kitchen", "pastry chef", "fresh baking"],
  default: ["restaurant cooking", "food preparation", "chef kitchen"]
}
```

**Test**:
```bash
curl "http://localhost:3000/api/pexels-videos?query=pizza+cooking&per_page=5"
```

---

## Step 5: Voiceover Generation (Edge-TTS)

**Goal**: Generate professional voiceovers for ad scripts

**Files**:
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
```

---

## Step 6: Background Music (Pixabay Music API)

**Goal**: Fetch royalty-free background music

**Files**:
- `src/lib/music/index.ts` - Pixabay music wrapper
- `src/app/api/fetch-music/route.ts` - API endpoint

**Mood mappings**:
```typescript
{
  professional: "corporate inspiring upbeat",
  playful: "fun happy cheerful",
  urgent: "energetic dramatic fast",
  friendly: "warm acoustic gentle"
}
```

**Test**:
```bash
curl -X POST http://localhost:3000/api/fetch-music \
  -H "Content-Type: application/json" \
  -d '{"mood": "friendly", "duration": 15}'
```

---

## Step 7: Image-to-Video Animation (Kling via FAL.ai)

**Goal**: Animate food images to create dynamic, alive video clips

**Why essential**:
- Static images with Ken Burns = looks like a slideshow ❌
- Animated product images = feels like a real ad ✅

**Files**:
- `src/lib/image-to-video/index.ts` - Main orchestrator
- `src/lib/image-to-video/providers/fal.ts` - FAL.ai provider (Kling)
- `src/app/api/animate-image/route.ts` - API endpoint

**Provider**: FAL.ai (Kling)
- Cost: ~$0.02-0.05 per 5-second clip
- Quality: High, good motion on food images
- Speed: ~30-60 seconds generation time

**Usage**:
```typescript
const animatedClip = await animateImage({
  imageUrl: "https://example.com/pizza.jpg",
  prompt: "subtle steam rising, appetizing food shot, slight camera movement",
  duration: 5,
});
```

**Test**:
```bash
curl -X POST http://localhost:3000/api/animate-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/pizza.jpg",
    "prompt": "subtle steam rising, appetizing food shot"
  }'
```

**Cost Strategy**:
- Animate only 1-2 hero product images (not all)
- Use stock video for background/context scenes
- Total cost per ad: ~$0.02-0.10

---

## Step 8: Image Generation (Fallback)

**Goal**: Generate images when scraping yields insufficient visuals

**When to use**:
- Less than 2 usable product images from scraping
- No suitable hero image found

**Files**:
- `src/lib/image-generator/index.ts` - Image generation wrapper
- `src/app/api/generate-image/route.ts` - API endpoint

**Provider**: Pollinations.ai (FREE, no API key needed)

**Usage**:
```typescript
const imageUrl = await generateImage({
  prompt: "delicious pepperoni pizza, professional food photography, steam rising",
  style: "photorealistic"
});
```

**Test**:
```bash
curl "https://image.pollinations.ai/prompt/delicious%20pepperoni%20pizza%20professional%20food%20photography"
```

---

## Step 9: Timeline Assembly

**Goal**: Combine all assets into editor-compatible JSON

**Files**:
- `src/lib/timeline-builder/index.ts` - Main assembler
- `src/lib/timeline-builder/templates/restaurant-ad.ts` - 10-second ad template
- `src/lib/timeline-builder/types.ts` - Timeline types

**Input**:
```typescript
{
  script: { scenes: [...] },           // from Step 2
  imageAssignments: { hook: "...", },  // from Step 3
  stockVideos: [...],                  // from Step 4
  animatedClips: [...],                // from Step 7
  voiceover: { url, duration },        // from Step 5
  music: { url, duration },            // from Step 6
  brand: { colors, logo }              // from Step 1
}
```

**Output**: JSON compatible with react-video-editor timeline format

**Template Structure (10-second ad)**:
```
TIME       SCENE          VISUAL                          AUDIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0-2.5s     HOOK           Stock video background          VO: hook text
                          + Text overlay                  Music: starts

2.5-5s     VALUE          ANIMATED product image (Kling)  VO: value text
                          + Text overlay                  Music: continues

5-7.5s     BENEFIT        Stock video or 2nd animated     VO: benefit text
                          + Text overlay                  Music: continues

7.5-10s    CTA            Logo + brand colors             VO: CTA text
                          + Contact info                  Music: fade out
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 10: Editor Integration

**Goal**: Load generated timeline into react-video-editor

**Files**:
- Generation UI component
- "Generate from URL" button in editor
- Timeline loading into DesignCombo state

**Flow**:
1. User enters restaurant URL
2. Pipeline generates ad (~45-90 seconds)
3. Timeline loads in editor
4. User can edit/customize
5. Export final video

---

## Main Orchestration Endpoint

**File**: `src/app/api/generate/route.ts`

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.joespizza.com",
    "tone": "friendly"
  }'
```

**Pipeline flow**:
```
URL + Tone
    ↓
Step 1: Scrape → brand, images, colors
    ↓
Step 2: Generate Script → scenes with text
    ↓
Step 3: CLIP assigns images to scenes
    ↓
Step 4: Fetch stock video for backgrounds
    ↓
Step 5: Generate voiceover
    ↓
Step 6: Fetch background music
    ↓
Step 7: Animate 1-2 product images (Kling)
    ↓
Step 8: Generate fallback images if needed
    ↓
Step 9: Assemble timeline
    ↓
Return: Editor-ready JSON
```

---

## Environment Variables

```env
# .env.local

GROQ_API_KEY=your_key        # Script generation (FREE)
PEXELS_API_KEY=your_key      # Stock video (FREE)
PIXABAY_API_KEY=your_key     # Background music (FREE)
FAL_KEY=your_key             # Kling image-to-video (REQUIRED)
```

---

## Cost Per Video Ad

| Component | Provider | Cost |
|-----------|----------|------|
| Scraping | Playwright | FREE |
| Script | Groq | FREE |
| CLIP | Local | FREE |
| Stock Video | Pexels | FREE |
| Voiceover | Edge-TTS | FREE |
| Music | Pixabay | FREE |
| **Image Animation** | **Kling/FAL** | **$0.02-0.05** |
| Image Generation | Pollinations | FREE |
| **TOTAL** | | **~$0.02-0.10** |

---

## Current Implementation Status

### Phase 1: Core Pipeline (COMPLETED)

**Steps 1-4 are fully implemented and working:**

1. **Web Scraping** - Extracts brand info, logo, images, colors, contact from restaurant websites
2. **Script Generation** - Uses Groq LLM to generate 4-scene ad scripts
3. **Visual Matching** - CLIP-based semantic matching of images to scenes
4. **Stock Video Resolution** - Pexels API integration for stock_video scenes

### Phase 2: Editor Integration (COMPLETED)

**Two-Screen Flow:**

1. **Landing Page** (`src/app/page.tsx`)
   - POC restaurant dropdown (Joe's Pizza, Doughnut Vault, Sweetgreen)
   - Generate button triggers full pipeline
   - Progress indicators for each step
   - On completion, stores design in sessionStorage and navigates to editor

2. **Orchestration API** (`src/app/api/generate-ad/route.ts`)
   - Runs Steps 1-4 sequentially
   - Builds timeline using `buildTimelineDesign()`
   - Returns editor-compatible design JSON

3. **Timeline Builder** (`src/lib/timeline-builder/index.ts`)
   - Converts enriched script to `@designcombo/types` format
   - Creates video/image track items for visuals
   - Creates text overlay items for displayText
   - Proper timing based on scene durations

4. **Editor Integration** (`src/features/editor/editor.tsx`)
   - Loads generated design from sessionStorage on mount
   - Clears sessionStorage after loading
   - Falls back to empty editor if no stored design

**Removed:**
- `src/features/editor/mock.ts` - Default sample timeline removed

### Phase 3: Audio (NOT YET STARTED)

- Step 5: Voiceover Generation (Edge-TTS)
- Step 6: Background Music (Pixabay)

### Phase 4: Advanced (NOT YET STARTED)

- Step 7: Image-to-Video Animation (Kling/FAL.ai)
- Step 8: Image Generation Fallback (Pollinations)

---

## How to Test

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Open `http://localhost:3000`

3. Select a restaurant from the dropdown

4. Click "Generate Ad"

5. Wait for all steps to complete

6. Editor opens with generated timeline

---

## File Changes Summary

### New Files Created:
- `src/app/page.tsx` - Landing page with restaurant selector
- `src/app/api/generate-ad/route.ts` - Orchestration endpoint
- `src/lib/timeline-builder/index.ts` - Script to timeline converter

### Modified Files:
- `src/features/editor/editor.tsx` - Loads design from sessionStorage
- `src/lib/scraper/index.ts` - Fixed TypeScript type annotation

### Removed Files:
- `src/features/editor/mock.ts` - No longer needed
