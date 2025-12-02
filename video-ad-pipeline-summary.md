# AI Video Ad Generator - Complete Pipeline & Tools Summary

**Project**: Vibe.co-style video ad generation platform  
**Team**: 2-person startup  
**Target Users**: Small businesses with limited ad budgets  
**Output**: Professional 10-15 second video ads  
**Cost Target**: $0.02-0.15 per video

---

## Executive Summary

User enters website URL → System scrapes brand assets → AI generates script → Fetches/generates media → Assembles into professional video ad → Loads in editor for customization.

**Key Insight**: We use a HYBRID approach combining:
- **FREE stock video** (Pexels) for backgrounds/context
- **Cheap AI image-to-video** ($0.02-0.05) to animate scraped product images
- **FREE motion graphics** (Remotion) for text animations and effects

This creates ads that look like real video content, not slideshows.

---

## Complete Pipeline Flow

```
USER INPUT: Website URL + Tone Selection
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 1: WEB SCRAPING                                           ~3-5s    │
│  ─────────────────────                                                   │
│  Tool: Playwright                                                        │
│                                                                          │
│  Extracts:                                                               │
│  • Logo (og:image, header img, favicon fallback)                        │
│  • Product/hero images                                                   │
│  • Brand text (tagline, meta description)                               │
│  • Brand colors (via node-vibrant on logo)                              │
│  • Contact info for CTA                                                  │
│                                                                          │
│  Output: { logo, images[], colors, brandText, contact }                 │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 2: IMAGE QUALITY FILTERING                                 ~1s     │
│  ───────────────────────────────                                         │
│  Tool: Sharp.js                                                          │
│                                                                          │
│  Filters out:                                                            │
│  • Images < 400x300px (icons, spacers, tracking pixels)                 │
│  • Blurry images (Laplacian variance < 100)                             │
│  • Wrong aspect ratios (< 0.2 or > 5.0)                                 │
│  • URL patterns: icon, favicon, sprite, ad_, tracking                   │
│                                                                          │
│  Scores remaining images for: hero, product, background suitability     │
│  Output: ScoredImage[] sorted by quality and category                   │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 3: SMART VISUAL SELECTION (Enhancement)                    ~2s     │
│  ────────────────────────────────────────────                            │
│  Tools: CLIP + BLIP models                                               │
│                                                                          │
│  CLIP (Contrastive Language-Image Pre-training):                        │
│  • Encodes script/brand text → text embedding                           │
│  • Encodes each image → image embedding                                 │
│  • Finds images with highest semantic similarity to script              │
│  • Use case: "Find image that best matches 'fresh coffee morning'"      │
│                                                                          │
│  BLIP (Bootstrapped Language-Image Pre-training):                       │
│  • Generates captions for images                                         │
│  • Validates CLIP selections make sense                                  │
│  • Use case: Verify selected hero image actually shows the product      │
│                                                                          │
│  Cost: ~$0.002/image via Replicate                                      │
│  Note: Can skip for MVP, use simpler size/quality heuristics            │
│  Output: Best image assigned to each scene slot                         │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 4: SCRIPT GENERATION                                       ~2s     │
│  ─────────────────────────                                               │
│  Tools: Groq / Claude / Gemini                                           │
│                                                                          │
│  Input:                                                                   │
│  • Brand name, tagline, description (from scraping)                     │
│  • Tone: professional / playful / urgent / friendly                     │
│  • Duration: 10 seconds (~25-30 words)                                  │
│                                                                          │
│  Output JSON:                                                            │
│  {                                                                        │
│    "fullScript": "Fresh coffee. Delivered daily. Premium beans...",     │
│    "scenes": [                                                           │
│      { "id": "hook", "voiceoverText": "Fresh coffee.",                  │
│        "displayText": "FRESH COFFEE" },                                  │
│      { "id": "value", "voiceoverText": "Delivered daily.", ... },       │
│      { "id": "benefit", "voiceoverText": "Premium beans.", ... },       │
│      { "id": "cta", "voiceoverText": "Order now.", ... }                │
│    ]                                                                      │
│  }                                                                        │
│                                                                          │
│  Recommended: Groq (Llama 3.1-8B) - FREE, 14,400 req/day                │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 5: FETCH STOCK VIDEO (FREE)                                ~2s     │
│  ────────────────────────────────                                        │
│  Tool: Pexels API (or Pixabay Video)                                     │
│                                                                          │
│  Purpose: Real video backgrounds for scenes (NOT Ken Burns slideshow)   │
│                                                                          │
│  Process:                                                                 │
│  • Detect industry from brand description                                │
│  • Map to search queries: "coffee barista", "restaurant cooking", etc.  │
│  • Fetch top results, download best match                                │
│                                                                          │
│  Rate limit: 200 req/hour, 20k req/month (can request unlimited)        │
│  License: Commercial use allowed, attribution appreciated               │
│                                                                          │
│  Output: Real video clips for background scenes                         │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 6: AI IMAGE-TO-VIDEO (Key Differentiator)               ~30-60s    │
│  ──────────────────────────────────────────────                          │
│  Purpose: Animate scraped product image so it MOVES like real video     │
│                                                                          │
│  Only animate 1-2 key images per ad (cost control)                      │
│  Prompt: "subtle motion, professional product shot, premium feel"       │
│                                                                          │
│  This is what makes it look like an AD, not a SLIDESHOW                 │
│                                                                          │
│  Primary options (see tools section for full list):                     │
│  • Kling: $0.02/5s - Best value                                         │
│  • Pika: ~$0.03/5s - Easy image animation                               │
│  • Kaiber: ~$0.05/5s - Stylized animations                              │
│  • Runway Gen-4 Turbo: $0.05/5s - Highest quality                       │
│                                                                          │
│  Output: 5-second video clip of animated product/hero image             │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 7: GENERATE IMAGE (If Needed)                              ~5s     │
│  ──────────────────────────────────                                      │
│  Purpose: Generate missing visuals when scraping yields insufficient    │
│           images or for abstract concepts                                │
│                                                                          │
│  Trigger conditions:                                                     │
│  • Less than 2 usable images from scraping                              │
│  • No suitable hero/product image found                                  │
│  • Script references concept without matching image                     │
│                                                                          │
│  See tools section for free/budget options                              │
│  Output: Generated image to fill content gaps                           │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 8: GENERATE VOICEOVER                                      ~3s     │
│  ──────────────────────────                                              │
│  Tool: Edge-TTS (FREE)                                                   │
│                                                                          │
│  Features:                                                                │
│  • 300+ voices, 90+ languages                                           │
│  • Azure/Microsoft quality (neural voices)                              │
│  • No API key required                                                   │
│  • SSML support for rate/pitch control                                  │
│                                                                          │
│  Recommended voices:                                                     │
│  • en-US-AriaNeural (warm female)                                       │
│  • en-US-GuyNeural (professional male)                                  │
│  • en-US-JennyNeural (friendly female)                                  │
│                                                                          │
│  Output: voiceover.mp3 + duration                                       │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 9: FETCH BACKGROUND MUSIC                                  ~1s     │
│  ──────────────────────────────                                          │
│  Tool: Pixabay Music API (FREE)                                          │
│                                                                          │
│  Mood mapping:                                                            │
│  • professional → "corporate inspiring"                                  │
│  • playful → "upbeat fun happy"                                         │
│  • urgent → "energetic dramatic"                                        │
│  • friendly → "warm acoustic"                                           │
│                                                                          │
│  License: Royalty-free, commercial use allowed                          │
│  Note: Some tracks may trigger YouTube Content ID (disputes resolve)    │
│                                                                          │
│  Output: background_music.mp3 (10-15s)                                  │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 10: TEMPLATE ASSEMBLY / TIMELINE BUILD                    ~100ms   │
│  ───────────────────────────────────────────                             │
│  Tool: Custom code → react-video-editor JSON format                      │
│                                                                          │
│  Template is PRE-CODED in Remotion - defines:                           │
│  • Scene structure and timing                                            │
│  • Text animations (word-by-word, typewriter, fade-up)                  │
│  • Transitions (crossfade, slide, zoom)                                  │
│  • Motion graphics (particles, gradients, shapes)                       │
│  • Audio sync (voiceover timing, music ducking)                         │
│                                                                          │
│  Content FILLS THE SLOTS - template provides the "ad feel"              │
│                                                                          │
│  Output: Complete timeline JSON for editor                               │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 11: LOAD IN EDITOR                                                 │
│  ───────────────────────                                                 │
│  Tool: react-video-editor (forked) + Remotion                            │
│                                                                          │
│  User can:                                                                │
│  • Preview generated ad                                                  │
│  • Edit text/script                                                      │
│  • Swap images                                                           │
│  • Adjust timing                                                         │
│  • Change colors                                                         │
│  • Export final video                                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Template Structure (10-Second Ad)

```
TIME       SCENE               CONTENT                    SOURCE           COST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0-2.5s     HOOK                Stock video background     Pexels           FREE
           ├─ Overlay          Animated hook text         Remotion         FREE
           └─ Effect           Gradient for readability   Remotion         FREE

