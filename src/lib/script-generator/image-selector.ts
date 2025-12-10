/**
 * Image Selector - Ensures diversity in ad visuals
 *
 * POC Plan Requirements:
 * - Animated scenes should get main dish first (pizza for Joe's, salad for Sweetgreen, doughnut for Vault)
 * - Static scenes get supporting products, sides, extras
 * - Ensure diversity across categories
 * - Quality ranking by size, aspect ratio, and metadata
 */

import type { ScrapedImage } from '../scraper/types';
import type { SelectedImage } from './types';
import type { ScenePlan, PlannedScene } from './scene-planner';

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
  /** Detected food type for main dish prioritization */
  foodType?: string;
  /** Product description from products.json (used for Akool prompt generation) */
  productDescription?: string;
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
  /** Images grouped by food type */
  byFoodType: Record<string, CategorizedImage[]>;
}

/**
 * Main dish type by brand
 */
export type MainDishType = 'pizza' | 'salad' | 'doughnut';

/**
 * Extended selection result with scene plan info
 */
export interface SelectedImageWithMode extends SelectedImage {
  /** Whether this image is for an animated or static scene */
  visualMode: 'animated' | 'static';
  /** Food type detected from alt text */
  foodType?: string;
  /** Product description (from alt text) */
  productDescription?: string;
}

/**
 * Pick randomly from top N images for variety while maintaining quality
 * @param images Array of images (already sorted by quality)
 * @param topN Number of top images to consider (default 3)
 * @returns Random image from top N, or first if array is small
 */
