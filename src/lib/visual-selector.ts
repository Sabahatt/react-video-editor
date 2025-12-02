/**
 * Visual Selector - CLIP & ViT-GPT2 Integration for Smart Image Selection
 *
 * Used in Step 3 of the video ad pipeline to:
 * - Match images semantically to script text (CLIP)
 * - Classify images into categories
 * - Generate image captions (ViT-GPT2)
 *
 * ALL MODELS RUN LOCALLY via @huggingface/transformers - NO API KEY REQUIRED
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure for first run (downloads models from HuggingFace CDN)
env.allowLocalModels = false;
env.useBrowserCache = false;

// Types
export interface ScoredImage {
  url: string;
  score: number;
  caption?: string;
}

export interface ImageMatchResult {
  url: string;
  score: number;
  label: string;
}

export interface VisualSelectorConfig {
  clipModel?: string;
  hfToken?: string; // Optional: for BLIP via HuggingFace API
}

// Singleton pipeline instances (lazy loaded)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clipPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let captionPipeline: any = null;

const DEFAULT_CONFIG: VisualSelectorConfig = {
  clipModel: 'Xenova/clip-vit-base-patch32',
};

/**
 * Initialize CLIP model for image-text similarity
 */
async function getClipPipeline(config: VisualSelectorConfig = DEFAULT_CONFIG) {
  if (!clipPipeline) {
    console.log('Loading CLIP model (first time will download ~350MB)...');
    clipPipeline = await pipeline(
      'zero-shot-image-classification',
      config.clipModel
    );
    console.log('CLIP model loaded successfully!');
  }
  return clipPipeline;
}

/**
 * Initialize caption model for image-to-text (runs locally)
 */
async function getCaptionPipeline() {
  if (!captionPipeline) {
    console.log('Loading caption model (first time will download ~1GB)...');
    captionPipeline = await pipeline(
      'image-to-text',
      'Xenova/vit-gpt2-image-captioning'
    );
    console.log('Caption model loaded successfully!');
  }
  return captionPipeline;
}

/**
 * Fetch image as blob for local processing
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Find the best matching image for a given text description using CLIP
 *
 * @param imageUrls - Array of image URLs to compare
 * @param text - Text description to match against (e.g., "fresh coffee morning")
 * @param config - Optional model configuration
 * @returns Sorted array of images with similarity scores (highest first)
 *
 * @example
 * const images = ['https://example.com/coffee.jpg', 'https://example.com/tea.jpg'];
 * const results = await findBestMatchingImages(images, 'fresh morning coffee');
 * // results[0] will be the best match
 */
