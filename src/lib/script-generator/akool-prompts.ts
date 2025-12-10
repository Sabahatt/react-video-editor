/**
 * POC-Specific Akool Prompt Generator
 *
 * Based on POC Plan Requirements:
 * - Describe camera/viewer actions, NOT impossible transformations
 * - Use description to infer texture/motion, NOT to list visible ingredients
 * - Match motion to food type (steam for hot, glistening for fresh)
 * - Don't describe what's visible - Akool already sees the image
 * - Focus on: camera movement, textures, lighting, motion effects
 *
 * Prompt formula: subject + texture + motion + lighting + camera
 *
 * Two modes:
 * 1. LLM-generated (preferred): Uses Groq to generate contextual prompts
 * 2. Template-based (fallback): Uses hardcoded templates with {productName}
 */

import Groq from 'groq-sdk';
import type { AkoolAnimationConfig } from './types';

/**
 * Comprehensive negative prompt based on common AI food video failure modes
 * Reference: video-prompt-guide.md failure analysis
 */
export const NEGATIVE_PROMPT = `blurry, distorted, low quality, pixelated, plastic appearance, artificial look, too-perfect symmetry, unnaturally perfect, flawless, pristine, extra hands, deformed hands, extra fingers, missing fingers, wrong number of fingers, hands from wrong angle, disembodied hands, unrelated objects, wrong food items, different food appearing, floating objects, levitating food, food flying unrealistically, morphing, warping, flickering, artifacts, glitches, melting unnaturally, objects appearing disappearing, cartoon, illustration, anime, painting, sketch, text overlay, watermark, logo, caption, subtitle, flash photography, harsh shadows, overhead fluorescent, bright flat lighting, oversaturated, undersaturated, wrong colors, static, frozen, no movement, boring, multiple complex motions, contradictory movements`.trim();

/**
 * POC Brand-specific prompt templates
 * Formula: subject + texture + motion + lighting + camera
 * Key: ONE motion, speed qualifiers, trigger words from training data
 * Reference: video-prompt-guide.md proven terminology
 */

// Joe's Pizza - NYC iconic since 1975
// Trigger words: cheese pull, mozzarella stretch, golden crust, charred spots, steam rising, fresh, freshly made
// NO hands/forks - if lifting needed, use pizza server/spatula. Food moves on its own.
// Camera variety: static, slow push in, slow zoom in, macro close-up, dolly in
// {productName} placeholder gets replaced with actual product name (e.g., "Pepperoni Pizza")
const JOES_PIZZA_PROMPTS: Record<string, string[]> = {
  pizza: [
    "Freshly baked {productName} with bubbling glossy mozzarella, thick cheese pull stretching in long golden strings as slice lifts on pizza server. Steam rising from charred crust. Warm cinematic lighting. Slow push in. No hands visible",
    "Fresh hot {productName} straight from oven, glossy bubbling cheese glistening with oil droplets. Gentle steam curling upward slowly from golden charred crust. Warm cinematic lighting. Shallow depth of field. Camera pans across",
    "Two fresh {productName} slices slowly being lifted up to reveal satisfying cheese pull, thick mozzarella cheese pull stretching in glossy golden strings between them. Steam wisps rising. Ultra-realistic food commercial style. Slow zoom in. No utensils",
    "Freshly baked {productName} with bubbling mozzarella and crispy charred crust edges, oil droplets glistening. Gentle steam rising. Warm cinematic lighting. Macro close-up. Dolly zoom in slowly",
  ],
  salad: [
    "Crisp fresh {productName} glistening with vinaigrette, settling gently after toss. Dressing droplets catching soft natural light. Bright airy aesthetic. Slow push in",
    "Freshly tossed {productName} with glistening vinaigrette, gentle movement settling slowly. Soft natural window light. Shallow depth of field. Dolly zoom in slowly",
  ],
  sides: [
    "Freshly made {productName} with crispy caramelized edges, gentle steam rising and curling slowly. Warm cinematic lighting. Macro close-up. Camera remains still",
    "Fresh {productName} steaming hot with glistening caramelized surface catching warm light. Gentle steam wisps curling upward. Shallow depth of field. Slow zoom in",
  ],
  default: [
    "Freshly prepared {productName} with gentle steam rising slowly from glistening appetizing surface. Warm golden hour lighting. Shallow depth of field. Slow push in",
  ],
};

