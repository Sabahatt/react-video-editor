/**
 * Visual Matching API - Step 3 of the Ad Pipeline
 *
 * Takes script + scraped data and returns an ENRICHED SCRIPT ready for video assembly:
 * - animated_image scenes: Resolves to best matching scraped image URL
 * - stock_video scenes: Passes prompt through (Pexels step resolves URL)
 * - logo_brand scenes: Resolves to scraped logo URL
 *
 * Output is the same script structure but with `visual` object instead of visualType/visualPrompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { findBestMatchingImages } from '@/lib/visual-selector';

// ============ Input Types ============

interface ScriptScene {
  id: 'hook' | 'value' | 'benefit' | 'cta';
  voiceoverText: string;
  displayText: string;
  duration: number;
  visualType: 'stock_video' | 'animated_image' | 'logo_brand';
  visualPrompt: string;
  contactOverlay?: ContactInfo;
}

interface ContactInfo {
  phone?: string;
  address?: string;
  website?: string;
  hours?: string;
}

interface GeneratedScript {
  fullScript: string;
  scenes: ScriptScene[];
  tone: string;
  totalDuration: number;
}

interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
}

interface BrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  palette?: string[];
}

interface ScrapedData {
  brand?: {
    name?: string;
    cuisine?: string;
  };
  logo?: string;
  images?: ScrapedImage[];
  colors?: BrandColors;
  contact?: ContactInfo;
}

interface MatchVisualsRequest {
  script: GeneratedScript;
  scrapedData: ScrapedData;
}

// ============ Output Types ============

interface ResolvedVisual {
  type: 'animated_image' | 'stock_video' | 'logo_brand';
  url: string | null;  // null if not yet resolved (stock_video)
  alt?: string;
  prompt?: string;     // For stock_video - to be resolved by Pexels step
}

interface EnrichedScene {
  id: 'hook' | 'value' | 'benefit' | 'cta';
  voiceoverText: string;
  displayText: string;
  duration: number;
  visual: ResolvedVisual;
  contactOverlay?: ContactInfo;
}

interface EnrichedScript {
  fullScript: string;
  scenes: EnrichedScene[];
  tone: string;
  totalDuration: number;
}

interface MatchVisualsResponse {
  success: boolean;
  script?: EnrichedScript;
  brand?: {
    name?: string;
    colors?: BrandColors;
    logo?: string;
  };
  error?: string;
}

// ============ Scoring Functions ============

/**
 * Calculate image quality score based on dimensions and type
 */
