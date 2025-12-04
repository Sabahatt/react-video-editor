/**
 * Restaurant-specific prompts for ad script generation
 *
 * POC Focus: Optimized for three demo restaurants:
 * - The Doughnut Vault (Chicago artisan donuts)
 * - Joe's Pizza (NYC iconic pizza)
 * - Sweetgreen (healthy salads/bowls)
 */

import type { AdTone, VisualType } from './types';

/**
 * POC Demo Restaurants - Pre-configured brand knowledge
 * These provide richer context for better script generation
 */
export interface POCRestaurant {
  brandName: string;
  urlPatterns: string[];
  cuisine: string;
  tagline: string;
  description: string;
  uniqueSellingPoints: string[];
  suggestedTone: AdTone;
  keywords: string[];
}

export const POC_RESTAURANTS: POCRestaurant[] = [
  {
    brandName: "The Doughnut Vault",
    urlPatterns: ['doughnutvault', 'doughnut-vault'],
    cuisine: 'bakery',
    tagline: 'Chicago\'s Premier Artisan Donuts',
    description: 'Small-batch, handcrafted donuts made fresh daily in Chicago. Known for old-fashioned glazed, buttermilk old-fashioned, and seasonal specialties. Lines form early because they sell out fast.',
    uniqueSellingPoints: [
      'Small-batch artisan donuts',
      'Made fresh daily',
      'Sells out early every day',
      'Chicago institution',
      'Old-fashioned recipes'
    ],
    suggestedTone: 'friendly',
    keywords: ['artisan', 'small-batch', 'fresh daily', 'handcrafted', 'old-fashioned', 'glazed', 'Chicago']
  },
  {
    brandName: "Joe's Pizza",
    urlPatterns: ['joespizza', 'joes-pizza'],
    cuisine: 'pizza',
    tagline: 'New York\'s Finest Pizza Since 1975',
    description: 'Iconic Greenwich Village pizzeria serving authentic New York-style pizza. Famous for perfectly crispy yet foldable slices with the ideal cheese-to-sauce ratio. A NYC institution featured in Spider-Man.',
    uniqueSellingPoints: [
      'Authentic NYC pizza since 1975',
      'Perfectly foldable slices',
      'Greenwich Village icon',
      'Celebrity favorite',
      'Hand-tossed daily'
    ],
    suggestedTone: 'playful',
    keywords: ['New York', 'authentic', 'hand-tossed', 'crispy', 'iconic', 'slice', 'Greenwich Village', '1975']
  },
  {
    brandName: "Sweetgreen",
    urlPatterns: ['sweetgreen'],
    cuisine: 'salad',
    tagline: 'Real Food, Real Good',
    description: 'Fast-casual restaurant serving healthy salads and warm bowls made with locally-sourced, seasonal ingredients. Focus on sustainability, transparency, and making healthy eating accessible.',
    uniqueSellingPoints: [
      'Locally-sourced ingredients',
      'Seasonal menu',
      'Sustainable practices',
      'Healthy and delicious',
      'Customizable bowls'
    ],
    suggestedTone: 'professional',
    keywords: ['fresh', 'local', 'seasonal', 'sustainable', 'healthy', 'real food', 'bowls', 'salads']
  }
];

/**
 * Detect if the brand matches a POC restaurant
 */
export function detectPOCRestaurant(brandName: string, url?: string): POCRestaurant | null {
  const normalizedBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedUrl = url?.toLowerCase() || '';

  for (const restaurant of POC_RESTAURANTS) {
    // Check brand name match
    const normalizedRestaurantName = restaurant.brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedBrand.includes(normalizedRestaurantName) ||
        normalizedRestaurantName.includes(normalizedBrand)) {
      return restaurant;
    }

    // Check URL patterns
    for (const pattern of restaurant.urlPatterns) {
      if (normalizedUrl.includes(pattern)) {
        return restaurant;
      }
    }
  }

  return null;
}

/**
 * Tone descriptions for the LLM
 */
export const toneDescriptions: Record<AdTone, string> = {
  professional: 'sophisticated, premium, trustworthy, elegant, clean',
  playful: 'fun, energetic, exciting, youthful, bold',
  urgent: 'compelling, time-sensitive, action-oriented, bold',
  friendly: 'warm, welcoming, personal, approachable, cozy',
};