// Sweetgreen - Farm-to-table salads
// Trigger words: crisp, vibrant, garden fresh, glistening, drizzle, leafy greens, colorful vegetables, freshly prepared
// NO hands/forks - focus on food motion, drizzles, and settling
// Camera variety: static, slow push in, slow zoom in, dolly in, macro close-up
// {productName} placeholder gets replaced with actual product name (e.g., "Kale Caesar")
const SWEETGREEN_PROMPTS: Record<string, string[]> = {
  bowl: [
    "Freshly prepared {productName} with crisp greens and warm grains, olive oil drizzling slowly in glossy streams across the surface. Soft natural window light. Shallow depth of field. Dolly zoom in slowly",
    "Fresh {productName} with gentle steam rising slowly from just-cooked ingredients, glistening roasted vegetables settling softly. Soft natural daylight. Slow zoom in",
    "Garden fresh {productName} with golden olive oil cascading slowly over vibrant vegetables, pooling at edges and glistening. Bright airy natural daylight. Camera remains still",
    "Freshly assembled {productName} with glossy tahini dressing drizzling slowly over colorful ingredients. Soft natural light. Macro close-up. Dolly zoom",
  ],
  salad: [
    "Freshly tossed {productName} with crisp leafy greens glistening with vinaigrette, settling gently after toss. Parmesan shavings catching soft natural window light. Slow push in",
    "Fresh {productName} with glossy dressing droplets falling slowly onto crisp vibrant leaves. Clean minimalist aesthetic. Shallow depth of field. Dolly in slowly",
    "Just-prepared {productName} with vinaigrette drizzling slowly across crisp vibrant greens, droplets glistening in natural light. Ultra-realistic food photography. Camera static",
    "Freshly tossed {productName} with glistening olive oil droplets catching light, crisp greens settling gently. Bright airy aesthetic. Slow zoom in",
  ],
  plates: [
    "Freshly seared {productName} with gentle steam rising slowly, glistening juices pooling on warm plate surface. Caramelized edges catching cinematic light. Shallow depth of field. Slow push in",
    "Just-cooked {productName} with glossy caramelized exterior, steam wisps curling gently upward. Warm cinematic lighting. Macro close-up. Camera remains still",
  ],
  sides: [
    "Freshly roasted {productName} with gentle steam curling upward slowly, caramelized golden edges glistening. Warm golden hour lighting. Macro close-up. Camera static",
    "Fresh {productName} with glossy olive oil coating, gentle steam rising. Warm natural light. Slow zoom in",
  ],
  bread: [
    "Freshly baked {productName} straight from oven with fluffy interior visible, wisps of steam escaping slowly. Golden crispy crust glistening. Warm bakery light. Slow push in",
    "Fresh {productName} with golden crust and soft interior, gentle steam wisps rising. Warm bakery lighting. Macro close-up. Camera static",
  ],
  default: [
    "Freshly prepared {productName} glistening with dressing drizzling slowly in glossy streams. Soft natural window light. Shallow depth of field. Slow push in",
  ],
};

// Doughnut Vault - Chicago artisan donuts
// Trigger words: glossy glaze, fluffy, pillowy, dusted with sugar, golden-brown, shiny frosting, fresh, freshly made
// NO hands/fingers - focus on glaze drips, sugar dusting, rotating display, and texture
// Camera variety: static, slow push in, slow zoom in, dolly in, macro close-up
// {productName} placeholder gets replaced with actual product name (e.g., "Old Fashioned Doughnut")
const DOUGHNUT_VAULT_PROMPTS: Record<string, string[]> = {
  doughnut: [
    "Freshly glazed {productName} with glossy coating dripping slowly down golden-brown side, pooling at base. Shiny surface catching warm bakery light. Macro close-up. Slow push in",
    "Fresh {productName} with glossy glaze glistening, gentle light reflections moving across shiny surface. Fluffy pillowy texture visible. Warm bakery lighting. Dolly zoom",
    "Freshly dusted {productName} with powdered sugar particles floating down gently and settling on fluffy pillowy surface. Soft diffused morning light. Slow zoom in",
    "Just-made {productName} with shiny coating catching warm light, glaze slowly dripping down golden-brown side. Shallow depth of field. Dolly in slowly",
  ],
  oldFashioned: [
    "Fresh {productName} with crackly glossy glaze surface, warm light dancing across golden-brown ridges. Nostalgic bakery glow. Shallow depth of field. Slow push in",
    "Freshly made {productName} with tender fluffy interior visible at break, fine crumbs falling gently. Warm cinematic lighting. Macro close-up. Camera static",
  ],
  glazed: [
    "Fresh {productName} with glossy coating dripping slowly from edge, catching warm golden bakery light. Pillowy surface dimpling gently. Macro close-up. Camera remains still",
    "Freshly dipped {productName} rotating slowly on display, shiny glaze surface glistening with warm light reflections. Warm bakery glow. Shallow depth of field. Slow zoom in",
  ],
  specialty: [
    "Freshly made {productName} with rich glaze dripping slowly, colorful toppings catching warm studio light. Glossy surface glistening. Dolly in slowly",
    "Fresh {productName} with shiny icing drizzling slowly across pillowy top, pooling in golden crevices. Soft diffused light. Ultra-realistic food photography. Slow push in",
  ],
  pastry: [
    "Freshly baked {productName} with flaky layers slowly separating, delicate crumbs cascading gently down. Golden buttery surface glistening. Warm golden hour lighting. Macro close-up. Camera static",
  ],
  default: [
    "Fresh {productName} with glossy glaze glistening, warm bakery light reflecting off shiny surface. Shallow depth of field. Slow push in",
  ],
};