function calculateImageQuality(image: ScrapedImage): number {
  let score = 0.5;

  const width = image.width || 0;
  const height = image.height || 0;

  if (width >= 400 && height >= 200) {
    score += 0.2;
  } else if (width >= 300 && height >= 150) {
    score += 0.1;
  }

  if (width > 0 && height > 0) {
    const aspectRatio = width / height;
    if (aspectRatio >= 1.3 && aspectRatio <= 1.9) {
      score += 0.15;
    } else if (aspectRatio >= 1.0 && aspectRatio <= 2.0) {
      score += 0.05;
    }
  }

  if (image.type === 'product') {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Stop words to ignore when matching alt-text
 */
const STOP_WORDS = ['a', 'an', 'the', 'with', 'and', 'of', 'on', 'in', 'to', 'for'];

/**
 * Calculate alt-text match score
 */
function calculateAltTextMatch(alt: string | undefined, visualPrompt: string): number {
  if (!alt) return 0;

  const altLower = alt.toLowerCase();
  const promptWords = visualPrompt.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.includes(word));

  if (promptWords.length === 0) return 0;

  const matches = promptWords.filter(word => altLower.includes(word)).length;
  return matches / promptWords.length;
}

/**
 * Normalize CLIP scores to make small differences meaningful
 */
function normalizeScores(results: Array<{ url: string; score: number }>): Array<{ url: string; score: number; normalizedScore: number }> {
  if (results.length === 0) return [];
  if (results.length === 1) {
    return [{ ...results[0], normalizedScore: 1 }];
  }

  const scores = results.map(r => r.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  if (range < 0.01) {
    return results.map(r => ({ ...r, normalizedScore: r.score }));
  }

  return results.map(r => ({
    ...r,
    normalizedScore: (r.score - minScore) / range,
  }));
}

// ============ Main Handler ============

export async function POST(request: NextRequest): Promise<NextResponse<MatchVisualsResponse>> {
  try {
    const body: MatchVisualsRequest = await request.json();
    const { script, scrapedData } = body;

    // Validate input
    if (!script || !script.scenes || !Array.isArray(script.scenes)) {
      return NextResponse.json(
        { success: false, error: 'script with scenes array is required' },
        { status: 400 }
      );
    }

    if (!scrapedData) {
      return NextResponse.json(
        { success: false, error: 'scrapedData is required' },
        { status: 400 }
      );
    }

    const images = scrapedData.images || [];
    const logo = scrapedData.logo;

    // Pre-calculate quality scores for all images
    const imageQualityMap = new Map<string, { image: ScrapedImage; quality: number }>();
    for (const img of images) {
      if (img.url && !img.url.includes('undefined')) {
        imageQualityMap.set(img.url, {
          image: img,
          quality: calculateImageQuality(img),
        });
      }
    }

    const imageUrls = Array.from(imageQualityMap.keys());
    const usedImageUrls = new Set<string>();
    const enrichedScenes: EnrichedScene[] = [];

    // Process each scene
    for (const scene of script.scenes) {
      const enrichedScene: EnrichedScene = {
        id: scene.id,
        voiceoverText: scene.voiceoverText,
        displayText: scene.displayText,
        duration: scene.duration,
        visual: {
          type: scene.visualType,
          url: null,
        },
      };

      // Preserve contactOverlay if present
      if (scene.contactOverlay) {
        enrichedScene.contactOverlay = scene.contactOverlay;
      }

      switch (scene.visualType) {
        case 'animated_image': {
          // Use CLIP + quality + alt-text scoring to find best match
          const availableImages = imageUrls.filter(url => !usedImageUrls.has(url));

          if (availableImages.length > 0) {
            const clipResults = await findBestMatchingImages(
              availableImages,
              scene.visualPrompt
            );

            const normalizedResults = normalizeScores(clipResults);

            // Combine: 50% normalized CLIP + 30% quality + 20% alt-text
            const scoredResults = normalizedResults.map(result => {
              const qualityData = imageQualityMap.get(result.url)!;
              const altTextScore = calculateAltTextMatch(qualityData.image.alt, scene.visualPrompt);

              const combinedScore =
                (result.normalizedScore * 0.5) +
                (qualityData.quality * 0.3) +
                (altTextScore * 0.2);

              return {
                ...result,
                combinedScore,
                image: qualityData.image,
              };
            });

            scoredResults.sort((a, b) => b.combinedScore - a.combinedScore);

            if (scoredResults.length > 0 && scoredResults[0].combinedScore > 0.2) {
              const best = scoredResults[0];
              enrichedScene.visual = {
                type: 'animated_image',
                url: best.url,
                alt: best.image.alt,
              };
              usedImageUrls.add(best.url);
            } else {
              // No good match - pass prompt for potential fallback
              enrichedScene.visual = {
                type: 'animated_image',
                url: null,
                prompt: scene.visualPrompt,
              };
            }
          } else {
            enrichedScene.visual = {
              type: 'animated_image',
              url: null,
              prompt: scene.visualPrompt,
            };
          }
          break;
        }

        case 'stock_video': {
          // Pass through prompt - Pexels step will resolve
          enrichedScene.visual = {
            type: 'stock_video',
            url: null,
            prompt: scene.visualPrompt,
          };
          break;
        }

        case 'logo_brand': {
          enrichedScene.visual = {
            type: 'logo_brand',
            url: logo || null,
          };
          break;
        }
      }

      enrichedScenes.push(enrichedScene);
    }

    // Build enriched script
    const enrichedScript: EnrichedScript = {
      fullScript: script.fullScript,
      scenes: enrichedScenes,
      tone: script.tone,
      totalDuration: script.totalDuration,
    };

    return NextResponse.json({
      success: true,
      script: enrichedScript,
      brand: {
        name: scrapedData.brand?.name,
        colors: scrapedData.colors,
        logo: scrapedData.logo,
      },
    });

  } catch (error) {
    console.error('Visual matching error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Visual matching failed'
      },
      { status: 500 }
    );
  }
}
