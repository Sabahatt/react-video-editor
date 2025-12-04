/**
 * Script Generator - Uses Groq LLM to generate restaurant ad scripts
 *
 * POC Focus: Optimized for three demo restaurants:
 * - The Doughnut Vault (Chicago artisan donuts)
 * - Joe's Pizza (NYC iconic pizza)
 * - Sweetgreen (healthy salads/bowls)
 */

import Groq from 'groq-sdk';
import {
  generateScriptPrompt,
  getFallbackScript,
  detectPOCRestaurant,
  POC_RESTAURANTS,
} from './prompts';
import type {
  AdTone,
  ScriptGeneratorInput,
  GeneratedScript,
  ScriptGeneratorResult,
  AdScene,
  ContactInfo,
  VisualType,
} from './types';

// Re-export types and POC utilities
export type { AdTone, ScriptGeneratorInput, GeneratedScript, ScriptGeneratorResult, AdScene, ContactInfo, VisualType };
export { detectPOCRestaurant, POC_RESTAURANTS };

/**
 * Compute fullScript by concatenating all scene voiceovers
 * This is more reliable than trusting the LLM to do it
 */
function computeFullScript(scenes: AdScene[]): string {
  return scenes.map(s => s.voiceoverText).join(' ');
}

/**
 * Extract display-friendly website from URL
 * e.g., "https://www.joespizza.com/menu" -> "joespizza.com"
 */
function extractDisplayWebsite(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/**
 * Initialize Groq client
 */
function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
}

/**
 * Parse and validate LLM response
 * Contact info is added separately after parsing
 */
function parseScriptResponse(
  response: string,
  expectedTone: AdTone,
  expectedDuration: number,
  contactInfo?: ContactInfo
): GeneratedScript | null {
  try {
    // Clean up response - remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields - fullScript from LLM is optional now (we compute it)
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== 4) {
      console.error('Invalid script structure:', parsed);
      return null;
    }

    // Valid visual types
    const validVisualTypes: VisualType[] = ['stock_video', 'animated_image', 'logo_brand'];

    // Validate each scene
    const validSceneIds = ['hook', 'value', 'benefit', 'cta'];
    for (let i = 0; i < parsed.scenes.length; i++) {
      const scene = parsed.scenes[i];
      if (!scene.id || !scene.voiceoverText || !scene.displayText || typeof scene.duration !== 'number') {
        console.error('Invalid scene structure:', scene);
        return null;
      }
      if (!validSceneIds.includes(scene.id)) {
        console.error('Invalid scene id:', scene.id);
        return null;
      }
    }

    // Build scenes with visual direction and contact info
    // Trust LLM's visualType choice, with minimal fallbacks
    const scenes: AdScene[] = parsed.scenes.map((s: Record<string, unknown>) => {
      // Use LLM's choice if valid, otherwise smart defaults
      let visualType: VisualType;
      if (s.visualType && validVisualTypes.includes(s.visualType as VisualType)) {
        visualType = s.visualType as VisualType;
      } else {
        // Fallback only if LLM didn't provide valid type
        // CTA always gets logo_brand, others default to animated_image (prefer brand images)
        visualType = s.id === 'cta' ? 'logo_brand' : 'animated_image';
      }

      const scene: AdScene = {
        id: s.id as AdScene['id'],
        voiceoverText: String(s.voiceoverText),
        displayText: String(s.displayText),
        duration: Number(s.duration),
        visualType,
        visualPrompt: String(s.visualPrompt || ''),
      };

      // Add contact overlay to CTA scene
      if (scene.id === 'cta' && contactInfo) {
        scene.contactOverlay = contactInfo;
      }

      return scene;
    });

    // Validation: Ensure at least one animated_image exists (for brand authenticity)
    // If LLM chose all stock_video, upgrade 'value' scene to animated_image
    const hasAnimatedImage = scenes.some(s => s.visualType === 'animated_image');
    if (!hasAnimatedImage) {
      const valueScene = scenes.find(s => s.id === 'value');
      if (valueScene) {
        valueScene.visualType = 'animated_image';
        console.log('Upgraded value scene to animated_image for brand authenticity');
      }
    }

    // Compute fullScript from scene voiceovers (more reliable than LLM)
    const script: GeneratedScript = {
      fullScript: computeFullScript(scenes),
      scenes,
      tone: (parsed.tone as AdTone) || expectedTone,
      totalDuration: Number(parsed.totalDuration) || expectedDuration,
    };

    return script;
  } catch (error) {
    console.error('Failed to parse script response:', error);
    return null;
  }
}