/**
 * All POC prompts by brand slug
 */
const POC_PROMPTS: Record<string, Record<string, string[]>> = {
  "Joe's Pizza": JOES_PIZZA_PROMPTS,
  'joes-pizza': JOES_PIZZA_PROMPTS,
  'joespizza': JOES_PIZZA_PROMPTS,
  'Sweetgreen': SWEETGREEN_PROMPTS,
  'sweetgreen': SWEETGREEN_PROMPTS,
  'Doughnut Vault': DOUGHNUT_VAULT_PROMPTS,
  'The Doughnut Vault': DOUGHNUT_VAULT_PROMPTS,
  'doughnut-vault': DOUGHNUT_VAULT_PROMPTS,
  'doughnutvault': DOUGHNUT_VAULT_PROMPTS,
};

/**
 * Generic prompts for non-POC brands
 * Formula: subject + texture + motion + lighting + camera
 * Key: ONE motion, speed qualifiers, food-specific trigger words, ALWAYS include "fresh/freshly"
 * NO hands/forks/knives - if lifting needed, use proper tools (pizza server) or "separates on its own"
 * Camera variety: static, slow push in, slow zoom in, dolly in, macro close-up
 * {productName} placeholder gets replaced with actual product name
 */
const GENERIC_PROMPTS: Record<string, string[]> = {
  pizza: [
    "Freshly baked {productName} with thick glossy mozzarella, cheese pull stretching in long golden strings as slice lifts on pizza server. Steam rising from charred crust. Warm cinematic lighting. Slow push in. No hands visible",
    "Fresh hot {productName} straight from oven with bubbling glossy cheese glistening, charred golden crust. Gentle steam curling upward slowly. Shallow depth of field. Dolly zoom in slowly",
    "Two fresh {productName} slices slowly separating on their own, thick mozzarella cheese pull stretching in glossy golden strings. Steam wisps rising. Warm cinematic lighting. Slow zoom in. No utensils. Camera pans across",
    "Freshly baked {productName} with bubbling mozzarella, oil droplets glistening on crispy charred crust. Gentle steam rising. Macro close-up. Dolly zoom",
  ],
  salad: [
    "Freshly tossed {productName} glistening with glossy vinaigrette, settling gently after toss. Dressing droplets catching soft natural window light. Slow push in",
    "Fresh {productName} with glistening dressing droplets falling slowly onto crisp vibrant leaves. Bright airy natural daylight. Dolly in slowly",
    "Just-prepared {productName} with olive oil drizzling slowly, crisp greens glistening. Soft natural light. Slow zoom in",
  ],
  bowl: [
    "Fresh {productName} with olive oil drizzling slowly in glossy streams across colorful vegetables. Soft natural window light. Shallow depth of field. Slow push in",
    "Freshly prepared {productName} with gentle steam rising slowly from just-cooked ingredients, glistening vegetables settling softly. Soft natural daylight. Dolly zoom",
    "Fresh {productName} with glossy tahini dressing drizzling slowly over vibrant ingredients. Bright airy light. Macro close-up. Slow zoom in",
  ],
  doughnut: [
    "Freshly glazed {productName} with glossy coating dripping slowly down golden-brown side, pooling at base. Shiny surface catching warm bakery light. Macro close-up. Slow push in",
    "Fresh {productName} with shiny glaze glistening, warm light reflections moving across glossy surface. Fluffy pillowy texture visible. Warm bakery lighting. Dolly zoom",
    "Freshly dusted {productName} with powdered sugar particles settling gently on pillowy surface. Soft morning light. Slow zoom in",
  ],
  pastry: [
    "Freshly baked {productName} with flaky layers slowly separating, delicate crumbs cascading gently down. Golden buttery surface glistening. Warm golden hour lighting. Camera remains still",
    "Fresh {productName} with flaky golden layers, steam wisps escaping from tender interior. Warm bakery light. Macro close-up. Slow push in",
  ],
  protein: [
    "Freshly seared {productName} with glossy caramelized surface, glistening juices slowly pooling on warm plate. Gentle steam rising. Warm cinematic lighting. Slow push in",
    "Just-cooked {productName} with juices bubbling gently on caramelized surface, aromatic steam rising slowly. Shallow depth of field. Macro close-up. Camera static",
  ],
  bread: [
    "Freshly baked {productName} straight from oven with fluffy interior visible, wisps of steam escaping slowly from warm golden crust. Warm bakery light. Slow zoom in",
    "Fresh {productName} with golden crust, gentle steam rising from soft interior. Warm bakery lighting. Macro close-up. Camera remains still",
  ],
  sides: [
    "Freshly made {productName} with crispy caramelized edges, gentle steam rising and curling slowly. Glistening surface. Warm cinematic lighting. Slow push in",
    "Fresh {productName} with golden crispy coating, steam wisps rising gently. Shallow depth of field. Dolly in slowly",
  ],
  default: [
    "Freshly prepared {productName} with gentle steam rising slowly from glistening appetizing surface. Warm golden hour lighting. Shallow depth of field. Slow push in",
    "Fresh {productName} with glossy sauce drizzling slowly across glistening surface, pooling at edges. Soft natural window light. Camera static",
    "Just-made {productName} with glistening surface catching warm light, gentle steam curling upward. Macro close-up. Slow zoom in",
  ],
};

