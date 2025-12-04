# AI Video Ad Generator - Pipeline Summary

**Project**: Restaurant video ad generation platform
**Team**: 2-person startup  
**Target Users**: Small restaurant businesses
**Output**: Professional 5-10 second video ads
**Cost Target**: ~$0.02-0.10 per video

**Key Principle**: The ad must feel dynamic and alive - NOT a slideshow. Image-to-video animation is essential.

## Executive Summary

User enters website URL → System scrapes brand assets → AI generates script → Fetches/generates media → Assembles into professional video ad → Loads in editor for customization.

**Key Insight**: We use a HYBRID approach combining:
- **FREE stock video** (Pexels) for backgrounds/context
- **Cheap AI image-to-video** ($0.02-0.05) to animate scraped product images
- **FREE motion graphics** (Remotion) for text animations and effects

This creates ads that look like real video content, not slideshows.

---

## Pipeline Flow (Revised)

```
USER INPUT: Website URL + Tone Selection
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 1: WEB SCRAPING                                    ✅ COMPLETE      │
│  ─────────────────────                                                    │
│  Tool: Playwright                                                         │
│                                                                           │
│  Extracts:                                                                │
│  • Logo (og:image, header img, favicon fallback)                         │
│  • Product/hero images (categorized: hero/product/background)            │
│  • Brand text (name, tagline, meta description)                          │
│  • Brand colors (from CSS/theme, NOT food images)                        │
│  • Contact info, social links                                            │
│  • Cuisine type detection                                                 │
│                                                                           │
│  Output: { brand, logo, images[], colors, contact, cuisine }             │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 2: SCRIPT GENERATION                                      ~2s      │
│  ─────────────────────────                                               │
│  Tool: Groq (Llama 3.1-8B) - FREE                                        │
│                                                                           │
│  Input:                                                                   │
│  • Brand name, tagline, description (from Step 1)                        │
│  • Cuisine type (for context)                                            │
│  • Tone: professional / playful / urgent / friendly                      │
│  • Duration: 10 seconds (~25-30 words)                                   │
│                                                                           │
│  Output:                                                                  │
│  {                                                                        │
│    "fullScript": "Fresh coffee. Delivered daily. Premium beans...",      │
│    "scenes": [                                                            │
│      { "id": "hook", "voiceoverText": "Fresh ingredients.",              │
│        "displayText": "FRESH INGREDIENTS", "duration": 2.5 },            │
│      { "id": "value", ... },                                             │
│      { "id": "benefit", ... },                                           │
│      { "id": "cta", "voiceoverText": "Order now.", ... }                 │
│    ]                                                                      │
│  }                                                                        │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 3: SMART IMAGE SELECTION (CLIP)                  ✅ IMPLEMENTED     │
│  ────────────────────────────────────                                     │
│  Tool: CLIP model (local via @huggingface/transformers)                  │
│                                                                           │
│  Purpose: Match scraped images to script scenes SEMANTICALLY             │
│                                                                           │
│  Process:                                                                 │
│  • Takes images[] from Step 1                                            │
│  • Takes scenes[] from Step 2                                            │
│  • CLIP finds best image for each scene based on voiceoverText           │
│                                                                           │
│  Example:                                                                 │
│  • "Fresh ingredients" → matches image of fresh vegetables/toppings      │
│  • "Made with love" → matches image of chef/kitchen                      │
│  • "Order now" → matches logo or storefront                              │
│                                                                           │
│  Output: { hook: "url1", value: "url2", benefit: "url3", cta: "url4" }   │
│                                                                           │
│  Note: BLIP caption validation deferred to post-POC                      │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 4: FETCH STOCK VIDEO                                      ~2s      │
│  ─────────────────────────                                               │
│  Tool: Pexels API (FREE)                                                 │
│                                                                           │
│  Purpose: Real video backgrounds for scenes                              │
│                                                                           │
│  Process:                                                                 │
│  • Use cuisine type to select search queries                             │
│  • italian → "pizza making", "italian restaurant"                        │
│  • cafe → "barista", "coffee pour"                                       │
│  • Fetch 2-3 clips for backgrounds                                       │
│                                                                           │
│  Output: Stock video URLs for background layers                          │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 5: GENERATE VOICEOVER                                     ~3s      │
│  ──────────────────────────                                              │
│  Tool: Edge-TTS (FREE)                                                   │
│                                                                           │
│  Input: fullScript from Step 2                                           │
│  Voice: en-US-AriaNeural (warm female) or configurable                   │
│                                                                           │
│  Output: voiceover.mp3 + duration per scene                              │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 6: FETCH BACKGROUND MUSIC                                 ~1s      │
│  ──────────────────────────────                                          │
│  Tool: Pixabay Music API (FREE)                                          │
│                                                                           │
│  Mood mapping based on tone:                                             │
│  • friendly → "warm acoustic gentle"                                     │
│  • professional → "corporate inspiring"                                  │
│  • playful → "upbeat fun happy"                                          │
│                                                                           │
│  Output: background_music.mp3 (10-15s, royalty-free)                     │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 7: IMAGE-TO-VIDEO ANIMATION (Kling)                     ~30-60s    │
│  ────────────────────────────────────────                                │
│  Tool: FAL.ai (Kling) - ~$0.02-0.05 per clip                             │
│                                                                           │
│  Purpose: Make product images MOVE like real video                       │
│  This is what makes it an AD, not a SLIDESHOW                            │
│                                                                           │
│  Process:                                                                 │
│  • Select 1-2 best product images from CLIP assignment                   │
│  • Generate 5-second animated clip with subtle motion                    │
│  • Prompt: "subtle steam, appetizing food, slight camera movement"       │
│                                                                           │
│  Output: Animated video clip(s) of hero product images                   │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 8: IMAGE GENERATION (Fallback)                            ~5s      │
│  ───────────────────────────────────                                     │
│  Tool: Pollinations.ai (FREE)                                            │
│                                                                           │
│  When to use:                                                             │
│  • Less than 2 usable images from scraping                               │
│  • No suitable hero image found                                          │
│                                                                           │
│  Output: Generated product image to fill gaps                            │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 9: TIMELINE ASSEMBLY                                     ~100ms    │
│  ─────────────────────────                                               │
│  Tool: Custom timeline builder → react-video-editor JSON                 │
│                                                                           │
│  Combines:                                                                │
│  • Script scenes with timing                                             │
│  • ANIMATED product images (Kling) ← KEY DIFFERENTIATOR                  │
│  • Stock video backgrounds                                               │
│  • Voiceover audio                                                       │
│  • Background music (ducked under voiceover)                             │
│  • Brand colors for text/overlays                                        │
│  • Logo for CTA scene                                                    │
│                                                                           │
│  Output: Complete timeline JSON for editor                               │
└───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  STEP 10: LOAD IN EDITOR                                                 │
│  ───────────────────────                                                 │
│  Tool: react-video-editor + Remotion                                     │
│                                                                           │
│  User can:                                                                │
│  • Preview generated ad                                                  │
│  • Edit text/script                                                      │
│  • Swap images                                                           │
│  • Adjust timing                                                         │
│  • Change colors                                                         │
│  • Export final video (MP4/WebM)                                         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Template Structure (10-Second Ad)

```
TIME       SCENE          VISUAL                      AUDIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0-2.5s     HOOK           Stock video background      VO: "Fresh ingredients."
                          + Text overlay: "FRESH      Music: starts
                          INGREDIENTS"

