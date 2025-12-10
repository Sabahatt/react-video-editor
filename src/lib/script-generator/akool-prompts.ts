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
 * Comprehensive negative prompt to avoid common issues
 */
export const NEGATIVE_PROMPT = `blurry, distorted, low quality, pixelated, extra hands, deformed hands, extra fingers, missing fingers, wrong number of fingers, unrelated objects, wrong food items, different food appearing, floating objects, levitating food, food flying unrealistically, cartoon, illustration, anime, painting, sketch, text overlay, watermark, logo, caption, subtitle, morphing, melting unnaturally, flickering, artifacts, glitches, disembodied hands, hands coming from wrong angle, oversaturated, undersaturated, wrong colors, static, frozen, no movement, boring`.trim();

/**
 * POC Brand-specific prompt templates
 * Key: Focus on ONE primary movement per prompt. Use sensory words.
 */

// Joe's Pizza - NYC iconic since 1975
const JOES_PIZZA_PROMPTS: Record<string, string[]> = {
  pizza: [
    // Cheese pull - the hero motion for pizza
    "A slice of {productName} being lifted, melted cheese stretching in golden gooey strings, freshly baked crust, warm pizzeria lighting, macro close-up, shallow depth of field",
    // Steam focus
    "Freshly baked {productName}, steam rising slowly from hot melted mozzarella, crispy golden crust, cinematic warm lighting, slow push-in, appetizing food commercial",
    // Texture focus
    "{productName} with bubbling cheese surface, golden crispy edges, warm ambient glow, gentle zoom revealing delicious textures",
  ],
  salad: [
    "Fresh {productName} with crisp greens, light vinaigrette dripping slowly, vibrant colors, bright natural daylight, overhead angle, clean food photography",
    "Organic {productName}, fresh ingredients glistening with dressing, colorful vegetables, soft natural lighting, gentle camera movement",
  ],
  sides: [
    "Hot {productName}, steam rising gently, golden crispy texture, warm ambient lighting, close-up macro shot",
    "Freshly prepared {productName}, appetizing golden surface, warm inviting lighting, slow cinematic push-in",
  ],
  default: [
    "Appetizing {productName}, warm inviting lighting, gentle steam wisps, cinematic food photography, slow zoom in",
  ],
};

// Sweetgreen - Farm-to-table salads
const SWEETGREEN_PROMPTS: Record<string, string[]> = {
  bowl: [
    // Steam from warm bowl
    "Warm {productName}, gentle steam rising from roasted grains, fresh vibrant ingredients, soft natural lighting, slow cinematic push-in, wholesome food commercial",
    // Fork lift
    "A fork lifting a fresh bite from {productName}, crisp greens and grains rising, dressing dripping gently, bright airy daylight, macro close-up",
    // Texture focus
    "{productName} with glistening ingredients, vibrant colors, steam wisps from warm elements, natural daylight, elegant overhead shot",
  ],
  salad: [
    "Fresh {productName}, crisp organic greens glistening, vibrant colorful vegetables, bright natural daylight, gentle camera push-in, clean modern aesthetic",
    "A fork tossing fresh {productName}, crisp texture visible, light dressing coating leaves, overhead natural lighting, slow motion",
    "Organic {productName}, fresh ingredients catching the light, colorful healthy composition, soft natural glow, appetizing close-up",
  ],
  plates: [
    "Warm {productName}, steam rising from perfectly cooked protein, fresh accompaniments, soft natural lighting, cinematic presentation",
    "Freshly plated {productName}, appetizing textures, natural ingredients glistening, warm inviting lighting, elegant push-in",
  ],
  sides: [
    "Warm roasted {productName}, steam rising slowly, golden caramelized edges, soft natural lighting, appetizing close-up",
  ],
  bread: [
    "Freshly baked {productName}, steam wisps rising, flaky golden crust, warm bakery lighting, macro close-up, artisanal quality",
  ],
  default: [
    "Fresh {productName}, vibrant healthy ingredients, natural daylight, clean appetizing presentation, gentle zoom",
  ],
};