/**
 * Infer MOTION effects from product description keywords
 * Maps description keywords to physics-grounded movements with speed qualifiers
 * Reference: video-prompt-guide.md motion terminology
 */
function inferMotionEffects(description: string): string {
  const effects: string[] = [];
  const desc = description.toLowerCase();

  // Temperature → steam motion (gentle steam curling is most reliable)
  if (/roasted|warm|hot|grilled|toasted|baked|fresh.?from|sizzling/.test(desc)) {
    effects.push('gentle steam curling upward slowly');
  }
  // Freshness → glistening motion
  if (/fresh|crisp|raw|garden|vibrant/.test(desc)) {
    effects.push('glistening surface catching light');
  }
  // Dressed/glazed → drizzling motion (use "drizzling slowly" not "pouring")
  if (/vinaigrette|dressing|glazed|sauce|drizzle|oil/.test(desc)) {
    effects.push('dressing drizzling slowly in glossy strings');
  }
  // Creamy/melted → stretching motion (cheese pull is high-impact term)
  if (/creamy|melted|cheese|mozzarella|ricotta/.test(desc)) {
    effects.push('cheese pull stretching in glossy golden strings');
  }
  // Crispy → sizzling/glistening motion
  if (/crispy|crunchy|golden|fried|caramelized|seared/.test(desc)) {
    effects.push('caramelized edges glistening');
  }
  // Sweet/sugary → glossy glaze dripping motion
  if (/sugar|sweet|honey|caramel|chocolate|glaze|frosting/.test(desc)) {
    effects.push('glossy glaze dripping slowly');
  }

  return effects.slice(0, 1).join(', ') || 'gentle movement'; // Only ONE effect
}

/**
 * Detect food category from text
 */
