/**
 * Scene Planner - Manages animated vs static scene assignment
 *
 * POC Plan Requirements:
 * - Intro: Always STATIC (USP text is focus, collage/Ken Burns for visual interest)
 * - Body: Exactly 2 ANIMATED + 2 STATIC scenes
 * - CTA: Static with logo animation only
 * - Animated scenes prioritize main dish (pizza for Joe's, salad for Sweetgreen, doughnut for Vault)
 * - Scene order varies between ad generations using pattern variation
 */

import type { POCBrandConfig } from './poc-brands';

/**
 * Scene visual mode - animated (Akool) or static (Ken Burns)
 */
export type SceneVisualMode = 'animated' | 'static';

/**
 * Body scene pattern - defines which body scenes are animated vs static
 * Each pattern has exactly 2 animated and 2 static scenes
 */
export interface BodyScenePattern {
  body1: SceneVisualMode;
  body2: SceneVisualMode;
  body3: SceneVisualMode;
  body4: SceneVisualMode;
}

/**
 * 5 pattern variations for 4 body scenes (2 animated + 2 static)
 * Ensures variety in ad flow between generations
 */
export const BODY_SCENE_PATTERNS: BodyScenePattern[] = [
  // Pattern A: Animated early in body
  { body1: 'animated', body2: 'static', body3: 'animated', body4: 'static' },
  // Pattern B: Animated spread out
  { body1: 'animated', body2: 'static', body3: 'static', body4: 'animated' },
  // Pattern C: Animated in middle
  { body1: 'static', body2: 'animated', body3: 'animated', body4: 'static' },
  // Pattern D: Animated later in body
  { body1: 'static', body2: 'animated', body3: 'static', body4: 'animated' },
  // Pattern E: Back-to-back animated then static
  { body1: 'static', body2: 'static', body3: 'animated', body4: 'animated' },
];

/**
 * Pattern variations for 3 body scenes (2 animated + 1 static)
 * Used when LLM generates 5 scenes (hook + 3 body + cta) instead of 6
 */
const THREE_BODY_PATTERNS: { body1: SceneVisualMode; body2: SceneVisualMode; body3: SceneVisualMode }[] = [
  // Pattern A: Animated first and last
  { body1: 'animated', body2: 'static', body3: 'animated' },
  // Pattern B: Animated first two
  { body1: 'animated', body2: 'animated', body3: 'static' },
  // Pattern C: Animated last two
  { body1: 'static', body2: 'animated', body3: 'animated' },
];

/**
 * Planned scene with visual mode assignment
 */
export interface PlannedScene {
  /** Scene ID from script */
  sceneId: string;
  /** Index in the scene array (0-based) */
  sceneIndex: number;
  /** Whether this scene should be animated or static */
  visualMode: SceneVisualMode;
  /** Food category to use for image selection */
  visualCategory?: string;
  /** Whether this is a main dish (should be prioritized for animated scenes) */
  isMainDish: boolean;
  /** Ken Burns direction for static scenes */
  kenBurnsDirection?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
}

/**
 * Full scene plan for an ad
 */
export interface ScenePlan {
  /** Pattern index used (0-4) */
  patternIndex: number;
  /** All planned scenes */
  scenes: PlannedScene[];
  /** Count of animated scenes (should be 2 for body) */
  animatedCount: number;
  /** Count of static scenes (should be 2 for body + 1 intro) */
  staticCount: number;
}

/**
 * Ken Burns direction patterns - varied to avoid monotony
 */
const KEN_BURNS_PATTERNS = [
  ['zoom-in', 'pan-right', 'zoom-out', 'pan-left'],
  ['pan-left', 'zoom-in', 'pan-right', 'zoom-out'],
  ['zoom-out', 'pan-left', 'zoom-in', 'pan-right'],
] as const;

/**
 * Main dish types by POC brand
 */
const MAIN_DISH_TYPES: Record<string, string> = {
  "Joe's Pizza": 'pizza',
  'Sweetgreen': 'salad',
  'Doughnut Vault': 'doughnut',
  'The Doughnut Vault': 'doughnut',
};

/**
 * Detect if a category represents the main dish for a brand
 */
function isMainDishCategory(category: string, brandName: string): boolean {
  const mainDishType = MAIN_DISH_TYPES[brandName];
  if (!mainDishType) return false;

  const categoryLower = category.toLowerCase();

  switch (mainDishType) {
    case 'pizza':
      return categoryLower.includes('pizza') || categoryLower === 'pizzas';
    case 'salad':
      return categoryLower.includes('salad') || categoryLower.includes('bowl');
    case 'doughnut':
      return (
        categoryLower.includes('doughnut') ||
        categoryLower.includes('donut') ||
        categoryLower.includes('glazed') ||
        categoryLower.includes('oldfashioned') ||
        categoryLower === 'specialty'
      );
    default:
      return false;
  }
}

/**
 * Get Ken Burns direction for a static scene
 */
function getKenBurnsDirection(
  sceneIndex: number,
  patternIndex: number
): PlannedScene['kenBurnsDirection'] {
  const pattern = KEN_BURNS_PATTERNS[patternIndex % KEN_BURNS_PATTERNS.length];
  return pattern[sceneIndex % pattern.length];
}

/**
 * Select a random pattern index
 */
export function selectRandomPattern(): number {
  return Math.floor(Math.random() * BODY_SCENE_PATTERNS.length);
}

/**
 * Plan scenes for an ad with animated/static assignments
 *
 * Ad Structure:
 * - Scene 0 (Intro/Hook): Always STATIC
 * - Scenes 1-4 (Body): 2 animated + 2 static based on pattern
 * - Scene 5 (CTA): Always STATIC (logo_brand)
 *
 * @param scriptScenes - Scenes from the generated script
 * @param pocBrand - POC brand config (for main dish detection)
 * @param patternIndex - Pattern to use (0-4), random if not provided
 */