2.5-5.5s   PRODUCT SHOWCASE    AI-animated product image  Kling/Runway     $0.02-0.05
           ├─ Background       Animated gradient          Remotion         FREE
           ├─ Effect           Floating particles         Remotion         FREE
           └─ Text             Value proposition          Remotion         FREE

5.5-8s     BENEFIT             Stock video (lifestyle)    Pexels           FREE
           └─ Overlay          Benefit text + panel       Remotion         FREE

8-10s      CTA                 Motion graphics only       Remotion         FREE
           ├─ Elements         Logo + CTA text            Remotion         FREE
           └─ Effect           Pulsing rings, swipe-up    Remotion         FREE

AUDIO      Background music    Full duration, ducked      Pixabay          FREE
           Voiceover           Starts at 200ms            Edge-TTS         FREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                              TOTAL COST: $0.02 - $0.05
```

---

## Complete Tools Reference

### 1. Web Scraping & Processing

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Playwright** | Web scraping | FREE | Handles JS-heavy sites, anti-detection with stealth plugin |
| **Sharp.js** | Image quality filtering | FREE | Blur detection, resize, format conversion |
| **node-vibrant** | Brand color extraction | FREE | Extracts palette from logo |

### 2. AI/ML Models for Visual Selection

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **CLIP** | Image-text semantic matching | ~$0.002/img | Finds images matching script semantically |
| **BLIP** | Image captioning/validation | ~$0.002/img | Generates descriptions, validates selections |

*Access via: Replicate, HuggingFace Inference API, or self-hosted*

### 3. Script/LLM Generation

| Tool | Cost | Free Tier | Notes |
|------|------|-----------|-------|
| **Groq** (Llama 3.1-8B) | FREE | 14,400 req/day | Fastest, recommended for MVP |
| **Gemini Flash** | FREE | 500-1500 req/day | Good fallback |
| **Claude** | ~$0.002/script | Limited | Best quality |

### 4. Image Generation (If Needed)

| Tool | Cost | API | Notes |
|------|------|-----|-------|
| **Pollinations.ai** | FREE | No key needed | `https://image.pollinations.ai/prompt/{prompt}` |
| **FAL** | Low cost | Yes | Fast inference |
| **WaveSpeed AI** | Low cost | Yes | - |
| **ImageRouter.io** | FREE tier | Yes | Multi-model router |
| **StableHorde** | FREE | Yes | Community-powered, slower queues |
| **CogView 3 Flash** | Low cost | BigModel API | Chinese model, good quality |
| **Craiyon** (DALL-E Mini) | FREE | Unofficial | Lower quality, fun/casual use |

