/**
 * Smart Akool Prompt Generator
 *
 * Generates cinematic animation prompts for food photography.
 * Detects food type and selects appropriate effects.
 * Ensures variety - same food type gets different effects across scenes.
 */

import type { AkoolAnimationConfig } from './types';

/**
 * Cinematic effects by food category
 * Multiple options per category to ensure variety when same food type appears multiple times
 */
const FOOD_EFFECTS: Record<string, string[]> = {
  pizza: [
    'gooey cheese pull stretching dramatically',
    'melted cheese strings pulling apart slowly',
    'slice lifting with cheese stretching',
    'bubbling cheese with steam rising',
  ],
  salad: [
    'ingredients being tossed in slow motion',
    'leafy greens tumbling gracefully',
    'dressing drizzling over fresh greens',
    'colorful vegetables mixing mid-air',
  ],
  bowl: [
    'toppings cascading in slow motion',
    'ingredients raining down elegantly',
    'sauce drizzling in artistic spiral',
    'grains and veggies settling gently',
  ],
  pastry: [
    'glossy glaze dripping slowly',
    'powdered sugar dusting like snow',
    'sweet coating catching the light',
    'sprinkles falling onto glaze',
  ],
  protein: [
    'juices sizzling on hot surface',
    'steam rising from fresh cut',
    'sauce drizzling over top',
    'edges caramelizing beautifully',
  ],
  bread: [
    'steam escaping from fresh tear',
    'butter melting on warm surface',
    'herbs sprinkling from above',
    'golden crust glistening',
  ],
  vegetable: [
    'steam rising gently',
    'glaze drizzling over roasted edges',
    'herbs sprinkling from above',
    'oil glistening on surface',
  ],
  drink: [
    'ice cubes clinking gently',
    'liquid swirling elegantly',
    'condensation on glass',
    'bubbles rising slowly',
  ],
  default: [
    'appetizing details revealed',
    'textures glistening beautifully',
    'steam wisps rising gently',
    'perfect presentation',
  ],
};

/**
 * Camera movements - varied by scene
 */
const CAMERAS = [
  'dramatic slow zoom in',
  'smooth cinematic pan',
  'elegant tracking shot',
  'graceful orbit around',
];

/**
 * Lighting options
 */
const LIGHTING = {
  hot: 'warm dramatic lighting',
  cold: 'bright fresh lighting',
  baked: 'warm golden backlight',
  neutral: 'soft appetizing glow',
};

/**
 * Detect food category from text
 */
function detectFoodCategory(text: string): string {
  const t = text.toLowerCase();

  if (/pizza|slice|pepperoni|margherita|sicilian/.test(t)) return 'pizza';
  if (/salad|greens|kale|spinach|arugula|caesar|lettuce/.test(t)) return 'salad';
  if (/bowl|harvest|grain|quinoa|rice|poke/.test(t)) return 'bowl';
  if (/doughnut|donut|pastry|croissant|muffin|glazed|old.?fashioned|fritter/.test(t)) return 'pastry';
  if (/chicken|steak|beef|fish|salmon|meatball|pork|shrimp/.test(t)) return 'protein';
  if (/bread|focaccia|baguette|roll|knot|toast/.test(t)) return 'bread';
  if (/potato|vegetable|veggie|roasted|carrot|broccoli/.test(t)) return 'vegetable';
  if (/tea|juice|drink|smoothie|lemonade|water/.test(t)) return 'drink';

  return 'default';
}

/**
 * Detect if food is hot/cold for lighting
 */
function detectTemperature(text: string): 'hot' | 'cold' | 'baked' | 'neutral' {
  const t = text.toLowerCase();

  if (/salad|cold|fresh|raw|greens/.test(t)) return 'cold';
  if (/doughnut|donut|pastry|bread|baked|glazed/.test(t)) return 'baked';
  if (/hot|warm|roasted|grilled|sizzling|steaming|pizza|meatball/.test(t)) return 'hot';

  return 'neutral';
}

/**
 * Generate Akool animation prompt
 * Uses sceneIndex to ensure variety when same food type appears multiple times
 */
export function generateAkoolPrompt(
  altText: string,
  category?: string,
  sceneId?: string
): AkoolAnimationConfig {
  const text = `${altText} ${category || ''}`;

  // Get scene index for variety
  const sceneIndex = sceneId
    ? ['hook', 'value', 'benefit', 'extra', 'cta'].indexOf(sceneId)
    : 0;
  const idx = Math.max(0, sceneIndex);

  // Detect food category
  const foodCategory = detectFoodCategory(text);
  const effects = FOOD_EFFECTS[foodCategory] || FOOD_EFFECTS.default;

  // Select effect based on scene index (ensures variety)
  const effect = effects[idx % effects.length];

  // Camera movement varies by scene
  const camera = CAMERAS[idx % CAMERAS.length];

  // Lighting based on temperature
  const temp = detectTemperature(text);
  const lighting = LIGHTING[temp];

  return {
    prompt: `${camera}, ${effect}, ${lighting}`,
    negativePrompt: 'blurry, distorted, oversaturated, cartoon, illustration, text overlay, static, boring, flat lighting',
    videoLength: 5,
    resolution: '720p',
  };
}

/**
 * Generate prompts for multiple scenes with their selected images
 */
export function generateAkoolPromptsForScenes(
  scenes: Array<{
    sceneId: string;
    selectedImage?: {
      alt: string;
      category?: string;
    } | null;
  }>
): Map<string, AkoolAnimationConfig> {
  const prompts = new Map<string, AkoolAnimationConfig>();

  for (const scene of scenes) {
    if (scene.selectedImage) {
      const config = generateAkoolPrompt(
        scene.selectedImage.alt,
        scene.selectedImage.category,
        scene.sceneId
      );
      prompts.set(scene.sceneId, config);
    }
  }

  return prompts;
}

/**
 * Default config when no image context available
 */
export const DEFAULT_AKOOL_CONFIG: AkoolAnimationConfig = {
  prompt: 'slow zoom in, gentle motion, appetizing food photography, soft lighting',
  negativePrompt: 'blurry, distorted, oversaturated, cartoon, illustration',
  videoLength: 5,
  resolution: '720p',
};
