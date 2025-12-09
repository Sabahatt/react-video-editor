# Script Generator v2 - POC Enhancement Plan

## Overview

Redesign the script generator pipeline for the POC demo with:
1. **Rich brand context** for 3 POC restaurants (LLM generates all creative copy)
2. **Image diversity selection** to ensure variety in ad visuals
3. **Akool image2video integration** (replacing stock video)
4. **Up to 20-second ad support**

---

## Architecture Changes

### Current Flow
```
Scrape → Generate Script (LLM) → Match Visuals (CLIP) → Stock Videos → [missing steps]
```

### New Flow
```
Scrape Images → Generate Script (LLM with rich context) → Select Diverse Images → Animate with Akool
```

Key changes:
- Remove `stock_video` visual type entirely
- All scenes use `animated_image` except CTA uses `logo_brand`
- Image selection ensures category diversity
- LLM receives comprehensive brand context to generate professional ad copy

---

## POC Brand Context (For LLM Prompt Injection)

The LLM will receive this rich context and generate all creative copy (hooks, value props, CTAs, display text) itself.

### Joe's Pizza

```typescript
{
  brandName: "Joe's Pizza",
  urlPatterns: ["joespizza.com", "joespizza"],

  // Core Identity
  identity: {
    established: "1975",
    founder: "Pino 'Joe' Pozzuoli",
    founderOrigin: "Naples, Italy - the birthplace of pizza",
    originalLocation: "Corner of Bleecker and Carmine Street, Greenwich Village",
    currentLocation: "7 Carmine Street, Greenwich Village, NYC",
    ownerStatus: "Joe Pozzuoli, now 75+ years old, still owns and operates the restaurant",
    expansion: "Multiple NYC locations, plus Ann Arbor, Miami, Boston, and international locations"
  },

  // What Makes Them Special
  uniqueQualities: [
    "Greenwich Village institution for nearly 50 years",
    "Authentic New York street-style pizza",
    "Thin, crispy yet perfectly foldable slices",
    "Equally loved by tourists and native New Yorkers",
    "Pete Wells (NY Times): 'When neoclassical slice-shop owners say they emulate the old-school joints that still obsess over quality, Joe's is one of the places they're talking about'"
  ],

  // Ingredient Quality (from Santa Monica/Venice location)
  ingredients: {
    cheese: "All natural mozzarella cheese - no preservatives, fillers, or artificial ingredients",
    sauce: "House-made Modesto to*mato sauce / Santa Barbara tomato marinara",
    dough: "Hand-tossed fresh daily",
    specialty: {
      grandmaPizza: "Grandma's secret marinara sauce, fresh buffalo mozzarella, parmesan reggiano, baby basil, aromatic olive oil",
      artichokePizza: "Artichoke hearts, fresh spinach & garlic, whipped ricotta, romano cheese",
      vegetablePizza: "Farmers market fresh ingredients"
    },
    salads: "Organic mix greens, fresh buffalo mozzarella, Santa Barbara tomatoes"
  },

  // Menu Categories (for image diversity)
  menuCategories: {
    pizzas: ["NY Cheese Pizza", "Pepperoni Pizza", "Margherita", "White Pizza", "Sicilian Pizza", "Grandma Pizza", "Caprese Pizza", "Sausage Pizza", "Spinach & Artichoke Pizza", "My Way Pizza", "Sicilian Pepperoni"],
    salads: ["Organic Italian Salad", "Caesar Salad", "Caprese Salad", "Organic Antipasto Salad"],
    sides: ["House-made Meatballs", "Garlic Knots"]
  },

  tone: "playful",
  cuisine: "pizza"
}
```

### Sweetgreen

