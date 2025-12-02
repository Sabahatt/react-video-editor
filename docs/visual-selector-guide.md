# Visual Selector (CLIP + ViT-GPT2) Integration Guide

## How It Works

The visual selector uses two AI models that run **100% locally** - no API keys required:

1. **CLIP** (Contrastive Language-Image Pre-training) - for image-text matching
2. **ViT-GPT2** - for generating image captions

### The Magic Behind CLIP

1. **Text Encoder**: Converts text like "fresh coffee morning" into a numerical vector (embedding)
2. **Image Encoder**: Converts an image into a numerical vector (embedding)
3. **Similarity Score**: Compares how "close" these vectors are in semantic space

This means it understands concepts, not just keywords. "Fresh morning coffee" will match a coffee cup image even if the image has no text on it.

### Image Captioning with ViT-GPT2

The captioning model generates natural language descriptions of images:
- Input: Any image URL
- Output: Text description like "a person holding a cup of coffee"

---

## Quick Testing

### Modify the Test File

Edit `scripts/test-visual-selector.ts` with your own images:

```typescript
const TEST_IMAGES = {
  // Add your own images (URLs or local paths)
  myProduct: 'https://your-site.com/product.jpg',
  hero: 'https://your-site.com/hero-image.jpg',
  // Or use local files:
  local: 'file:///C:/path/to/image.jpg',
};
```

Then run:
```bash
npx tsx scripts/test-visual-selector.ts
```

### Quick One-Off Test

Create a simple test file `scripts/quick-test.ts`:

```typescript
import { classifyImage, findBestMatchingImages } from '../src/lib/visual-selector';

async function test() {
  // Test 1: What category does this image belong to?
  const result = await classifyImage(
    'https://your-image-url.jpg',
    ['product photo', 'lifestyle scene', 'abstract background', 'food and drink']
  );
  console.log('Categories:', result);

  // Test 2: Which image best matches this description?
  const images = [
    'https://image1.jpg',
    'https://image2.jpg',
    'https://image3.jpg',
  ];
  const matches = await findBestMatchingImages(images, 'professional business meeting');
  console.log('Best match:', matches[0]);
}

test();
```

Run with: `npx tsx scripts/quick-test.ts`

---

## Integration with Your Ad Pipeline

### Step 1: Import the Functions

```typescript
// In your API route or service file
import {
  findBestMatchingImages,
  classifyImage,
  assignImagesToScenes,
  preloadModels,
} from '@/lib/visual-selector';
```

### Step 2: Preload on App Start (Optional but Recommended)

In your `app/layout.tsx` or a startup script:

```typescript
// Preload during server startup for faster first requests
if (typeof window === 'undefined') {
  preloadModels().catch(console.error);
}
```

### Step 3: Use in Your Generate Pipeline

```typescript
// app/api/generate/route.ts

import { assignImagesToScenes } from '@/lib/visual-selector';

export async function POST(request: Request) {
  const { url, tone } = await request.json();

  // Step 1: Scrape website (you already have this)
  const scrapedData = await scrapeWebsite(url);
  // scrapedData.images = ['url1', 'url2', 'url3', ...]

  // Step 2: Generate script (you already have this)
  const script = await generateScript(scrapedData, tone);
  // script.scenes = [{ id: 'hook', voiceoverText: '...' }, ...]

  // Step 3: Smart image selection with CLIP
  const scenes = script.scenes.map(scene => ({
    id: scene.id,
    text: scene.voiceoverText, // or scene.displayText
  }));

  const imageAssignments = await assignImagesToScenes(
    scrapedData.images,
    scenes
  );
  // Returns: { hook: 'url2', product: 'url1', cta: 'url3' }

  // Step 4: Build timeline with assigned images
  const timeline = buildTimeline(script, imageAssignments);

  return Response.json({ timeline });
}
```

### Step 4: Alternative - Manual Control

If you want more control over the selection:

```typescript
import { findBestMatchingImages, classifyImage } from '@/lib/visual-selector';

async function selectImagesForAd(images: string[], script: Script) {
  const selections: Record<string, string> = {};

  // For the hook scene, find image matching the hook text
  const hookMatches = await findBestMatchingImages(
    images,
    script.scenes[0].voiceoverText
  );

  if (hookMatches[0].score > 0.5) {
    selections.hook = hookMatches[0].url;
  }

  // For product scene, find a "product photo" style image
  const productImages = await Promise.all(
    images.map(async (url) => {
      const classification = await classifyImage(url, [
        'product photography',
        'lifestyle scene',
        'abstract background',
      ]);
      return { url, isProduct: classification[0].label === 'product photography' };
    })
  );

  const bestProduct = productImages.find(img => img.isProduct);
  if (bestProduct) {
    selections.product = bestProduct.url;
  }

  return selections;
}
```

---

## API Reference

### `findBestMatchingImages(imageUrls, text)`

Find which images best match a text description.

```typescript
const results = await findBestMatchingImages(
  ['url1', 'url2', 'url3'],
  'fresh coffee in the morning'
);
// Returns: [{ url: 'url1', score: 0.92 }, { url: 'url2', score: 0.45 }, ...]
// Sorted by score (highest first)
```

### `classifyImage(imageUrl, labels)`

Classify an image against multiple categories.

```typescript
const results = await classifyImage(
  'https://example.com/image.jpg',
  ['product photo', 'lifestyle', 'abstract', 'food']
);
// Returns: [
//   { label: 'food', score: 0.85, url: '...' },
//   { label: 'lifestyle', score: 0.10, url: '...' },
//   ...
// ]
```

### `validateImageContent(imageUrl, expected, threshold?)`

Check if an image matches expected content.

```typescript
const result = await validateImageContent(
  'https://example.com/coffee.jpg',
  'coffee beverage',
  0.5  // threshold (default 0.5)
);
// Returns: { isValid: true, score: 0.92 }
```

### `assignImagesToScenes(images, scenes)`

Automatically assign images to ad scenes.

```typescript
const assignments = await assignImagesToScenes(
  ['url1', 'url2', 'url3', 'url4'],
  [
    { id: 'hook', text: 'Start your day right' },
    { id: 'product', text: 'Premium coffee beans' },
    { id: 'cta', text: 'Order now' },
  ]
);
// Returns: { hook: 'url2', product: 'url1', cta: 'url4' }
// Each image is used only once
```

### `preloadModels()`

Preload the CLIP model (call during app initialization).

```typescript
await preloadModels();
// Model is now cached in memory, subsequent calls are instant
```

### `clearModelCache()`

Free memory by unloading the model.

```typescript
clearModelCache();
// Model will be reloaded on next use
```

---

## Performance Tips

1. **First run is slow**: Model download (~350MB) + loading takes 1-7 minutes
2. **Subsequent runs are fast**: Model is cached, ~1-2 sec per image
3. **Preload on startup**: Call `preloadModels()` during app init
4. **Batch processing**: Process multiple images in parallel where possible

```typescript
// Process images in parallel
const results = await Promise.all(
  images.map(url => classifyImage(url, labels))
);
```

---

## Image Captioning

Image captioning runs locally - no API key needed!

```typescript
import { generateCaption } from '@/lib/visual-selector';

const caption = await generateCaption('https://example.com/image.jpg');
// Returns: "a cup of coffee on a wooden table"
```

First run downloads the ViT-GPT2 model (~500MB), subsequent runs are instant.

---

## Troubleshooting

### "Model loading is slow"
- First run downloads ~350MB. This is normal.
- After first run, model is cached locally.

### "Out of memory"
- CLIP model uses ~500MB RAM
- Call `clearModelCache()` when not needed
- Consider running on a server with more RAM

### "Score seems wrong"
- CLIP understands concepts, not exact matches
- Try more descriptive text: "professional coffee cup photo" vs just "coffee"
- Scores are relative - compare between images, not absolute values

---

## File Locations

```
src/lib/visual-selector.ts    # Main library
scripts/test-visual-selector.ts  # Test script
docs/visual-selector-guide.md    # This guide
```