/**
 * Generate an ad script using Groq LLM
 * Enhanced with POC restaurant detection for better results
 */
export async function generateScript(input: ScriptGeneratorInput): Promise<ScriptGeneratorResult> {
  const {
    brandName,
    tagline,
    description,
    cuisine,
    tone = 'friendly',
    duration = 10,
    url,
    contact,
  } = input;

  if (!brandName || brandName.trim().length === 0) {
    return {
      success: false,
      error: 'Brand name is required',
    };
  }

  // Log POC detection for debugging
  const pocRestaurant = detectPOCRestaurant(brandName, url);
  if (pocRestaurant) {
    console.log(`POC Restaurant detected: ${pocRestaurant.brandName}`);
  }

  // Build contact info for CTA scene
  // Use provided contact, or create minimal one from URL
  const contactInfo: ContactInfo | undefined = contact || (url ? {
    website: extractDisplayWebsite(url),
  } : undefined);

  try {
    const groq = getGroqClient();
    const prompt = generateScriptPrompt(brandName, tagline, description, cuisine, tone, duration, url);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Fast and free
      messages: [
        {
          role: 'system',
          content: 'You are an expert advertising copywriter. You output only valid JSON, no explanations or markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Some creativity but not too random
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from Groq');
    }

    const script = parseScriptResponse(responseText, tone, duration, contactInfo);
    if (!script) {
      // Use fallback if parsing fails
      console.warn('Using fallback script due to parsing failure');
      const fallback = getFallbackScript(brandName, tone, duration, url);
      return {
        success: true,
        script: addContactToFallback(fallback, tone, duration, contactInfo),
      };
    }

    return {
      success: true,
      script,
    };
  } catch (error) {
    console.error('Script generation error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('GROQ_API_KEY')) {
        return {
          success: false,
          error: 'Groq API key not configured. Please set GROQ_API_KEY in environment variables.',
        };
      }
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        // Use fallback on rate limit
        console.warn('Rate limited, using fallback script');
        const fallback = getFallbackScript(brandName, tone, duration, url);
        return {
          success: true,
          script: addContactToFallback(fallback, tone, duration, contactInfo),
        };
      }
    }

    // Use fallback for any other error
    console.warn('Using fallback script due to error');
    const fallback = getFallbackScript(brandName, tone, duration, url);
    return {
      success: true,
      script: addContactToFallback(fallback, tone, duration, contactInfo),
    };
  }
}

/**
 * Add contact info to fallback script and compute fullScript
 */
function addContactToFallback(
  fallback: ReturnType<typeof getFallbackScript>,
  tone: AdTone,
  duration: number,
  contactInfo?: ContactInfo
): GeneratedScript {
  const scenes = fallback.scenes.map(scene => {
    if (scene.id === 'cta' && contactInfo) {
      return { ...scene, contactOverlay: contactInfo };
    }
    return scene;
  });

  return {
    fullScript: computeFullScript(scenes),
    scenes,
    tone,
    totalDuration: duration,
  };
}

/**
 * Generate script from scraped data
 * Convenience function that extracts relevant fields from scraper output
 */
export async function generateScriptFromScrapedData(
  scrapedData: {
    brand?: {
      name?: string;
      tagline?: string;
      description?: string;
    };
    cuisine?: string;
    url?: string;
    contact?: {
      phone?: string;
      address?: string;
      hours?: string;
    };
  },
  tone?: AdTone, // Optional - will use POC suggested tone if detected
  duration: number = 10
): Promise<ScriptGeneratorResult> {
  const brandName = scrapedData.brand?.name || 'Restaurant';
  const tagline = scrapedData.brand?.tagline;
  const description = scrapedData.brand?.description;
  const cuisine = scrapedData.cuisine;
  const url = scrapedData.url;

  // Build contact info from scraped data
  const contact: ContactInfo | undefined = scrapedData.contact ? {
    phone: scrapedData.contact.phone,
    address: scrapedData.contact.address,
    hours: scrapedData.contact.hours,
    website: extractDisplayWebsite(url),
  } : (url ? { website: extractDisplayWebsite(url) } : undefined);

  return generateScript({
    brandName,
    tagline,
    description,
    cuisine,
    tone,
    duration,
    url,
    contact,
  });
}