function detectFoodCategory(text: string): string {
  const t = text.toLowerCase();

  if (/pizza|slice|pepperoni|margherita|sicilian/.test(t)) return 'pizza';
  if (/salad|greens|kale|spinach|arugula|caesar|lettuce/.test(t)) return 'salad';
  if (/bowl|harvest|grain|quinoa|rice|poke/.test(t)) return 'bowl';
  if (/doughnut|donut|old.?fashioned|fritter/.test(t)) return 'doughnut';
  if (/glazed/.test(t)) return 'glazed';
  if (/pastry|croissant|muffin/.test(t)) return 'pastry';
  if (/chicken|steak|beef|fish|salmon|meatball|pork|shrimp/.test(t)) return 'protein';
  if (/bread|focaccia|baguette|roll|knot|toast/.test(t)) return 'bread';
  if (/potato|vegetable|veggie|roasted|carrot|broccoli/.test(t)) return 'sides';

  return 'default';
}

/**
 * Get the prompt templates for a brand
 */
function getPromptsForBrand(brandName?: string): Record<string, string[]> {
  if (!brandName) return GENERIC_PROMPTS;

  // Try exact match first
  if (POC_PROMPTS[brandName]) {
    return POC_PROMPTS[brandName];
  }

  // Try normalized match
  const normalized = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const key of Object.keys(POC_PROMPTS)) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) {
      return POC_PROMPTS[key];
    }
  }

  return GENERIC_PROMPTS;
}

/**
 * Generate Akool animation prompt for a product image
 *
 * @param productName - Name of the product (from alt text)
 * @param productDescription - Optional description for texture inference
 * @param foodCategory - Detected food category (pizza, salad, etc.)
 * @param brandName - Brand name for POC-specific prompts
 * @param sceneIndex - Scene index for variety (0-4)
 */
export function generateAkoolPrompt(
  productName: string,
  productDescription?: string,
  foodCategory?: string,
  brandName?: string,
  sceneIndex: number = 0
): AkoolAnimationConfig {
  // Get brand-specific or generic prompts
  const prompts = getPromptsForBrand(brandName);

  // Detect food category if not provided
  const category = foodCategory || detectFoodCategory(productName);

  // Get prompts for this category
  const categoryPrompts = prompts[category] || prompts['default'] || GENERIC_PROMPTS['default'];

  // Select prompt based on scene index for variety
  const template = categoryPrompts[sceneIndex % categoryPrompts.length];

  // Build prompt with product name (replace all occurrences)
  let prompt = template.replace(/\{productName\}/g, productName);

  // Infer and add motion effects from description if available
  if (productDescription) {
    const effects = inferMotionEffects(productDescription);
    // Only add if not already in prompt
    if (!prompt.toLowerCase().includes(effects.split(',')[0].toLowerCase())) {
      prompt = prompt.replace(/, (slow|gentle|cinematic|subtle)/, `, ${effects}, $1`);
    }
  }

  return {
    prompt,
    negativePrompt: NEGATIVE_PROMPT,
    videoLength: 5,
    resolution: '720p',
  };
}

/**
 * Default config when no image context available
 * Uses proven trigger words from video-prompt-guide.md - includes "fresh/freshly"
 */
export const DEFAULT_AKOOL_CONFIG: AkoolAnimationConfig = {
  prompt: 'Freshly prepared appetizing food with gentle steam rising slowly. Glistening surface catching warm cinematic light. Shallow depth of field. Slow push in. Ultra-realistic food commercial style',
  negativePrompt: NEGATIVE_PROMPT,
  videoLength: 5,
  resolution: '720p',
};

/**
 * POC Template-Only Prompt Generator
 *
 * For POC demos, use ONLY proven templates - no LLM variability.
 * This ensures consistent, tested results for demos.
 *
 * Key features:
 * - Picks from curated templates based on brand + food type
 * - Uses scene index for variety across scenes (deterministic by default)
 * - Optional randomization for more variety
 * - NO LLM calls - fast and predictable
 *
 * @param productName - Product name (from image alt)
 * @param options.foodType - Food type for template selection
 * @param options.brandName - Brand for brand-specific templates
 * @param options.sceneIndex - Scene index for deterministic variety
 * @param options.randomize - If true, randomly pick from available templates
 */