```typescript
{
  brandName: "Sweetgreen",
  urlPatterns: ["sweetgreen.com", "sweetgreen"],

  // Core Identity
  identity: {
    established: "2007",
    founders: "Nicolas Jammet, Nathaniel Ru, Jonathan Neman",
    foundingStory: "Three college students looking for healthier fast food options - opened first 560 sq ft store in Washington D.C. on August 1, 2007",
    scale: "260+ locations nationwide",
    tagline: "Fresh, plant-forward, earth-friendly food"
  },

  // Mission & Values
  mission: {
    statement: "Building healthier communities by connecting people to real food",
    philosophy: "Reimagining fast food - proving quality doesn't need to be sacrificed for convenience",
    approach: "Transparent supply network, cooking from scratch, empowering positive change in the food system"
  },

  // Sourcing & Quality
  sourcing: {
    proteins: "Antibiotic-free roasted chicken, antibiotic-free grass-fed steak, antibiotic-free miso glazed salmon",
    produce: "Organic shredded kale, organic baby spinach, organic arugula, organic spring mix",
    local: "30% of produce sourced locally, locally-made rosemary focaccia from regional bakery partners",
    farming: "Work with farmers using regenerative practices - giving more to the land than they take",
    transparency: "Carbon footprint labeling on every menu item"
  },

  // Sustainability Commitments
  sustainability: [
    "Carbon neutral operations by end of 2027",
    "Plant-forward menu with 30% lower carbon intensity than typical American meals",
    "Better Chicken Commitment for animal welfare",
    "Eco-friendly aluminum bottles for plastic-free oceans",
    "Sustainable restaurant design with clean energy and optimized materials"
  ],

  // Menu Categories (for image diversity)
  menuCategories: {
    salads: ["Kale Caesar", "Guac Greens", "Buffalo Chicken Salad", "Super Green Goddess", "Garden Cobb", "Hummus Crunch"],
    bowls: ["Harvest Bowl", "Chicken Pesto Parm", "Shroomami", "Crispy Rice Bowl", "Fish Taco Bowl"],
    plates: ["Caramelized Garlic Steak Plate", "Miso Glazed Salmon Plate", "Hot Honey Chicken Plate"],
    sides: ["Rosemary Focaccia", "Roasted Sweet Potatoes", "Hummus"],
    drinks: ["Hibiscus Clover Tea", "Organic Juices"]
  },

  tone: "professional",
  cuisine: "salad"
}
```

### Doughnut Vault

```typescript
{
  brandName: "Doughnut Vault",
  urlPatterns: ["doughnutvault.com", "doughnut-vault"],

  // Core Identity
  identity: {
    established: "2011",
    founder: "Brendan Sodikoff (trained at Per Se and Alain Ducasse)",
    parentCompany: "Hogsalt Hospitality (also owns Au Cheval, Aster Hall)",
    location: "401 N Franklin St, Chicago - River North, housed in an old bank vault",
    hours: "Daily 7:30am - 1:00pm",
    dailyProduction: "~600 doughnuts per day"
  },

  // Brand Positioning
  taglines: [
    "Artisanal doughnuts handcrafted daily using old world recipes",
    "Maybe old fashioned, but always in style",
    "Life is sweet"
  ],

  // What Makes Them Special
  uniqueQualities: [
    "Small-batch artisan doughnuts",
    "Handcrafted using old world recipes",
    "Fresh daily - available until sold out",
    "Housed in actual old bank vault",
    "Customers line up at 8am",
    "Often sells out in less than 2 hours",
    "Walk-up orders welcome"
  ],

  // Product Quality (from reviews)
  productQuality: {
    texture: "Signature slightly crunchy outside with tender inside",
    cakeDonuts: "Possess a lightness never encountered before in cake doughnuts - not dense and dry like typical cake doughnuts",
    glaze: "What really puts it over the top is the glaze itself",
    chocolate: "High quality chocolate with just the right amount of coating",
    reputation: "Best glazed donut in the city - very fluffy, soft donut"
  },

  // Menu Categories (for image diversity)
  menuCategories: {
    oldFashioned: ["Buttermilk Old Fashioned", "Triple Chocolate Old Fashioned", "Pistachio Old Fashioned", "Lemon Poppyseed Old Fashioned", "Almond Old Fashioned"],
    glazed: ["Vanilla Glazed", "Chocolate Glazed", "Strawberry Glazed"],
    specialty: ["Gingerbread Stack", "Vanilla Birthday Cake", "Apple Fritter", "Red Velvet", "Carrot Cake", "Apple Cider"],
    other: ["Doughnut Holes", "Coffee", "Cold Brew"]
  },

  tone: "friendly",
  cuisine: "bakery"
}
```

---

## Image Diversity Selection Algorithm

### Goal
Ensure the 4-5 scenes of the ad show variety, not all the same type of food.

### Algorithm