/**
 * Cuisine-specific keywords to enhance script relevance
 */
export const cuisineKeywords: Record<string, string[]> = {
  italian: ['authentic', 'traditional', 'handcrafted', 'fresh ingredients', 'family recipe'],
  pizza: ['fresh dough', 'hand-tossed', 'crispy', 'authentic', 'cheesy', 'slice'],
  bakery: ['fresh baked', 'handcrafted', 'artisan', 'daily', 'small-batch'],
  salad: ['fresh', 'local', 'seasonal', 'healthy', 'crisp', 'vibrant'],
  mexican: ['bold flavors', 'fresh salsa', 'authentic', 'handmade', 'spicy'],
  japanese: ['fresh', 'artisanal', 'traditional', 'premium', 'crafted'],
  chinese: ['wok-fired', 'authentic', 'fresh', 'traditional', 'flavorful'],
  american: ['classic', 'handcrafted', 'quality', 'fresh', 'homestyle'],
  cafe: ['fresh roasted', 'artisanal', 'cozy', 'handcrafted', 'premium'],
  default: ['fresh', 'quality', 'delicious', 'authentic', 'handcrafted'],
};

/**
 * Get cuisine keywords with fallback to default
 */
export function getCuisineKeywords(cuisine?: string): string[] {
  if (!cuisine) return cuisineKeywords.default;
  const normalized = cuisine.toLowerCase().trim();
  return cuisineKeywords[normalized] || cuisineKeywords.default;
}

/**
 * Generate the main prompt for script generation
 * Enhanced with POC restaurant detection and visual direction
 * Prioritizes scraped brand images over stock footage
 */
