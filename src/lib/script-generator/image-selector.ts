/**
 * Image Selector - Ensures diversity in ad visuals
 *
 * Categorizes scraped images by menu type and selects diverse images
 * across categories to avoid showing similar visuals in every scene.
 */

import type { ScrapedImage } from '../scraper/types';
import type { SelectedImage } from './types';

/**
 * Image with category and quality score
 */
export interface CategorizedImage {
  url: string;
  alt: string;
  category: string;
  qualityScore: number;
  width?: number;
  height?: number;
}

/**
 * Result of image categorization
 */
export interface CategorizedImages {
  /** Images grouped by category */
  byCategory: Record<string, CategorizedImage[]>;
  /** All categorized images in a flat array */
  all: CategorizedImage[];
  /** Categories in priority order */
  categoryOrder: string[];
}

/**
 * Keywords that indicate an image is a logo, icon, or decoration (not food)
 */
const LOGO_KEYWORDS = [
  'logo', 'icon', 'badge', 'seal', 'emblem', 'symbol',
  'hogsalt', 'social', 'share', 'wingding', 'decoration'
];

/**
 * URL patterns that indicate a logo or non-food image
 */
const LOGO_URL_PATTERNS = [
  'logo', 'icon', 'badge', 'seal', 'emblem', 'symbol',
  'social', 'share', 'wingding', 'sprite', 'favicon'
];

/**
 * Check if an image is likely a logo or non-food image
 */