### 5. Video Generation / Image Animation

| Tool | Cost/5s | API | Best For |
|------|---------|-----|----------|
| **Kling** | ~$0.02 | Yes | Best value, recommended |
| **Pika** | ~$0.03 | Yes | Easy image animation |
| **Kaiber SuperStudio** | ~$0.05 | Limited | Stylized/artistic animations |
| **Luma Dream Machine** | ~$0.03 | Yes | Fast, good motion |
| **Runway Gen-4 Turbo** | $0.05 | Yes | Highest quality |
| **Runway Gen-4** | $0.12 | Yes | Premium quality |
| **Stability AI** | ~$0.04 | Yes | Open models |
| **Google Veo 3** | TBD | AI Studio | Excellent (limited access) |
| **Imagine.art** | Varies | Yes | Multi-model access |

### 6. Stock Video (FREE Real Video)

| Tool | Rate Limit | License | Notes |
|------|------------|---------|-------|
| **Pexels API** | 200/hr, 20k/mo | Commercial ✓ | Best quality, easy API |
| **Pixabay Video** | 100/min | Commercial ✓ | Good alternative |
| **Coverr** | 500/min (prod) | Commercial ✓ | Modern aesthetic |

### 7. Audio

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Edge-TTS** | Voiceover | FREE | Azure quality, 300+ voices, no API key |
| **Pixabay Music API** | Background music | FREE | Royalty-free, commercial use |

### 8. Video Rendering & Editor

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Remotion** | Video composition & rendering | FREE* | *Free for <$1M revenue or <4 devs |
| **react-video-editor** | Editor UI | FREE | Forked from designcombo |

---

## Cost Analysis

### Per-Video Generation Cost

| Tier | Components | Cost |
|------|------------|------|
| **Minimum** | Stock video + Ken Burns + Edge-TTS + Pixabay music | $0.00 |
| **Recommended** | Stock video + 1 AI-animated image (Kling) + Edge-TTS + Pixabay | **$0.02** |
| **Standard** | Stock video + 1 AI-animated image (Runway) + Edge-TTS + Pixabay | **$0.05** |
| **Premium** | Stock video + 2 AI clips + Claude script + Edge-TTS + Pixabay | **$0.12** |

### Monthly Infrastructure (Startup Scale)

| Component | Service | Cost |
|-----------|---------|------|
| Frontend hosting | Vercel | $0-20 |
| Backend | Railway/Render | $0-20 |
| Database | SQLite (dev) / Neon (prod) | $0-25 |
| Storage | Cloudflare R2 | $1-5 |
| **Total** | | **$0-70/month** |