export function generateScriptPrompt(
  brandName: string,
  tagline: string | undefined,
  description: string | undefined,
  cuisine: string | undefined,
  tone: AdTone,
  duration: number,
  url?: string
): string {
  // Check if this is a POC restaurant for enhanced context
  const pocRestaurant = detectPOCRestaurant(brandName, url);

  // Use POC data if available, otherwise use provided/default values
  const effectiveTagline = tagline || pocRestaurant?.tagline;
  const effectiveDescription = description || pocRestaurant?.description;
  const effectiveCuisine = cuisine || pocRestaurant?.cuisine;
  const effectiveKeywords = pocRestaurant?.keywords || getCuisineKeywords(effectiveCuisine);

  const toneDesc = toneDescriptions[tone];
  const sceneDuration = duration / 4;
  const wordsPerScene = Math.round(sceneDuration * 2.5); // ~2.5 words per second

  // Build enhanced brand context for POC restaurants
  let brandContext = `- Name: ${brandName}`;
  if (effectiveTagline) brandContext += `\n- Tagline: ${effectiveTagline}`;
  if (effectiveDescription) brandContext += `\n- Description: ${effectiveDescription}`;
  if (effectiveCuisine) brandContext += `\n- Cuisine Type: ${effectiveCuisine}`;

  // Add unique selling points for POC restaurants
  let uspContext = '';
  if (pocRestaurant) {
    uspContext = `\nUNIQUE SELLING POINTS (use these for authenticity):
${pocRestaurant.uniqueSellingPoints.map(usp => `- ${usp}`).join('\n')}`;
  }

  return `You are an expert video ad director and copywriter specializing in restaurant commercials.

Create a ${duration}-second video ad script for this restaurant:

BRAND INFO:
${brandContext}
${uspContext}

REQUIREMENTS:
- Tone: ${tone} (${toneDesc})
- Total duration: ${duration} seconds
- 4 scenes, each ${sceneDuration} seconds
- Each scene needs ${wordsPerScene}-${wordsPerScene + 2} words of voiceover (for natural pacing at 2.5 words/sec)

VISUAL TYPES (choose the best for each scene):
- "animated_image": PREFERRED - Use for product shots, food close-ups, signature dishes. These are actual photos from the restaurant's website that will be animated to bring them to life.
- "stock_video": Use sparingly for dynamic atmosphere shots (busy kitchen, food prep action) when the scene describes action/motion rather than a specific product.
- "logo_brand": REQUIRED for the CTA scene - shows logo with brand colors and contact info.

VISUAL STRATEGY:
- Prioritize "animated_image" (2-3 scenes) - these show the REAL brand and products
- Use "stock_video" (0-1 scenes) - only for atmosphere/action that can't be captured in a photo
- Always use "logo_brand" for CTA (1 scene)

SCENE STRUCTURE:

1. HOOK - Grab attention immediately
   - Choose: "animated_image" (hero product) OR "stock_video" (dynamic action)
   - Ask yourself: Is this about a specific product or general atmosphere?

2. VALUE - Show what makes them special
   - Usually: "animated_image" (their signature dish, unique offering)
   - The visualPrompt should describe their actual product

3. BENEFIT - Show the experience/result
   - Choose based on content: "animated_image" (food shot) OR "stock_video" (experience)
   - If describing the food itself → animated_image
   - If describing the experience/atmosphere → stock_video

4. CTA - Drive action
   - Always: "logo_brand"
   - Keep voiceover short and punchy

CRITICAL RULES:
- voiceoverText: ${wordsPerScene}-${wordsPerScene + 2} words per scene (MUST match duration for natural pacing)
- displayText: 2-4 words, ALL CAPS, complements voiceover (NOT identical)
- visualType: Choose based on scene content, prioritize animated_image for product shots
- Keywords to incorporate: ${effectiveKeywords.join(', ')}

VISUAL PROMPT GUIDELINES (VERY IMPORTANT):
The visualPrompt is used to match against actual product images scraped from the restaurant's website.
These images typically have names like "Pepperoni Pizza", "Cheese Pizza", "Caesar Salad", "Glazed Donut", etc.

For animated_image scenes, write visualPrompt as a CONCRETE PRODUCT NAME that would match menu items:
- GOOD: "pepperoni pizza", "cheese pizza slice", "glazed donut", "caesar salad bowl"
- GOOD: "whole pizza with melted mozzarella", "fresh salad with grilled chicken"
- BAD: "foldable slice with perfect cheese ratio" (too abstract, won't match any product name)
- BAD: "crispy yet foldable" (describes qualities, not the actual product)

Think: "What would this dish be called on a menu?" - that's your visualPrompt.

For stock_video scenes, describe the ACTION or ATMOSPHERE:
- GOOD: "busy restaurant kitchen with chefs cooking", "customers enjoying food at tables"
- These will be searched on stock video sites, so be descriptive of the scene.

OUTPUT FORMAT (JSON only):
{
  "scenes": [
    {
      "id": "hook",
      "voiceoverText": "Six to eight words grabbing attention.",
      "displayText": "TWO TO FOUR WORDS",
      "duration": ${sceneDuration},
      "visualType": "animated_image or stock_video",
      "visualPrompt": "concrete product name OR action scene description"
    },
    {
      "id": "value",
      "voiceoverText": "Six to eight words highlighting uniqueness.",
      "displayText": "VALUE PROPOSITION",
      "duration": ${sceneDuration},
      "visualType": "animated_image",
      "visualPrompt": "signature dish name (e.g., pepperoni pizza, glazed donut)"
    },
    {
      "id": "benefit",
      "voiceoverText": "Six to eight words about the experience.",
      "displayText": "BENEFIT TEXT",
      "duration": ${sceneDuration},
      "visualType": "animated_image or stock_video",
      "visualPrompt": "product name or scene description"
    },
    {
      "id": "cta",
      "voiceoverText": "Short call to action.",
      "displayText": "ORDER NOW",
      "duration": ${sceneDuration},
      "visualType": "logo_brand",
      "visualPrompt": "logo with brand colors"
    }
  ],
  "tone": "${tone}",
  "totalDuration": ${duration}
}

Return ONLY valid JSON.`;
}

/**
 * POC-specific fallback scripts for demo restaurants
 * Includes visual direction for each scene
 */
type FallbackSceneType = {
  id: 'hook' | 'value' | 'benefit' | 'cta';
  voiceoverText: string;
  displayText: string;
  duration: number;
  visualType: VisualType;
  visualPrompt: string;
};