function isLikelyLogo(img: ScrapedImage): boolean {
  const urlLower = img.url.toLowerCase();
  const altLower = (img.alt || '').toLowerCase();

  // Check URL patterns
  for (const pattern of LOGO_URL_PATTERNS) {
    if (urlLower.includes(pattern)) {
      return true;
    }
  }

  // Check alt text
  for (const keyword of LOGO_KEYWORDS) {
    if (altLower.includes(keyword)) {
      return true;
    }
  }

  // Check for brand name as sole alt text (likely a logo)
  if (img.alt && img.alt.trim().split(/\s+/).length <= 2) {
    // Very short alt text that's just a brand name is likely a logo
    const shortAlt = altLower.trim();
    if (shortAlt.includes('vault') || shortAlt.includes('pizza') || shortAlt.includes('green')) {
      // Might be a logo if alt is just "Doughnut Vault" or "Joe's Pizza"
      // But we need to check if it's NOT a food item
      if (!/(cheese|pepperoni|salad|donut|bowl|plate|chicken|steak|pizza slice)/.test(shortAlt)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate quality score for an image
 * Higher scores = better quality for video use
 */
export function calculateQualityScore(img: ScrapedImage): number {
  // Logo detection - return -1 to filter out
  if (isLikelyLogo(img)) {
    return -1;
  }

  let score = 0;
  const pixels = (img.width || 0) * (img.height || 0);

  // Size scoring: prefer 400x400+
  if (pixels >= 600 * 600) score += 30;
  else if (pixels >= 400 * 400) score += 20;
  else if (pixels >= 300 * 300) score += 10;
  else if (pixels >= 200 * 200) score += 5;

  // Aspect ratio: prefer landscape (16:9 to 4:3) or square for video
  if (img.width && img.height) {
    const ratio = img.width / img.height;
    if (ratio >= 1.3 && ratio <= 1.9) score += 20; // Landscape
    else if (ratio >= 0.9 && ratio <= 1.1) score += 15; // Square
    else if (ratio >= 0.7 && ratio <= 1.3) score += 10; // Near-square
  }

  // Has descriptive alt text (useful for matching)
  if (img.alt && img.alt.length > 5) {
    score += 10;
    // Bonus for food-related alt text
    const altLower = img.alt.toLowerCase();
    if (/pizza|salad|donut|doughnut|bowl|burger|chicken|steak|fresh|organic|glazed|frosted|chocolate/.test(altLower)) {
      score += 10;
    }
  }

  // Image type bonus
  if (img.type === 'product') score += 25;
  else if (img.type === 'hero') score += 15;
  else if (img.type === 'background') score += 5;

  // Penalize very small images
  if (img.width && img.width < 200) score -= 20;
  if (img.height && img.height < 200) score -= 20;

  return Math.max(0, score);
}

/**
 * Check if an image's alt text matches any keyword from a menu category
 */
function matchesCategory(altText: string, menuItems: string[]): boolean {
  const altLower = altText.toLowerCase();

  for (const item of menuItems) {
    // Split menu item into keywords and check if any match
    const keywords = item.toLowerCase().split(/\s+/);
    for (const keyword of keywords) {
      // Only match keywords with 4+ characters to avoid false positives
      if (keyword.length >= 4 && altLower.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Categorize images by matching alt text to menu category keywords
 */
export function categorizeImages(
  images: ScrapedImage[],
  menuCategories: Record<string, string[]>
): CategorizedImages {
  const byCategory: Record<string, CategorizedImage[]> = {};
  const categoryOrder = Object.keys(menuCategories);

  // Initialize categories
  for (const category of categoryOrder) {
    byCategory[category] = [];
  }
  byCategory['uncategorized'] = [];

  // Categorize each image
  for (const img of images) {
    // Skip images without URLs or very low quality
    if (!img.url || img.url.startsWith('data:')) continue;

    const altText = img.alt || '';
    const qualityScore = calculateQualityScore(img);

    // Skip logos (negative score) and very low quality images
    if (qualityScore < 10) continue;

    let matched = false;

    // Try to match to a category
    for (const [category, menuItems] of Object.entries(menuCategories)) {
      if (matchesCategory(altText, menuItems)) {
        byCategory[category].push({
          url: img.url,
          alt: altText,
          category,
          qualityScore,
          width: img.width,
          height: img.height
        });
        matched = true;
        break; // Only assign to first matching category
      }
    }

    // If no category matched, add to uncategorized if it's a product image
    if (!matched && (img.type === 'product' || img.type === 'hero')) {
      byCategory['uncategorized'].push({
        url: img.url,
        alt: altText,
        category: 'uncategorized',
        qualityScore,
        width: img.width,
        height: img.height
      });
    }
  }

  // Sort each category by quality score (descending)
  for (const category of Object.keys(byCategory)) {
    byCategory[category].sort((a, b) => b.qualityScore - a.qualityScore);
  }

  // Build flat array of all categorized images
  const all = Object.values(byCategory).flat().sort((a, b) => b.qualityScore - a.qualityScore);

  return {
    byCategory,
    all,
    categoryOrder: [...categoryOrder, 'uncategorized']
  };
}

/**
 * Select diverse images for ad scenes
 *
 * PRIORITY: Diversity over LLM request
 * - First tries to pick from unused categories to ensure variety
 * - Only repeats a category when all categories have been used
 *
 * @param categorizedImages - Pre-categorized images
 * @param requestedCategories - Categories requested by LLM (used as hints, not strict)
 * @param sceneCount - Number of scenes needing images (excluding CTA)
 */
export function selectDiverseImages(
  categorizedImages: CategorizedImages,
  requestedCategories: (string | undefined)[],
  sceneCount: number
): SelectedImage[] {
  const selected: SelectedImage[] = [];
  const usedUrls = new Set<string>();
  const usedCategories = new Set<string>();

  // Get categories that have images, sorted by image count (prefer categories with more options)
  const availableCategories = categorizedImages.categoryOrder
    .filter(cat => categorizedImages.byCategory[cat]?.length > 0);

  for (let i = 0; i < sceneCount; i++) {
    const requestedCategory = requestedCategories[i];
    let selectedImage: CategorizedImage | null = null;

    // Strategy 1: DIVERSITY FIRST - try unused categories
    // Only use the requested category if it hasn't been used yet
    if (requestedCategory &&
        !usedCategories.has(requestedCategory) &&
        categorizedImages.byCategory[requestedCategory]?.length > 0) {
      for (const img of categorizedImages.byCategory[requestedCategory]) {
        if (!usedUrls.has(img.url)) {
          selectedImage = img;
          break;
        }
      }
    }

    // Strategy 2: Pick from any unused category (diversity)
    if (!selectedImage) {
      for (const category of availableCategories) {
        if (!usedCategories.has(category)) {
          for (const img of categorizedImages.byCategory[category]) {
            if (!usedUrls.has(img.url)) {
              selectedImage = img;
              break;
            }
          }
          if (selectedImage) break;
        }
      }
    }

    // Strategy 3: Fall back to any remaining high-quality image
    if (!selectedImage) {
      for (const img of categorizedImages.all) {
        if (!usedUrls.has(img.url)) {
          selectedImage = img;
          break;
        }
      }
    }

    // If we found an image, add it to selected
    if (selectedImage) {
      selected.push({
        url: selectedImage.url,
        alt: selectedImage.alt,
        category: selectedImage.category
      });
      usedUrls.add(selectedImage.url);
      usedCategories.add(selectedImage.category);
    }
  }

  return selected;
}

/**
 * Main entry point: Select diverse images for an ad
 *
 * @param scrapedImages - Images from the scraper
 * @param menuCategories - Menu categories from POC brand config
 * @param requestedCategories - Categories requested by LLM for each scene
 * @param sceneCount - Number of scenes needing images (excluding CTA which uses logo)
 */
export function selectImagesForAd(
  scrapedImages: ScrapedImage[],
  menuCategories: Record<string, string[]>,
  requestedCategories: (string | undefined)[],
  sceneCount: number = 3
): SelectedImage[] {
  // Categorize all images
  const categorized = categorizeImages(scrapedImages, menuCategories);

  // Select diverse images
  return selectDiverseImages(categorized, requestedCategories, sceneCount);
}

/**
 * Get a summary of available images by category
 * Useful for debugging and understanding what images are available
 */
export function getImageCategorySummary(
  scrapedImages: ScrapedImage[],
  menuCategories: Record<string, string[]>
): Record<string, number> {
  const categorized = categorizeImages(scrapedImages, menuCategories);

  const summary: Record<string, number> = {};
  for (const [category, images] of Object.entries(categorized.byCategory)) {
    if (images.length > 0) {
      summary[category] = images.length;
    }
  }

  return summary;
}