```typescript
interface CategorizedImage {
  url: string;
  alt: string;
  category: string;  // derived from menuCategories matching
  qualityScore: number;
}

function selectDiverseImages(
  scrapedImages: ScrapedImage[],
  menuCategories: Record<string, string[]>,
  sceneCount: number = 4
): CategorizedImage[] {

  // 1. Categorize images by matching alt text to menu category keywords
  const categorized = categorizeByMenuItems(scrapedImages, menuCategories);

  // 2. For each scene (except CTA), pick from different categories
  const selected: CategorizedImage[] = [];
  const usedCategories = new Set<string>();
  const categoryOrder = Object.keys(menuCategories); // Use config order as priority

  for (let i = 0; i < sceneCount - 1; i++) {  // -1 because CTA uses logo
    let picked = false;

    // Try to pick from unused category
    for (const category of categoryOrder) {
      if (!usedCategories.has(category) && categorized[category]?.length > 0) {
        const best = pickBestQuality(categorized[category]);
        selected.push(best);
        usedCategories.add(category);
        removeFromPool(categorized[category], best);
        picked = true;
        break;
      }
    }

    // If all categories used, pick best remaining from any category
    if (!picked) {
      const allRemaining = Object.values(categorized).flat();
      if (allRemaining.length > 0) {
        selected.push(pickBestQuality(allRemaining));
      }
    }
  }

  return selected;
}

function categorizeByMenuItems(
  images: ScrapedImage[],
  menuCategories: Record<string, string[]>
): Record<string, CategorizedImage[]> {
  const result: Record<string, CategorizedImage[]> = {};

  for (const category of Object.keys(menuCategories)) {
    result[category] = [];
  }
  result['uncategorized'] = [];

  for (const img of images) {
    const altLower = (img.alt || '').toLowerCase();
    let matched = false;

    for (const [category, menuItems] of Object.entries(menuCategories)) {
      // Check if alt text matches any menu item keywords
      const matches = menuItems.some(item => {
        const keywords = item.toLowerCase().split(' ');
        return keywords.some(kw => kw.length > 3 && altLower.includes(kw));
      });

      if (matches) {
        result[category].push({
          url: img.url,
          alt: img.alt || '',
          category,
          qualityScore: calculateQualityScore(img)
        });
        matched = true;
        break;
      }
    }

    if (!matched && img.type === 'product') {
      result['uncategorized'].push({
        url: img.url,
        alt: img.alt || '',
        category: 'uncategorized',
        qualityScore: calculateQualityScore(img)
      });
    }
  }

  return result;
}

function calculateQualityScore(img: ScrapedImage): number {
  let score = 0;
  const pixels = (img.width || 0) * (img.height || 0);

  // Size: prefer 400x400+
  if (pixels >= 600 * 600) score += 30;
  else if (pixels >= 400 * 400) score += 20;
  else if (pixels >= 300 * 300) score += 10;

  // Aspect ratio: prefer landscape or square for video
  if (img.width && img.height) {
    const ratio = img.width / img.height;
    if (ratio >= 1.3 && ratio <= 1.9) score += 20;
    else if (ratio >= 0.9 && ratio <= 1.1) score += 15;
  }

  // Has descriptive alt text
  if (img.alt && img.alt.length > 5) score += 10;

  // Type bonus
  if (img.type === 'product') score += 20;
  if (img.type === 'hero') score += 15;

  return score;
}
```

---

## Updated Types

### Remove stock_video

```typescript
export type VisualType =
  | 'animated_image'   // Animate scraped image with Akool
  | 'logo_brand';      // Logo + brand colors (CTA only)
```

### Updated AdScene

```typescript
export interface AdScene {
  id: 'hook' | 'value' | 'benefit' | 'cta';

  voiceoverText: string;
  displayText: string;
  duration: number;
  visualType: VisualType;

  // For animated_image scenes (resolved after image selection)
  selectedImage?: {
    url: string;
    alt: string;
    category: string;
  };

  // Akool animation config
  akoolConfig?: {
    prompt: string;
    negativePrompt: string;
    videoLength: 5 | 10;
    resolution: "720p" | "1080p";
  };

  // For CTA scene
  contactOverlay?: ContactInfo;
}
```

---

## LLM Prompt Strategy

The script generator will:

1. **Detect POC restaurant** by brand name or URL
2. **Inject rich brand context** into the LLM prompt
3. **Let LLM generate all creative copy** including:
   - Hook voiceover and display text
   - Value proposition voiceover and display text
   - Benefit voiceover and display text
   - CTA voiceover and display text
4. **Provide Akool animation guidance** for food type

### Sample Prompt Structure