type FallbackScriptType = {
  scenes: FallbackSceneType[];
};

const POC_FALLBACK_SCRIPTS: Record<string, (duration: number) => FallbackScriptType> = {
  'doughnutvault': (duration: number) => {
    const d = duration / 4;
    return {
      scenes: [
        {
          id: 'hook',
          voiceoverText: 'The line forms early for a reason.',
          displayText: 'WORTH THE WAIT',
          duration: d,
          visualType: 'stock_video',
          visualPrompt: 'fresh donuts bakery'
        },
        {
          id: 'value',
          voiceoverText: 'Small-batch artisan donuts, made fresh every morning.',
          displayText: 'SMALL-BATCH ARTISAN',
          duration: d,
          visualType: 'animated_image',
          visualPrompt: 'glazed donut'
        },
        {
          id: 'benefit',
          voiceoverText: 'Old-fashioned recipes. Unforgettable taste.',
          displayText: 'UNFORGETTABLE TASTE',
          duration: d,
          visualType: 'animated_image',
          visualPrompt: 'old fashioned donut'
        },
        {
          id: 'cta',
          voiceoverText: "Get yours before they're gone.",
          displayText: 'GET YOURS NOW',
          duration: d,
          visualType: 'logo_brand',
          visualPrompt: 'Doughnut Vault logo with brand colors'
        },
      ],
    };
  },
  'joespizza': (duration: number) => {
    const d = duration / 4;
    return {
      scenes: [
        {
          id: 'hook',
          voiceoverText: 'This is what real New York pizza looks like.',
          displayText: 'REAL NYC PIZZA',
          duration: d,
          visualType: 'animated_image',
          visualPrompt: 'pepperoni pizza'
        },
        {
          id: 'value',
          voiceoverText: 'Hand-tossed perfection since nineteen seventy-five.',
          displayText: 'SINCE 1975',
          duration: d,
          visualType: 'stock_video',
          visualPrompt: 'pizza chef tossing dough'
        },
        {
          id: 'benefit',
          voiceoverText: 'Crispy crust. Perfect fold. Every single time.',
          displayText: 'PERFECT SLICE',
          duration: d,
          visualType: 'animated_image',
          visualPrompt: 'cheese pizza slice'
        },
        {
          id: 'cta',
          voiceoverText: 'Grab a slice today.',
          displayText: 'GRAB A SLICE',
          duration: d,
          visualType: 'logo_brand',
          visualPrompt: 'Joe\'s Pizza logo with red and white colors'
        },
      ],
    };
  },
  'sweetgreen': (duration: number) => {
    const d = duration / 4;
    return {
      scenes: [
        {
          id: 'hook',
          voiceoverText: 'Real food that actually tastes incredible.',
          displayText: 'REAL FOOD',
          duration: d,
          visualType: 'stock_video',
          visualPrompt: 'fresh salad preparation'
        },
        {
          id: 'value',
          voiceoverText: 'Locally sourced ingredients. Seasonally inspired menu.',
          displayText: 'LOCAL & SEASONAL',
          duration: d,
          visualType: 'animated_image',
          visualPrompt: 'harvest bowl'
        },
        {
          id: 'benefit',
          voiceoverText: 'Fuel your day without the compromise.',
          displayText: 'FUEL YOUR DAY',
          duration: d,
          visualType: 'animated_image',
          visualPrompt: 'kale caesar salad'
        },
        {
          id: 'cta',
          voiceoverText: 'Order your bowl now.',
          displayText: 'ORDER NOW',
          duration: d,
          visualType: 'logo_brand',
          visualPrompt: 'Sweetgreen logo with green brand colors'
        },
      ],
    };
  },
};

/**
 * Fallback script template when LLM fails
 * Uses POC-specific scripts when detected, otherwise generic templates
 */