export function generatePOCTemplatePrompt(
  productName: string,
  options: {
    productDescription?: string;
    foodType?: string;
    brandName?: string;
    sceneIndex?: number;
    randomize?: boolean;
  } = {}
): AkoolAnimationConfig {
  const {
    foodType,
    brandName,
    sceneIndex = 0,
    randomize = false,
  } = options;

  // Get brand-specific prompts
  const prompts = getPromptsForBrand(brandName);

  // Try to match by foodType first, then by product name, then default
  const category = foodType || detectFoodCategory(productName);

  // Get prompts for this category
  const categoryPrompts = prompts[category] || prompts['default'] || GENERIC_PROMPTS['default'];

  // Select prompt - either random or deterministic based on scene index
  let promptIndex: number;
  if (randomize) {
    promptIndex = Math.floor(Math.random() * categoryPrompts.length);
  } else {
    promptIndex = sceneIndex % categoryPrompts.length;
  }

  // Get template and replace {productName} placeholder with actual product name
  const template = categoryPrompts[promptIndex];
  const prompt = template.replace(/\{productName\}/g, productName);

  console.log(`[POC Template] Brand: ${brandName}, Food: ${category}, Product: "${productName}", Prompt #${promptIndex + 1}/${categoryPrompts.length}${randomize ? ' (random)' : ''}`);

  return {
    prompt,
    negativePrompt: NEGATIVE_PROMPT,
    videoLength: 5,
    resolution: '720p',
  };
}

// ============================================================================
// LLM-BASED PROMPT GENERATION
// ============================================================================

/**
 * Initialize Groq client
 */
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY not set, falling back to template-based prompts');
    return null;
  }
  return new Groq({ apiKey });
}

/**
 * System prompt for Akool animation prompt generation
 *
 * Based on video-prompt-guide.md proven terminology that AI models understand.
 * Akool animates existing images - focus on ONE motion, not scene description.
 *
 * Formula: subject + texture + motion + lighting + camera
 * CRITICAL: NO hands, forks, knives, fingers - these cause AI failure ("Will Smith Eating Spaghetti" problem)
 */
const AKOOL_PROMPT_SYSTEM = `You write prompts for Akool image-to-video AI that animates food photos.

CRITICAL RULES:
1. ONE motion only (25-45 words total prompt)
2. NEVER include hands, forks, knives, fingers - if lifting pizza, use "pizza server" or "slices separate on their own"
3. ALWAYS include "fresh", "freshly made", "freshly baked", or "just-made" - these are proven trigger words
4. ONLY mention ingredients actually visible/listed - never assume cheese/sauce if not specified
5. NO marketing terms (organic, artisanal, antibiotic-free, etc.)
6. NO quotes around response
7. ONE camera instruction only - vary between "Slow push in", "Camera static", "Camera remains still"
8. Use complete sentences, not fragments with + or :
9. End prompts with "No hands visible" or "No utensils" when lifting/separating motion is involved

BANNED ELEMENTS (cause AI artifacts):
- Hands, fingers, forks, knives interacting with food - AI CANNOT render hands properly
- Multiple competing motions in one prompt
- Contradictory camera instructions
- Abstract feelings ("delicious", "tasty") - describe what you SEE

TRIGGER WORDS THAT WORK (use these):
- Freshness: fresh, freshly made, freshly baked, just-made, fresh from oven, fresh from fryer
- Textures: glistening, glossy, crispy, fluffy, pillowy, seared, caramelized, golden-brown, bubbling
- Motion: slow motion, slowly, gently, drizzling slowly, rising slowly, stretching, settling, curling
- Lighting: warm cinematic lighting, soft natural light, warm bakery light, shallow depth of field
- Camera: "Slow push in" OR "Camera remains still" OR "Camera static" (pick ONE, vary across prompts)

MOTION BY FOOD TYPE (NO HANDS - food moves on its own or use proper tools):
- PIZZA: "Freshly baked pizza with cheese pull stretching as slice lifts on pizza server" OR "Two slices slowly separating on their own, cheese pull visible"
- SALAD: "Freshly tossed crisp greens glistening with dressing, settling gently"
- BOWL: "Fresh warm bowl with olive oil drizzling slowly" OR "gentle steam rising from just-cooked ingredients"
- DOUGHNUT: "Freshly glazed doughnut with glossy coating dripping slowly" OR "powdered sugar settling gently on fresh doughnut"
- HOT FOOD: "Fresh from the kitchen with gentle steam curling upward slowly"
- PROTEIN: "Freshly seared protein with glistening juices slowly pooling"

CAMERA VARIETY (alternate these across different prompts):
- Hero shots: "Slow push in" - builds anticipation
- Texture focus: "Camera static" - lets motion shine
- Detail shots: "Camera remains still" with "Macro close-up"

STRUCTURE: ["Fresh/Freshly" + food subject + textures] + [ONE physics-based motion with speed] + [Lighting term] + [ONE camera instruction] + [Optional: "No hands visible"]

FORMAT: Return ONLY prompt text. Complete sentences. No quotes. 25-45 words.

EXAMPLES:
- Kale Caesar: Freshly tossed crisp leafy kale glistening with caesar dressing, settling gently after toss. Parmesan shavings catching soft natural light. Shallow depth of field. Slow push in
- Glazed doughnut: Fresh glazed doughnut with glossy coating dripping slowly down golden-brown side. Shiny surface catching warm bakery light. Macro close-up. Camera remains still
- Pepperoni pizza: Freshly baked pepperoni pizza with thick glossy mozzarella, cheese pull stretching in long golden strings as slice lifts on pizza server. Steam rising. Warm cinematic lighting. Slow push in. No hands visible`;