```
You are an expert video ad copywriter creating a {duration}-second ad for {brandName}.

BRAND CONTEXT:
{inject full brand identity, recognition, unique qualities, ingredients}

MENU CATEGORIES (for visual diversity reference):
{inject menuCategories}

Create compelling ad copy for 4 scenes. Each scene needs:
- voiceoverText: Natural spoken copy (6-10 words, ~2.5 words/second)
- displayText: Bold on-screen text (2-4 words, ALL CAPS)

The copy should:
- Leverage the brand's unique story and quality claims
- Feel authentic to the brand's tone ({tone})
- Build from hook → value → benefit → call-to-action
- Use universal appeal (avoid location-specific references in displayText)

Also generate animation prompts for each food scene (will be used to animate product photos):
- Describe subtle motion: zoom, pan, steam, glistening, freshly baked etc.
- Keep prompts concise: 10-15 words max

OUTPUT FORMAT: JSON
{
  "scenes": [
    {
      "id": "hook",
      "voiceoverText": "...",
      "displayText": "...",
      "duration": {sceneDuration},
      "visualType": "animated_image",
      "visualCategory": "pizzas",  // which menu category to pull image from
      "akoolPrompt": "slow zoom in, steam rising, cheese glistening",
      "akoolNegativePrompt": "blurry, distorted, text, watermark"
    },
    ...
  ]
}
```

---

## Akool Integration

### API Details

```typescript
// Endpoint
POST https://openapi.akool.com/api/open/v4/image2Video/createBySourcePrompt

// Request
{
  "image_url": string,      // Scraped image URL
  "prompt": string,         // Animation description
  "negative_prompt": string,
  "resolution": "720p" | "1080p" | "4k",
  "video_length": 5 | 10,   // seconds
  "audio_type": 3           // 3 = no audio (we add voiceover separately)
}

// Response
{
  "_id": string,
  "status": 1 | 2 | 3 | 4,  // 1=queuing, 2=processing, 3=completed, 4=failed
  "video_url": string,      // when status=3
  "deduction_credit": number
}
```

### Credit Budget (600 credits)

| Config | Credits/Scene | 4 Scenes | Videos Possible |
|--------|---------------|----------|-----------------|
| 5s @ 720p | 20 | 80 | 7 |
| 5s @ 1080p | 25 | 100 | 6 |
| 10s @ 720p | 40 | 160 | 3 |

**Recommendation**: 5s @ 720p for POC demo = 7 full video generations

---

## Implementation Order

1. **Create `poc-brands.ts`** - Rich brand context configs (no hardcoded copy)
2. **Update `types.ts`** - Remove stock_video, add Akool fields
3. **Create `image-selector.ts`** - Category-based diversity selection
4. **Update `prompts.ts`** - New LLM prompt with rich context injection
5. **Update `index.ts`** - Integrate new flow
6. **Create `src/lib/akool/client.ts`** - Akool API client
7. **Create API route** - `/api/animate-images`

---

## Expected Output Example (Joe's Pizza)

```json
{
  "scenes": [
    {
      "id": "hook",
      "voiceoverText": "Since 1975, this is real New York pizza.",
      "displayText": "SINCE 1975",
      "duration": 5,
      "visualType": "animated_image",
      "selectedImage": {
        "url": "https://...pepperoni-pizza.jpg",
        "alt": "Pepperoni Pizza",
        "category": "pizzas"
      },
      "akoolConfig": {
        "prompt": "slow zoom in, cheese bubbling slightly, warm lighting, freshly baked",
        "negativePrompt": "blurry, distorted, oversaturated",
        "videoLength": 5,
        "resolution": "720p"
      }
    },
    {
      "id": "value",
      "voiceoverText": "All natural mozzarella, hand-tossed fresh daily.",
      "displayText": "ALL NATURAL",
      "duration": 5,
      "visualType": "animated_image",
      "selectedImage": {
        "url": "https://...caesar-salad.jpg",
        "alt": "Caesar Salad",
        "category": "salads"
      },
      "akoolConfig": {
        "prompt": "gentle camera movement, fresh ingredients glistening, natural light",
        "negativePrompt": "blurry, distorted, text, watermark",
        "videoLength": 5,
        "resolution": "720p"
      }
    },
    {
      "id": "benefit",
      "voiceoverText": "Voted best pizza in New York. Taste why.",
      "displayText": "BEST IN NYC",
      "duration": 5,
      "visualType": "animated_image",
      "selectedImage": {
        "url": "https://...meatballs.jpg",
        "alt": "House-made Meatballs",
        "category": "sides"
      },
      "akoolConfig": {
        "prompt": "slow pan across dish, steam rising, appetizing close-up",
        "negativePrompt": "blurry, distorted, text, watermark",
        "videoLength": 5,
        "resolution": "720p"
      }
    },
    {
      "id": "cta",
      "voiceoverText": "Get your slice today.",
      "displayText": "ORDER NOW",
      "duration": 5,
      "visualType": "logo_brand",
      "contactOverlay": {
        "website": "joespizza.com"
      }
    }
  ],
  "tone": "playful",
  "totalDuration": 20
}
```

This shows diversity: pizza → salad → sides → logo (4 different visual categories).