2.5-5s     VALUE          Product image (Ken Burns)   VO: "Made daily."
                          + Text: "MADE DAILY"        Music: continues

5-7.5s     BENEFIT        Product image or stock      VO: "Taste the difference."
                          + Text: "TASTE THE          Music: continues
                          DIFFERENCE"

7.5-10s    CTA            Logo + brand colors         VO: "Order now."
                          + Text: "ORDER NOW"         Music: fade out
                          + Contact info
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Tools Reference (POC)

| Step | Tool | Cost | Notes |
|------|------|------|-------|
| Scraping | Playwright | FREE | Handles JS-heavy sites |
| Script | Groq (Llama 3.1) | FREE | 14,400 req/day |
| Image Selection | CLIP (local) | FREE | Runs in browser/Node |
| Stock Video | Pexels API | FREE | 200 req/hour |
| Voiceover | Edge-TTS | FREE | Azure quality, no API key |
| Music | Pixabay API | FREE | Royalty-free |
| **Image Animation** | **Kling/FAL.ai** | **$0.02-0.05** | **Essential for ad feel** |
| Image Generation | Pollinations.ai | FREE | Fallback when scraping insufficient |
| Rendering | Remotion | FREE* | *Free for <$1M revenue |

**Total POC Cost: ~$0.02-0.10 per video**