/**
 * Clean ingredient description - remove marketing terms, keep actual food items
 */
function cleanIngredients(description: string): string {
  // Marketing terms to remove
  const marketingTerms = [
    'antibiotic-free',
    'antibiotic free',
    'grass-fed',
    'grass fed',
    'organic',
    'locally-sourced',
    'locally sourced',
    'locally-made',
    'farm-fresh',
    'artisanal',
    'handcrafted',
    'hand-crafted',
    'premium',
    'signature',
    'house-made',
    'fresh-baked',
    'seed oil-free',
  ];

  let cleaned = description.toLowerCase();
  for (const term of marketingTerms) {
    cleaned = cleaned.replace(new RegExp(term + '\\s*', 'gi'), '');
  }

  // Clean up extra spaces and commas
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

  return cleaned;
}

/**
 * Build the user prompt for LLM
 * Passes cleaned ingredients (no marketing fluff) so LLM knows what's in the dish
 * Structure guides LLM to follow proven formula: subject + texture + motion + lighting + camera
 */
function buildAkoolUserPrompt(
  productName: string,
  options: {
    productDescription?: string;
    foodType?: string;
  }
): string {
  const foodType = options.foodType || 'food';

  let prompt = `FOOD: ${productName} (${foodType})\n`;

  // Pass cleaned ingredients so LLM knows what's actually in the dish
  if (options.productDescription && options.productDescription !== productName) {
    const cleanedIngredients = cleanIngredients(options.productDescription);
    prompt += `INGREDIENTS: ${cleanedIngredients}\n`;
  }

  prompt += `\nWrite a 15-30 word Akool animation prompt following this structure:
[Subject + texture words] + [ONE motion with speed qualifier] + [Lighting term] + [Camera instruction]

Use trigger words: glistening, glossy, slowly, gentle, warm cinematic lighting, shallow depth of field, slow push in, camera static`;

  return prompt;
}


/**
 * Generate Akool prompt using LLM
 * Falls back to template-based generation if LLM fails
 */
export async function generateAkoolPromptWithLLM(
  productName: string,
  options: {
    productDescription?: string;
    foodType?: string;
    brandName?: string;
    sceneIndex?: number;
  } = {}
): Promise<AkoolAnimationConfig> {
  const groq = getGroqClient();

  // If no Groq client, fall back to template
  if (!groq) {
    return generateAkoolPrompt(
      productName,
      options.productDescription,
      options.foodType,
      options.brandName,
      options.sceneIndex || 0
    );
  }

  try {
    const userPrompt = buildAkoolUserPrompt(productName, options);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: AKOOL_PROMPT_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    let prompt = completion.choices[0]?.message?.content?.trim() || '';

    // Clean up LLM output - remove quotes and extra whitespace
    prompt = prompt
      .replace(/^["']|["']$/g, '')  // Remove leading/trailing quotes
      .replace(/^"+|"+$/g, '')       // Remove multiple quotes
      .replace(/\\"/g, '"')          // Unescape quotes
      .trim();

    if (!prompt || prompt.length < 15) {
      throw new Error('LLM returned empty or too short prompt');
    }

    console.log(`[Akool LLM] Generated prompt for "${productName}": ${prompt.substring(0, 80)}...`);

    return {
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      videoLength: 5,
      resolution: '720p',
    };
  } catch (error) {
    console.warn(`[Akool LLM] Failed for "${productName}", using template fallback:`, error);

    // Fall back to template-based generation
    return generateAkoolPrompt(
      productName,
      options.productDescription,
      options.foodType,
      options.brandName,
      options.sceneIndex || 0
    );
  }
}