function pickRandomFromTop<T>(images: T[], topN: number = 3): T | null {
  if (images.length === 0) return null;
  const maxIndex = Math.min(topN, images.length);
  const randomIndex = Math.floor(Math.random() * maxIndex);
  return images[randomIndex];
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
 * Detect food type from name/description
 * Used for main dish prioritization
 */
export function detectFoodType(name: string, description?: string): string {
  const text = `${name} ${description || ''}`.toLowerCase();

  if (/pizza|slice|margherita|pepperoni|sicilian/.test(text)) return 'pizza';
  if (/salad|greens|kale|caesar|arugula/.test(text)) return 'salad';
  if (/bowl|harvest|grain|quinoa|rice/.test(text)) return 'bowl';
  if (/doughnut|donut|old.?fashioned|glazed|fritter/.test(text)) return 'doughnut';
  if (/pastry|croissant|muffin/.test(text)) return 'pastry';
  if (/bread|focaccia|baguette/.test(text)) return 'bread';
  if (/potato|fries|sides|meatball/.test(text)) return 'sides';
  if (/chicken|steak|salmon|fish/.test(text)) return 'protein';

  return 'unknown';
}

/**
 * Score image for main dish suitability
 * Higher scores = better for animated scenes
 */
function scoreForMainDish(img: CategorizedImage, mainDishType: MainDishType): number {
  let score = img.qualityScore;

  // Boost main dish type significantly
  if (img.foodType === mainDishType) {
    score += 50;
  } else if (mainDishType === 'salad' && img.foodType === 'bowl') {
    // Bowls are also good for Sweetgreen
    score += 40;
  } else if (mainDishType === 'doughnut' && img.foodType === 'pastry') {
    // Pastries are similar to doughnuts
    score += 30;
  }

  return score;
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
 * Also detects food type for main dish prioritization
 */
export function categorizeImages(
  images: ScrapedImage[],
  menuCategories: Record<string, string[]>
): CategorizedImages {
  const byCategory: Record<string, CategorizedImage[]> = {};
  const byFoodType: Record<string, CategorizedImage[]> = {};
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

    // Use foodType from products.json if available, otherwise detect from alt text
    // This allows curated POC data to have accurate food types
    const foodType = (img as { foodType?: string }).foodType || detectFoodType(altText);

    // Get productDescription from products.json if available
    const productDescription = (img as { productDescription?: string }).productDescription;

    let matched = false;

    // Try to match to a category
    for (const [category, menuItems] of Object.entries(menuCategories)) {
      if (matchesCategory(altText, menuItems)) {
        const categorizedImg: CategorizedImage = {
          url: img.url,
          alt: altText,
          category,
          qualityScore,
          width: img.width,
          height: img.height,
          foodType,
          productDescription,
        };
        byCategory[category].push(categorizedImg);

        // Also add to byFoodType
        if (!byFoodType[foodType]) {
          byFoodType[foodType] = [];
        }
        byFoodType[foodType].push(categorizedImg);

        matched = true;
        break; // Only assign to first matching category
      }
    }

    // If no category matched, add to uncategorized if it's a product image
    if (!matched && (img.type === 'product' || img.type === 'hero')) {
      const categorizedImg: CategorizedImage = {
        url: img.url,
        alt: altText,
        category: 'uncategorized',
        qualityScore,
        width: img.width,
        height: img.height,
        foodType,
        productDescription,
      };
      byCategory['uncategorized'].push(categorizedImg);

      // Also add to byFoodType
      if (!byFoodType[foodType]) {
        byFoodType[foodType] = [];
      }
      byFoodType[foodType].push(categorizedImg);
    }
  }

  // Sort each category by quality score (descending)
  for (const category of Object.keys(byCategory)) {
    byCategory[category].sort((a, b) => b.qualityScore - a.qualityScore);
  }

  // Sort each food type by quality score (descending)
  for (const foodType of Object.keys(byFoodType)) {
    byFoodType[foodType].sort((a, b) => b.qualityScore - a.qualityScore);
  }

  // Build flat array of all categorized images
  const all = Object.values(byCategory).flat().sort((a, b) => b.qualityScore - a.qualityScore);

  return {
    byCategory,
    all,
    categoryOrder: [...categoryOrder, 'uncategorized'],
    byFoodType
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

/**
 * Select images based on scene plan with main dish prioritization
 *
 * POC Plan Requirements:
 * - HOOK: ALWAYS gets main dish (it's the attention grabber with USP)
 * - Animated body scenes: Get main dish next (for animation quality)
 * - Static body scenes: Get supporting products, sides, extras
 * - Ensure diversity across all scenes
 *
 * @param categorizedImages - Pre-categorized images
 * @param scenePlan - Scene plan with animated/static assignments
 * @param mainDishType - Main dish type for this brand
 */
export function selectImagesForScenePlan(
  categorizedImages: CategorizedImages,
  scenePlan: ScenePlan,
  mainDishType?: MainDishType
): SelectedImageWithMode[] {
  const selected: SelectedImageWithMode[] = [];
  const usedUrls = new Set<string>();

  // Separate scenes by type (excluding CTA)
  const hookScene = scenePlan.scenes.find(s => s.sceneId === 'hook');
  const animatedScenes = scenePlan.scenes.filter(
    s => s.visualMode === 'animated' && s.sceneId !== 'cta' && s.sceneId !== 'hook'
  );
  const staticBodyScenes = scenePlan.scenes.filter(
    s => s.visualMode === 'static' && s.sceneId !== 'cta' && s.sceneId !== 'hook'
  );

  // FIRST: Select image for HOOK (ALWAYS main dish - it's the attention grabber)
  if (hookScene) {
    let selectedImage: CategorizedImage | null = null;

    // Strategy 1: Get a top main dish image for hook (random from top 3)
    if (mainDishType && categorizedImages.byFoodType[mainDishType]) {
      const mainDishImages = categorizedImages.byFoodType[mainDishType];
      if (mainDishImages.length > 0) {
        selectedImage = pickRandomFromTop(mainDishImages, 3);
      }
    }

    // Strategy 2: Try the first category (usually main products)
    if (!selectedImage) {
      const firstCategory = categorizedImages.categoryOrder[0];
      if (firstCategory && categorizedImages.byCategory[firstCategory]?.length > 0) {
        selectedImage = pickRandomFromTop(categorizedImages.byCategory[firstCategory], 3);
      }
    }

    // Strategy 3: Fall back to best overall image
    if (!selectedImage && categorizedImages.all.length > 0) {
      selectedImage = pickRandomFromTop(categorizedImages.all, 3);
    }

    if (selectedImage) {
      selected.push({
        url: selectedImage.url,
        alt: selectedImage.alt,
        category: selectedImage.category,
        visualMode: 'static', // Hook is always static
        foodType: selectedImage.foodType,
        productDescription: selectedImage.productDescription || selectedImage.alt,
      });
      usedUrls.add(selectedImage.url);
    }
  }

  // SECOND: Select images for ANIMATED scenes (prioritize main dish)
  for (const scene of animatedScenes) {
    let selectedImage: CategorizedImage | null = null;

    // Strategy 1: Try to get main dish type first for animated scenes (random from top 4 unused)
    if (mainDishType && categorizedImages.byFoodType[mainDishType]) {
      const unusedMainDish = categorizedImages.byFoodType[mainDishType].filter(img => !usedUrls.has(img.url));
      if (unusedMainDish.length > 0) {
        selectedImage = pickRandomFromTop(unusedMainDish, 4);
      }
    }

    // Strategy 2: Try the requested category (random from top 4 unused)
    if (!selectedImage && scene.visualCategory) {
      const categoryImages = categorizedImages.byCategory[scene.visualCategory];
      if (categoryImages) {
        // Sort by main dish score if we have a main dish type
        const sorted = mainDishType
          ? [...categoryImages].sort((a, b) => scoreForMainDish(b, mainDishType) - scoreForMainDish(a, mainDishType))
          : categoryImages;

        const unused = sorted.filter(img => !usedUrls.has(img.url));
        if (unused.length > 0) {
          selectedImage = pickRandomFromTop(unused, 4);
        }
      }
    }

    // Strategy 3: Fall back to any high-quality image (random from top 4 unused)
    if (!selectedImage) {
      const unusedAll = categorizedImages.all.filter(img => !usedUrls.has(img.url));
      if (unusedAll.length > 0) {
        selectedImage = pickRandomFromTop(unusedAll, 4);
      }
    }

    if (selectedImage) {
      selected.push({
        url: selectedImage.url,
        alt: selectedImage.alt,
        category: selectedImage.category,
        visualMode: 'animated',
        foodType: selectedImage.foodType,
        // Use actual productDescription from products.json if available
        productDescription: selectedImage.productDescription || selectedImage.alt,
      });
      usedUrls.add(selectedImage.url);
    }
  }

  // THIRD: Select images for STATIC BODY scenes (supporting items, not hook)
  for (const scene of staticBodyScenes) {
    let selectedImage: CategorizedImage | null = null;

    // Strategy 1: Try the requested category (prefer non-main-dish items, random from top 4)
    if (scene.visualCategory) {
      const categoryImages = categorizedImages.byCategory[scene.visualCategory];
      if (categoryImages) {
        // For static scenes, prefer NON-main-dish items (sides, extras)
        const sorted = mainDishType
          ? [...categoryImages].sort((a, b) => {
              // Lower score for main dish in static scenes
              const aIsMainDish = a.foodType === mainDishType ? -20 : 0;
              const bIsMainDish = b.foodType === mainDishType ? -20 : 0;
              return (b.qualityScore + bIsMainDish) - (a.qualityScore + aIsMainDish);
            })
          : categoryImages;

        const unused = sorted.filter(img => !usedUrls.has(img.url));
        if (unused.length > 0) {
          selectedImage = pickRandomFromTop(unused, 4);
        }
      }
    }

    // Strategy 2: Try sides/supporting categories (random from top 4 unused)
    if (!selectedImage) {
      const supportingCategories = ['sides', 'bread', 'sides', 'uncategorized'];
      // Gather all unused images from supporting categories
      const supportingImages: CategorizedImage[] = [];
      for (const cat of supportingCategories) {
        const categoryImages = categorizedImages.byCategory[cat];
        if (categoryImages) {
          supportingImages.push(...categoryImages.filter(img => !usedUrls.has(img.url)));
        }
      }
      if (supportingImages.length > 0) {
        selectedImage = pickRandomFromTop(supportingImages, 4);
      }
    }

    // Strategy 3: Fall back to any remaining high-quality image (random from top 4)
    if (!selectedImage) {
      const unusedAll = categorizedImages.all.filter(img => !usedUrls.has(img.url));
      if (unusedAll.length > 0) {
        selectedImage = pickRandomFromTop(unusedAll, 4);
      }
    }

    if (selectedImage) {
      selected.push({
        url: selectedImage.url,
        alt: selectedImage.alt,
        category: selectedImage.category,
        visualMode: 'static',
        foodType: selectedImage.foodType,
        // Use actual productDescription from products.json if available
        productDescription: selectedImage.productDescription || selectedImage.alt,
      });
      usedUrls.add(selectedImage.url);
    }
  }

  // Re-order selected images to match scene order
  // We selected: hook first, then animated, then static body
  // Now we need to arrange them in scene order: hook, body1, body2, body3, body4

  // Get hook image (first static, which is hook)
  const hookImage = selected.find(s => s.visualMode === 'static' && selected.indexOf(s) === 0);

  // Get animated images
  const animatedImages = selected.filter(s => s.visualMode === 'animated');

  // Get static body images (all static except hook)
  const staticBodyImages = selected.filter(s => s.visualMode === 'static' && s !== hookImage);

  const orderedSelected: SelectedImageWithMode[] = [];
  let animIdx = 0;
  let staticBodyIdx = 0;

  for (const scene of scenePlan.scenes) {
    if (scene.sceneId === 'cta') continue;

    if (scene.sceneId === 'hook') {
      // Hook gets the main dish image we selected first
      if (hookImage) {
        orderedSelected.push(hookImage);
      }
    } else if (scene.visualMode === 'animated' && animIdx < animatedImages.length) {
      orderedSelected.push(animatedImages[animIdx++]);
    } else if (scene.visualMode === 'static' && staticBodyIdx < staticBodyImages.length) {
      orderedSelected.push(staticBodyImages[staticBodyIdx++]);
    }
  }

  return orderedSelected;
}

/**
 * Get main dish type from brand name
 */
export function getMainDishType(brandName: string): MainDishType | undefined {
  const name = brandName.toLowerCase();

  if (name.includes('pizza') || name.includes("joe's")) {
    return 'pizza';
  }
  if (name.includes('sweetgreen') || name.includes('salad')) {
    return 'salad';
  }
  if (name.includes('doughnut') || name.includes('donut') || name.includes('vault')) {
    return 'doughnut';
  }

  return undefined;
}