export function getFallbackScript(
  brandName: string,
  tone: AdTone,
  duration: number,
  url?: string
): FallbackScriptType {
  const d = duration / 4;

  // Check for POC restaurant first
  const pocRestaurant = detectPOCRestaurant(brandName, url);
  if (pocRestaurant) {
    const normalizedName = pocRestaurant.brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pocFallback = POC_FALLBACK_SCRIPTS[normalizedName];
    if (pocFallback) {
      return pocFallback(duration);
    }
  }

  // Generic fallback templates by tone (prioritize animated_image for brand authenticity)
  const templates: Record<AdTone, FallbackScriptType> = {
    friendly: {
      scenes: [
        { id: 'hook', voiceoverText: `Step inside ${brandName} and discover something special.`, displayText: 'DISCOVER', duration: d, visualType: 'animated_image', visualPrompt: 'welcoming restaurant storefront or interior' },
        { id: 'value', voiceoverText: 'Fresh ingredients prepared with love every single day.', displayText: 'MADE WITH LOVE', duration: d, visualType: 'animated_image', visualPrompt: 'signature dish close-up with fresh ingredients' },
        { id: 'benefit', voiceoverText: 'Taste the difference that quality makes.', displayText: 'TASTE THE DIFFERENCE', duration: d, visualType: 'animated_image', visualPrompt: 'appetizing food ready to serve' },
        { id: 'cta', voiceoverText: 'Visit us today.', displayText: 'VISIT TODAY', duration: d, visualType: 'logo_brand', visualPrompt: 'restaurant logo with brand colors' },
      ],
    },
    professional: {
      scenes: [
        { id: 'hook', voiceoverText: `Experience the excellence of ${brandName}.`, displayText: 'EXPERIENCE EXCELLENCE', duration: d, visualType: 'animated_image', visualPrompt: 'elegant restaurant interior or premium dish' },
        { id: 'value', voiceoverText: 'Premium quality ingredients. Exceptional culinary craft.', displayText: 'PREMIUM QUALITY', duration: d, visualType: 'animated_image', visualPrompt: 'beautifully plated premium dish' },
        { id: 'benefit', voiceoverText: 'Elevate your dining experience to new heights.', displayText: 'ELEVATE YOUR EXPERIENCE', duration: d, visualType: 'animated_image', visualPrompt: 'stunning food presentation' },
        { id: 'cta', voiceoverText: 'Reserve your table now.', displayText: 'RESERVE NOW', duration: d, visualType: 'logo_brand', visualPrompt: 'restaurant logo with elegant brand colors' },
      ],
    },
    playful: {
      scenes: [
        { id: 'hook', voiceoverText: 'Hey food lovers, get ready for something amazing!', displayText: 'FOOD LOVERS!', duration: d, visualType: 'animated_image', visualPrompt: 'exciting colorful food spread' },
        { id: 'value', voiceoverText: `${brandName} is bringing the flavor like nobody else.`, displayText: 'BRINGING FLAVOR', duration: d, visualType: 'animated_image', visualPrompt: 'colorful appetizing signature dish' },
        { id: 'benefit', voiceoverText: 'Every bite is a party for your taste buds.', displayText: 'PARTY TIME', duration: d, visualType: 'animated_image', visualPrompt: 'delicious food close-up' },
        { id: 'cta', voiceoverText: 'Order now and join the fun!', displayText: 'ORDER NOW!', duration: d, visualType: 'logo_brand', visualPrompt: 'restaurant logo with vibrant colors' },
      ],
    },
    urgent: {
      scenes: [
        { id: 'hook', voiceoverText: "Don't miss out on this incredible taste!", displayText: "DON'T MISS OUT!", duration: d, visualType: 'animated_image', visualPrompt: 'irresistible hero food shot' },
        { id: 'value', voiceoverText: `${brandName} has exactly what you're craving right now.`, displayText: 'YOUR CRAVING', duration: d, visualType: 'animated_image', visualPrompt: 'mouth-watering food close-up' },
        { id: 'benefit', voiceoverText: 'Limited time. Unlimited deliciousness.', displayText: 'LIMITED TIME', duration: d, visualType: 'animated_image', visualPrompt: 'tempting food ready to order' },
        { id: 'cta', voiceoverText: 'Order today before its gone!', displayText: 'ORDER TODAY!', duration: d, visualType: 'logo_brand', visualPrompt: 'restaurant logo with bold colors' },
      ],
    },
  };

  return templates[tone] || templates.friendly;
}
