/**
 * Script Generator Prompts
 *
 * LLM prompt templates for generating ad scripts.
 * The LLM generates all creative copy - we just provide rich context.
 */

import type { AdTone } from './types';
import type { POCBrandConfig } from './poc-brands';
import { buildBrandContextPrompt } from './poc-brands';

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
 * Generate the main prompt for script generation using POC brand context
 * Note: Akool animation prompts are generated separately after image selection
 * to ensure they match the actual image content
 */
export function generatePOCScriptPrompt(
  brand: POCBrandConfig,
  duration: number
): string {
  const brandContext = buildBrandContextPrompt(brand);
  const sceneCount = duration <= 15 ? 4 : 5;
  const sceneDuration = Math.round(duration / sceneCount);
  const wordsPerScene = Math.round(sceneDuration * 2.5);
  const toneDesc = toneDescriptions[brand.tone];

  // Get category names for the prompt
  const categoryNames = Object.keys(brand.menuCategories);

  return `You are an expert video ad copywriter creating a ${duration}-second restaurant commercial.

${brandContext}

REQUIREMENTS:
- Total duration: ${duration} seconds
- Number of scenes: ${sceneCount}
- Each scene: ~${sceneDuration} seconds
- Voiceover: ${wordsPerScene}-${wordsPerScene + 5} words per scene (natural speaking pace ~2.5 words/sec)
- Tone: ${brand.tone} (${toneDesc})

SCENE STRUCTURE:
1. HOOK - Grab attention immediately with brand's unique story/quality
2. VALUE - Highlight what makes them special (ingredients, process, quality)
3. BENEFIT - The experience/result the customer gets
${sceneCount === 5 ? '4. EXTRA - Additional value point or variety showcase\n5. CTA - Call to action with logo' : '4. CTA - Call to action with logo'}

VISUAL CATEGORIES AVAILABLE: ${categoryNames.join(', ')}
- Assign each non-CTA scene a different visualCategory for variety
- The visualCategory determines which product images to show
- CTA scene always uses visualType: "logo_brand"

CREATIVE GUIDELINES:
- Leverage the brand's actual story, awards, quality claims, and heritage
- voiceoverText: Natural, conversational spoken copy that sounds good when read aloud
- displayText: 2-4 words, ALL CAPS, punchy and memorable
- Avoid location-specific references in displayText (use universal appeal)
- Each scene should build on the previous, creating a cohesive narrative
- DON'T be robotic or generic - inject personality and warmth
- Use vivid, sensory language that makes viewers hungry

TONE GUIDANCE for "${brand.tone}":
${brand.tone === 'friendly' ? '- Warm and inviting, like talking to a friend\n- Use words like "discover", "indulge", "savor", "treat yourself"\n- Create a sense of cozy comfort and personal connection' : ''}
${brand.tone === 'playful' ? '- Fun and energetic, slightly cheeky\n- Use punchy phrases and wordplay when appropriate\n- Create excitement and anticipation' : ''}
${brand.tone === 'professional' ? '- Sophisticated and confident\n- Highlight quality, craft, and expertise\n- Create a sense of premium experience' : ''}

OUTPUT FORMAT (JSON only, no markdown):
{
  "scenes": [
    {
      "id": "hook",
      "voiceoverText": "Your compelling hook copy here - make it memorable!",
      "displayText": "HOOK TEXT",
      "duration": ${sceneDuration},
      "visualType": "animated_image",
      "visualCategory": "${categoryNames[0] || 'products'}"
    },
    {
      "id": "value",
      "voiceoverText": "Your value proposition - highlight what's special.",
      "displayText": "VALUE TEXT",
      "duration": ${sceneDuration},
      "visualType": "animated_image",
      "visualCategory": "${categoryNames[1] || categoryNames[0] || 'products'}"
    },
    {
      "id": "benefit",
      "voiceoverText": "The experience they'll enjoy - make them crave it.",
      "displayText": "BENEFIT TEXT",
      "duration": ${sceneDuration},
      "visualType": "animated_image",
      "visualCategory": "${categoryNames[2] || categoryNames[0] || 'products'}"
    },
    {
      "id": "cta",
      "voiceoverText": "Your warm, inviting call to action.",
      "displayText": "ORDER NOW",
      "duration": ${sceneDuration},
      "visualType": "logo_brand",
      "visualCategory": null
    }
  ],
  "tone": "${brand.tone}",
  "totalDuration": ${duration}
}

Return ONLY valid JSON. No markdown code blocks, no explanations.`;
}

/**
 * Generate prompt for non-POC brands (generic approach)
 * Uses whatever brand info was scraped + LLM creativity
 */
export function generateGenericScriptPrompt(
  brandName: string,
  tagline: string | undefined,
  description: string | undefined,
  cuisine: string | undefined,
  tone: AdTone,
  duration: number
): string {
  const sceneCount = duration <= 15 ? 4 : 5;
  const sceneDuration = Math.round(duration / sceneCount);
  const wordsPerScene = Math.round(sceneDuration * 2.5);
  const toneDesc = toneDescriptions[tone];

  let brandContext = `BRAND: ${brandName}`;
  if (tagline) brandContext += `\nTAGLINE: ${tagline}`;
  if (description) brandContext += `\nDESCRIPTION: ${description}`;
  if (cuisine) brandContext += `\nCUISINE: ${cuisine}`;

  return `You are an expert video ad copywriter creating a ${duration}-second restaurant commercial.

${brandContext}

REQUIREMENTS:
- Total duration: ${duration} seconds
- Number of scenes: ${sceneCount}
- Each scene: ~${sceneDuration} seconds
- Voiceover: ${wordsPerScene}-${wordsPerScene + 3} words per scene
- Tone: ${tone} (${toneDesc})

SCENE STRUCTURE:
1. HOOK - Grab attention
2. VALUE - What makes them special
3. BENEFIT - The experience/result
${sceneCount === 5 ? '4. EXTRA - Additional value\n5. CTA - Call to action' : '4. CTA - Call to action'}

CREATIVE GUIDELINES:
- Create compelling copy based on available brand info
- voiceoverText: Natural spoken copy
- displayText: 2-4 words, ALL CAPS
- Keep universal appeal (no location-specific displayText)

ANIMATION PROMPTS:
- akoolPrompt: Subtle motion description (10-15 words)
- akoolNegativePrompt: "blurry, distorted, oversaturated"

OUTPUT FORMAT (JSON only):
{
  "scenes": [
    {
      "id": "hook",
      "voiceoverText": "...",
      "displayText": "...",
      "duration": ${sceneDuration},
      "visualType": "animated_image",
      "visualCategory": "main",
      "akoolPrompt": "...",
      "akoolNegativePrompt": "blurry, distorted, oversaturated"
    },
    ...
  ],
  "tone": "${tone}",
  "totalDuration": ${duration}
}

Return ONLY valid JSON.`;
}

/**
 * Cuisine-specific keywords (kept for fallback/non-POC brands)
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
 * Get cuisine keywords with fallback
 */
export function getCuisineKeywords(cuisine?: string): string[] {
  if (!cuisine) return cuisineKeywords.default;
  const normalized = cuisine.toLowerCase().trim();
  return cuisineKeywords[normalized] || cuisineKeywords.default;
}