export async function findBestMatchingImages(
  imageUrls: string[],
  text: string,
  config: VisualSelectorConfig = DEFAULT_CONFIG
): Promise<ScoredImage[]> {
  const clip = await getClipPipeline(config);

  const results: ScoredImage[] = [];

  for (const url of imageUrls) {
    try {
      const imageBlob = await fetchImageAsBlob(url);

      // CLIP compares image against candidate labels
      const output = await clip(imageBlob, [text, 'unrelated generic image']);

      // Find score for our target text
      const matchScore = output.find((r: { label: string; score: number }) => r.label === text)?.score ?? 0;

      results.push({
        url,
        score: matchScore,
      });
    } catch (error) {
      console.warn(`Failed to process image ${url}:`, error);
      results.push({ url, score: 0 });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Classify an image against multiple candidate descriptions using CLIP
 *
 * @param imageUrl - URL of the image to classify
 * @param labels - Array of candidate descriptions
 * @returns Array of labels with scores, sorted by relevance
 *
 * @example
 * const results = await classifyImage('https://example.com/product.jpg', [
 *   'product photography',
 *   'lifestyle scene',
 *   'abstract background'
 * ]);
 */
export async function classifyImage(
  imageUrl: string,
  labels: string[],
  config: VisualSelectorConfig = DEFAULT_CONFIG
): Promise<ImageMatchResult[]> {
  const clip = await getClipPipeline(config);

  try {
    const imageBlob = await fetchImageAsBlob(imageUrl);
    const output = await clip(imageBlob, labels);

    return output.map((r: { label: string; score: number }) => ({
      url: imageUrl,
      score: r.score,
      label: r.label,
    })).sort((a: ImageMatchResult, b: ImageMatchResult) => b.score - a.score);
  } catch (error) {
    console.error('Classification failed:', error);
    throw error;
  }
}

/**
 * Generate a caption for an image using local model (ViT-GPT2)
 * Runs locally via @huggingface/transformers - NO API KEY REQUIRED
 *
 * @param imageUrl - URL of the image to caption
 * @returns Generated caption string
 *
 * @example
 * const caption = await generateCaption('https://example.com/product.jpg');
 * // "a cup of coffee on a wooden table"
 */
export async function generateCaption(
  imageUrl: string
): Promise<string> {
  try {
    const captioner = await getCaptionPipeline();
    const imageBlob = await fetchImageAsBlob(imageUrl);

    // Generate caption
    const result = await captioner(imageBlob);

    // Result is an array with generated_text
    if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
      return result[0].generated_text;
    }

    return '[No caption generated]';
  } catch (error) {
    console.error('Caption generation failed:', error);
    return '[Caption generation failed]';
  }
}

/**
 * Validate if an image matches its expected content using CLIP
 *
 * @param imageUrl - URL of the image to validate
 * @param expectedContent - What the image should contain (e.g., "coffee product")
 * @param threshold - Minimum score to consider valid (0-1, default 0.5)
 * @returns Object with validation result and confidence score
 */
export async function validateImageContent(
  imageUrl: string,
  expectedContent: string,
  threshold = 0.5,
  config: VisualSelectorConfig = DEFAULT_CONFIG
): Promise<{
  isValid: boolean;
  score: number;
}> {
  const results = await classifyImage(
    imageUrl,
    [expectedContent, 'unrelated content'],
    config
  );

  const score = results.find(r => r.label === expectedContent)?.score ?? 0;

  return {
    isValid: score >= threshold,
    score,
  };
}

/**
 * Select best images for ad scenes based on script content
 *
 * @param images - Array of candidate image URLs
 * @param scenes - Array of scene objects with text content
 * @returns Map of scene IDs to best matching image URLs
 *
 * @example
 * const scenes = [
 *   { id: 'hook', text: 'Fresh coffee delivered' },
 *   { id: 'product', text: 'Premium arabica beans' },
 *   { id: 'cta', text: 'Order now' }
 * ];
 * const assignments = await assignImagesToScenes(imageUrls, scenes);
 * // { hook: 'url1', product: 'url2', cta: 'url3' }
 */
export async function assignImagesToScenes(
  images: string[],
  scenes: Array<{ id: string; text: string }>,
  config: VisualSelectorConfig = DEFAULT_CONFIG
): Promise<Record<string, string>> {
  const assignments: Record<string, string> = {};
  const usedImages = new Set<string>();

  for (const scene of scenes) {
    // Find best unused image for this scene
    const matches = await findBestMatchingImages(
      images.filter(img => !usedImages.has(img)),
      scene.text,
      config
    );

    if (matches.length > 0 && matches[0].score > 0.3) {
      assignments[scene.id] = matches[0].url;
      usedImages.add(matches[0].url);
    }
  }

  return assignments;
}

/**
 * Preload CLIP model to warm up the cache (call during app init)
 */
export async function preloadModels(config: VisualSelectorConfig = DEFAULT_CONFIG): Promise<void> {
  console.log('Preloading CLIP model...');
  await getClipPipeline(config);
  console.log('CLIP model preloaded and ready');
}

/**
 * Clear model cache (useful for freeing memory)
 */
export function clearModelCache(): void {
  clipPipeline = null;
  captionPipeline = null;
  console.log('Model cache cleared');
}