export function planScenes(
  scriptScenes: Array<{
    id: string;
    visualCategory?: string;
    visualType?: string;
  }>,
  pocBrand?: POCBrandConfig | null,
  patternIndex?: number
): ScenePlan {
  // Select pattern
  const selectedPatternIndex = patternIndex ?? selectRandomPattern();
  const pattern = BODY_SCENE_PATTERNS[selectedPatternIndex];

  const brandName = pocBrand?.brandName || '';
  const plannedScenes: PlannedScene[] = [];

  // Track counts
  let animatedCount = 0;
  let staticCount = 0;
  let staticSceneIndex = 0; // For Ken Burns direction variation

  for (let i = 0; i < scriptScenes.length; i++) {
    const scene = scriptScenes[i];
    const category = scene.visualCategory || '';

    let visualMode: SceneVisualMode;
    let kenBurnsDirection: PlannedScene['kenBurnsDirection'] | undefined;
    let isMainDish = false;

    // Determine visual mode based on scene position
    if (scene.id === 'cta' || scene.visualType === 'logo_brand') {
      // CTA is always handled separately (logo_brand)
      visualMode = 'static';
      staticCount++;
      // CTA never gets main dish
      isMainDish = false;
    } else if (scene.id === 'hook') {
      // Intro/Hook is always static (USP text is the focus)
      visualMode = 'static';
      kenBurnsDirection = getKenBurnsDirection(staticSceneIndex++, selectedPatternIndex);
      staticCount++;
      // Hook is always static, so main dish detection doesn't apply
      isMainDish = false;
    } else if (scene.id.startsWith('body')) {
      // Body scenes (body1, body2, body3, body4) - use pattern
      // Extract body number from id (e.g., "body1" -> 1)
      const bodyNum = parseInt(scene.id.replace('body', ''), 10);
      const bodyKey = `body${bodyNum}` as keyof BodyScenePattern;

      if (bodyKey in pattern) {
        visualMode = pattern[bodyKey];
      } else {
        // Fallback for scenes beyond body4
        visualMode = 'static';
      }

      if (visualMode === 'animated') {
        animatedCount++;
        // Animated body scenes CAN get main dish priority
        // The image selector will prioritize main dish images for these
        isMainDish = isMainDishCategory(category, brandName);
      } else {
        kenBurnsDirection = getKenBurnsDirection(staticSceneIndex++, selectedPatternIndex);
        staticCount++;
        // Static body scenes should NOT get main dish priority
        // (main dish should go to animated scenes)
        isMainDish = false;
      }
    } else {
      // Legacy scene IDs (value, benefit, extra) - map to body positions
      const legacyOrder = ['value', 'benefit', 'extra'];
      const legacyIndex = legacyOrder.indexOf(scene.id);
      const bodyNum = legacyIndex >= 0 ? legacyIndex + 1 : i;
      const bodyKey = `body${bodyNum}` as keyof BodyScenePattern;

      if (bodyKey in pattern) {
        visualMode = pattern[bodyKey];
      } else {
        visualMode = 'static';
      }

      if (visualMode === 'animated') {
        animatedCount++;
        isMainDish = isMainDishCategory(category, brandName);
      } else {
        kenBurnsDirection = getKenBurnsDirection(staticSceneIndex++, selectedPatternIndex);
        staticCount++;
        isMainDish = false;
      }
    }

    plannedScenes.push({
      sceneId: scene.id,
      sceneIndex: i,
      visualMode,
      visualCategory: category,
      isMainDish,
      kenBurnsDirection,
    });
  }

  return {
    patternIndex: selectedPatternIndex,
    scenes: plannedScenes,
    animatedCount,
    staticCount,
  };
}

/**
 * Get animated scene indices from a plan
 * Used to determine which scenes need Akool animation
 */
export function getAnimatedSceneIndices(plan: ScenePlan): number[] {
  return plan.scenes
    .filter(s => s.visualMode === 'animated')
    .map(s => s.sceneIndex);
}

/**
 * Get static scene indices from a plan (excluding CTA)
 * Used to determine which scenes need Ken Burns effect
 */
export function getStaticSceneIndices(plan: ScenePlan): number[] {
  return plan.scenes
    .filter(s => s.visualMode === 'static' && s.sceneId !== 'cta')
    .map(s => s.sceneIndex);
}

/**
 * Check if a scene at given index should be animated
 */
export function isAnimatedScene(plan: ScenePlan, sceneIndex: number): boolean {
  const scene = plan.scenes.find(s => s.sceneIndex === sceneIndex);
  return scene?.visualMode === 'animated';
}

/**
 * Get the Ken Burns direction for a static scene
 */
export function getSceneKenBurnsDirection(
  plan: ScenePlan,
  sceneIndex: number
): PlannedScene['kenBurnsDirection'] | undefined {
  const scene = plan.scenes.find(s => s.sceneIndex === sceneIndex);
  return scene?.kenBurnsDirection;
}

/**
 * Reorder scenes to prioritize main dish for animated scenes
 * Returns indices of scenes that should be animated, prioritizing main dish
 */
export function prioritizeMainDishForAnimation(plan: ScenePlan): PlannedScene[] {
  const animated = plan.scenes.filter(s => s.visualMode === 'animated');
  const mainDishAnimated = animated.filter(s => s.isMainDish);
  const nonMainDishAnimated = animated.filter(s => !s.isMainDish);

  // Main dish scenes should be first among animated scenes
  return [...mainDishAnimated, ...nonMainDishAnimated];
}