// Doughnut Vault - Chicago artisan donuts
const DOUGHNUT_VAULT_PROMPTS: Record<string, string[]> = {
  doughnut: [
    // Glaze focus - hero visual for doughnuts
    "Freshly glazed {productName}, glossy coating catching warm morning light, soft pillowy texture, golden bakery ambiance, slow cinematic push-in",
    // Hand interaction - shows softness
    "A hand gently pressing {productName}, soft fluffy dough yielding, glossy glaze glistening, warm golden lighting, intimate macro close-up",
    // Sugar/powder floating
    "Fresh {productName}, powdered sugar particles floating gently, soft airy texture visible, warm bakery morning light, shallow depth of field",
    // Glaze dripping
    "{productName} with glossy glaze slowly dripping, rich sweet coating, warm inviting bakery lighting, appetizing macro shot",
  ],
  oldFashioned: [
    "Classic {productName}, crackly glaze surface catching light, tender cake interior visible, warm nostalgic bakery glow, intimate close-up",
    "Freshly made {productName}, golden crispy edges, soft fluffy center, morning bakery warmth, slow elegant zoom",
  ],
  glazed: [
    "Perfect {productName}, mirror-like glaze glistening, soft pillowy dough, warm golden hour lighting, gentle rotation reveal",
    "{productName} with translucent glaze catching light, delicate sweet coating, cozy bakery ambiance, macro beauty shot",
  ],
  specialty: [
    "Artisan {productName}, unique toppings glistening, creative presentation, warm inviting lighting, slow appreciative zoom",
    "Handcrafted {productName}, special ingredients visible, artisanal quality, golden bakery glow, cinematic close-up",
  ],
  pastry: [
    "Freshly baked {productName}, flaky golden layers visible, delicate crumbs falling, warm soft lighting, artisanal close-up",
  ],
  default: [
    "Fresh {productName}, warm bakery lighting, appetizing textures, gentle steam or glaze glistening, inviting close-up",
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
 */
const GENERIC_PROMPTS: Record<string, string[]> = {
  pizza: [
    "Freshly baked {productName}, melted cheese stretching, steam rising, warm pizzeria lighting, appetizing close-up",
    "{productName} with golden crispy crust, bubbling toppings, warm ambient glow, cinematic food shot",
  ],
  salad: [
    "Fresh {productName}, crisp greens glistening, colorful vegetables, bright natural lighting, clean presentation",
    "Healthy {productName}, fresh ingredients, light dressing drizzling, overhead natural light, appetizing shot",
  ],
  bowl: [
    "Warm {productName}, steam rising gently, fresh toppings, soft natural lighting, wholesome presentation",
    "Colorful {productName}, vibrant ingredients, appetizing textures, gentle camera movement",
  ],
  doughnut: [
    "Freshly glazed {productName}, glossy coating catching light, soft texture, warm bakery lighting, close-up",
    "{productName} with sweet glaze glistening, fluffy dough, golden morning light, appetizing macro shot",
  ],
  pastry: [
    "Fresh {productName}, flaky layers visible, golden crust, warm bakery lighting, artisanal close-up",
  ],
  protein: [
    "Perfectly cooked {productName}, juices glistening, steam rising, warm dramatic lighting, appetizing shot",
    "Sizzling {productName}, caramelized edges, aromatic steam, cinematic food photography",
  ],
  bread: [
    "Freshly baked {productName}, steam escaping, golden crust, warm bakery glow, artisanal quality",
  ],
  sides: [
    "Hot {productName}, steam rising, golden crispy texture, warm inviting lighting, appetizing close-up",
  ],
  default: [
    "Appetizing {productName}, warm inviting lighting, beautiful textures, gentle camera movement, food commercial quality",
    "Fresh {productName}, appetizing presentation, soft natural lighting, cinematic slow zoom",
  ],
};

/**
 * Infer texture/motion effects from product description keywords
 * Maps description keywords to visual effects (not ingredient lists)
 */
function inferTextureEffects(description: string): string {
  const effects: string[] = [];
  const desc = description.toLowerCase();

  // Temperature → steam/warmth
  if (/roasted|warm|hot|grilled|toasted|baked|fresh.?from/.test(desc)) {
    effects.push('gentle steam rising');
  }
  // Freshness → glistening
  if (/fresh|crisp|raw|organic|garden/.test(desc)) {
    effects.push('fresh ingredients glistening');
  }
  // Dressed/glazed → shine
  if (/vinaigrette|dressing|glazed|sauce|drizzle/.test(desc)) {
    effects.push('glossy surface catching light');
  }
  // Creamy/melted → texture
  if (/creamy|melted|cheese|mozzarella|ricotta/.test(desc)) {
    effects.push('smooth creamy texture');
  }
  // Crispy → texture
  if (/crispy|crunchy|golden|fried/.test(desc)) {
    effects.push('golden crispy edges');
  }
  // Sweet/sugary → coating
  if (/sugar|sweet|honey|caramel|chocolate/.test(desc)) {
    effects.push('sweet coating glistening');
  }

  return effects.slice(0, 2).join(', ') || 'appetizing textures';
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

  // Build prompt with product name
  let prompt = template.replace('{productName}', productName);

  // Infer and add texture effects from description if available
  if (productDescription) {
    const effects = inferTextureEffects(productDescription);
    // Only add if not already in prompt
    if (!prompt.toLowerCase().includes(effects.split(',')[0].toLowerCase())) {
      prompt = prompt.replace(/, (slow|gentle|cinematic)/, `, ${effects}, $1`);
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
 * Generate prompts for multiple scenes with their selected images
 * Legacy function for backwards compatibility
 */
export function generateAkoolPromptsForScenes(
  scenes: Array<{
    sceneId: string;
    selectedImage?: {
      alt: string;
      category?: string;
    } | null;
  }>,
  brandName?: string
): Map<string, AkoolAnimationConfig> {
  const prompts = new Map<string, AkoolAnimationConfig>();

  scenes.forEach((scene, index) => {
    if (scene.selectedImage) {
      const config = generateAkoolPrompt(
        scene.selectedImage.alt,
        undefined, // No description in legacy format
        scene.selectedImage.category,
        brandName,
        index
      );
      prompts.set(scene.sceneId, config);
    }
  });

  return prompts;
}

/**
 * Generate Akool prompt with full context
 * New function with all POC plan features
 */
export function generatePOCAkoolPrompt(
  productName: string,
  options: {
    productDescription?: string;
    foodType?: string;
    brandName?: string;
    sceneIndex?: number;
    visualMode?: 'animated' | 'static';
  } = {}
): AkoolAnimationConfig {
  const {
    productDescription,
    foodType,
    brandName,
    sceneIndex = 0,
  } = options;

  return generateAkoolPrompt(
    productName,
    productDescription,
    foodType,
    brandName,
    sceneIndex
  );
}

/**
 * Default config when no image context available
 */
export const DEFAULT_AKOOL_CONFIG: AkoolAnimationConfig = {
  prompt: 'appetizing food photography, warm inviting lighting, gentle camera movement, cinematic quality, shallow depth of field',
  negativePrompt: NEGATIVE_PROMPT,
  videoLength: 5,
  resolution: '720p',
};

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
 * GOAL: Generate efficient, accurate prompts that create professional food animations
 * without wasting Akool API credits on hallucinated or unrealistic details.
 */
const AKOOL_PROMPT_SYSTEM = `You write prompts for Akool image-to-video AI. Keep prompts SHORT and ACCURATE.

RULES:
1. MAX 30 words - Akool works better with concise prompts
2. Use ONLY the product description provided - don't invent ingredients
3. ONE motion type per prompt (pick the most appetizing for this food type)
4. NO brand names, NO location references
5. NO camera direction words (overhead, close-up, zoom) - Akool handles this automatically

MOTION BY FOOD TYPE:
- PIZZA: "cheese stretching, steam rising from crust"
- SALAD/BOWL: "fresh greens glistening, light catching dressing" (NO cheese pulling for salads!)
- DOUGHNUT: "glaze glistening, soft texture"
- HOT DISHES: "steam rising gently, warmth visible"
- COLD DISHES: "fresh ingredients glistening, vibrant colors"

FORMAT: Return ONLY the prompt, no quotes.

GOOD EXAMPLE (pizza): "Freshly baked pizza, melted cheese stretching, steam rising from golden crust, warm lighting"
GOOD EXAMPLE (salad): "Fresh salad, crisp greens glistening, dressing catching light, vibrant colors"
BAD EXAMPLE: "elegant overhead shot of artisanal pizza with cheese pulling in gooey strings while camera slowly zooms" (too long, has camera directions)`;

/**
 * Build the user prompt for LLM
 * Provides accurate product info so LLM doesn't hallucinate ingredients
 */
function buildAkoolUserPrompt(
  productName: string,
  options: {
    productDescription?: string;
    foodType?: string;
  }
): string {
  const foodType = options.foodType || 'food';

  // Provide clear, structured info for accurate prompt generation
  let prompt = `FOOD TYPE: ${foodType}\n`;
  prompt += `PRODUCT: ${productName}\n`;

  if (options.productDescription && options.productDescription !== productName) {
    prompt += `ACTUAL INGREDIENTS: ${options.productDescription}\n`;
  }

  prompt += `\nWrite a short animation prompt (max 30 words) for this ${foodType}. Only reference ingredients listed above.`;

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

    const prompt = completion.choices[0]?.message?.content?.trim();

    if (!prompt || prompt.length < 20) {
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

/**
 * Generate Akool prompts for multiple images using LLM
 * Processes in parallel for speed
 */
export async function generateAkoolPromptsWithLLM(
  images: Array<{
    sceneId: string;
    productName: string;
    productDescription?: string;
    foodType?: string;
  }>,
  brandName?: string
): Promise<Map<string, AkoolAnimationConfig>> {
  const prompts = new Map<string, AkoolAnimationConfig>();

  // Generate all prompts in parallel
  const results = await Promise.all(
    images.map(async (img, index) => {
      const config = await generateAkoolPromptWithLLM(img.productName, {
        productDescription: img.productDescription,
        foodType: img.foodType,
        brandName,
        sceneIndex: index,
      });
      return { sceneId: img.sceneId, config };
    })
  );

  for (const result of results) {
    prompts.set(result.sceneId, result.config);
  }

  return prompts;
}