### Revenue Potential

At $5-10 per video to user, $0.02-0.12 cost = **95-99% margin**

---

## Why Hybrid Approach (Stock + AI Animation)?

| Approach | Cost | Result |
|----------|------|--------|
| Ken Burns on static images | $0 | Looks like a slideshow ❌ |
| Stock video only | $0 | Real video but generic ⚠️ |
| **Stock + AI-animated product** | **$0.02-0.05** | **Real video + custom product** ✅ |
| Full AI video generation | $0.50-1.00 | Custom but expensive ⚠️ |

**The key insight**: Use FREE stock video for context/backgrounds, pay ONLY to animate the scraped product image. This creates the "custom ad" feel at minimal cost.

---

## File Structure

```
project/
├── app/
│   ├── api/
│   │   ├── generate/route.ts      # Main orchestration endpoint
│   │   ├── scrape/route.ts        # Standalone scrape
│   │   └── render/route.ts        # Trigger video render
│   └── page.tsx
├── lib/
│   ├── scraper.ts                 # Playwright + node-vibrant
│   ├── image-filter.ts            # Sharp.js quality filtering
│   ├── visual-selector.ts         # CLIP/BLIP integration
│   ├── script-generator.ts        # Groq/Claude LLM calls
│   ├── stock-video.ts             # Pexels API
│   ├── image-to-video.ts          # Kling/Runway integration
│   ├── voiceover.ts               # Edge-TTS
│   ├── music.ts                   # Pixabay music
│   └── timeline-builder.ts        # Assembles final JSON
├── remotion/
│   ├── Root.tsx
│   └── templates/
│       └── ProductShowcase/       # Pre-coded template
└── components/
    └── editor/                    # react-video-editor fork
```

---

## API Endpoints

```
POST /api/generate
  Input:  { url: string, tone: string }
  Output: { timeline: JSON, metadata: object, costs: object }
  Time:   ~45-90 seconds (mostly waiting for AI video)

GET /api/templates
  Output: [{ id, name, duration, thumbnail }]

POST /api/scrape  
  Input:  { url: string }
  Output: { brand, assets, colors }

POST /api/render/{projectId}
  Input:  { format: 'mp4' | 'webm', quality: 'draft' | 'final' }
  Output: { jobId, status }

GET /api/render/{jobId}/status
  Output: { status, progress, outputUrl }
```

---

## Development Phases

### Phase 1: MVP (Weeks 1-3)
- [ ] Playwright scraping
- [ ] Sharp.js image filtering  
- [ ] Groq script generation
- [ ] Edge-TTS voiceover
- [ ] Pexels stock video fetching
- [ ] Basic template (stock video backgrounds)
- [ ] Timeline builder → Editor JSON
- [ ] Ken Burns fallback for images

### Phase 2: Enhancement (Weeks 4-6)
- [ ] Kling/Runway image-to-video integration
- [ ] CLIP/BLIP smart image selection
- [ ] Pixabay music integration
- [ ] Word-level voiceover timing
- [ ] Multiple template options

### Phase 3: Scale (Weeks 7-8)
- [ ] Premium tier with more AI generation
- [ ] Voice selection UI
- [ ] Template customization
- [ ] User asset uploads
- [ ] Analytics dashboard

---

## Open Questions

1. **Primary image-to-video service**: Kling (cheapest) vs Runway (best quality)?
2. **CLIP/BLIP**: Include in MVP or defer to Phase 2?
3. **Templates**: Start with 1 or 2-3 options?
4. **Fallback**: If Pexels has no relevant video, use Ken Burns or generate?
5. **User uploads**: Allow custom images/videos from start?

---

## Quick Reference Links

| Service | Documentation |
|---------|---------------|
| Pexels API | https://www.pexels.com/api/documentation/ |
| Pixabay API | https://pixabay.com/api/docs/ |
| Runway API | https://docs.dev.runwayml.com/ |
| Kling | https://klingai.com/ |
| Pika | https://pika.art/ |
| Kaiber | https://www.kaiber.ai/superstudio |
| Edge-TTS | https://github.com/rany2/edge-tts |
| Groq | https://console.groq.com/ |
| Pollinations | https://pollinations.ai/ |
| FAL | https://fal.ai/ |
| ImageRouter | https://imagerouter.io/ |
| StableHorde | https://stablehorde.net/ |
| Google Veo 3 | https://aistudio.google.com/models/veo-3 |
| Stability AI | https://stability.ai/ |
| Remotion | https://www.remotion.dev/docs/ |
| Sharp.js | https://sharp.pixelplumbing.com/ |
| Playwright | https://playwright.dev/ |

---

*Document Version: 1.0*  
*Last Updated: November 2025*