---

## Post-POC Enhancements

| Feature | POC | Post-POC |
|---------|-----|----------|
| Image animation | ✅ Kling (1-2 images) | More animated scenes |
| Image validation | CLIP only | + BLIP captions |
| Voiceover | Edge-TTS | + ElevenLabs option |
| Templates | 1 template | Multiple styles |
| Stock video | Pexels | + Pixabay fallback |

---

## API Endpoints

```
POST /api/scrape
  Input:  { url: string }
  Output: { brand, logo, images[], colors, contact }

POST /api/generate-script
  Input:  { brandName, tagline, description, cuisine, tone }
  Output: { fullScript, scenes[], totalDuration }

POST /api/generate  (Main orchestrator)
  Input:  { url: string, tone: string }
  Output: { timeline: JSON, metadata }

POST /api/generate-voice
  Input:  { text, voice }
  Output: { audioUrl, duration }

POST /api/fetch-music
  Input:  { mood, duration }
  Output: { musicUrl, title, duration }

GET /api/pexels-videos?query=...&per_page=5
  Output: { videos: [...] }
```

---

## Environment Variables

```env
# Required for POC
GROQ_API_KEY=your_groq_key
PEXELS_API_KEY=your_pexels_key
PIXABAY_API_KEY=your_pixabay_key
FAL_KEY=your_fal_key            # For Kling image-to-video (REQUIRED)

# Optional (post-POC)
ELEVENLABS_API_KEY=your_key     # For premium voiceover
```

---

## File Structure

```
src/
├── app/
│   └── api/
│       ├── scrape/route.ts           ✅ Complete
│       ├── generate-script/route.ts  ⬜ Step 2
│       ├── generate-voice/route.ts   ⬜ Step 5
│       ├── fetch-music/route.ts      ⬜ Step 6
│       ├── pexels-videos/route.ts    ✅ Exists
│       └── generate/route.ts         ⬜ Main orchestrator
├── lib/
│   ├── scraper/                      ✅ Complete
│   │   ├── index.ts
│   │   ├── extractors.ts
│   │   ├── color-extractor.ts
│   │   └── types.ts
│   ├── script-generator/             ⬜ Step 2
│   │   ├── index.ts
│   │   └── prompts.ts
│   ├── visual-selector.ts            ✅ Complete (CLIP)
│   ├── stock-video/                  ⬜ Step 4
│   │   └── index.ts
│   ├── voiceover/                    ⬜ Step 5
│   │   └── index.ts
│   ├── music/                        ⬜ Step 6
│   │   └── index.ts
│   └── timeline-builder/             ⬜ Step 9
│       ├── index.ts
│       └── templates/
└── components/
    └── editor/                       ⬜ Step 10
```

---

## Current Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Web Scraping | ✅ Complete | Tested with 3 restaurant sites |
| 2. Script Generation | ⬜ Next | Groq integration |
| 3. CLIP Selection | ✅ Implemented | Needs pipeline integration |
| 4. Stock Video | 🟡 Partial | API exists, needs cuisine mapping |
| 5. Voiceover | ⬜ Not started | Edge-TTS |
| 6. Music | ⬜ Not started | Pixabay API |
| 7. Image Animation | ⬜ Not started | Kling via FAL.ai (essential!) |
| 8. Image Generation | ⬜ Not started | Pollinations.ai fallback |
| 9. Timeline Assembly | ⬜ Not started | |
| 10. Editor Integration | ⬜ Not started | |

---

*Document Version: 2.0*
*Last Updated: December 2025*
