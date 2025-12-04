/**
 * Visual Matching API - Step 3 of the Ad Pipeline
 *
 * Takes scraped images + generated script and matches visuals to scenes:
 * - animated_image scenes: Uses CLIP + quality scoring to find best scraped image
 * - stock_video scenes: Passes through visualPrompt (Pexels step handles query)
 * - logo_brand scenes: Uses scraped logo
 */

import { NextRequest, NextResponse } from 'next/server';
import { findBestMatchingImages } from '@/lib/visual-selector';

// Types matching script generator output
interface AdScene {
  id: 'hook' | 'value' | 'benefit' | 'cta';
  voiceoverText: string;
  displayText: string;
  duration: number;
  visualType: 'stock_video' | 'animated_image' | 'logo_brand';
  visualPrompt: string;
  contactOverlay?: {
    phone?: string;
    address?: string;
    website?: string;
    hours?: string;
  };
}

interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
}

interface MatchedScene {
  sceneId: string;
  visualType: 'stock_video' | 'animated_image' | 'logo_brand';
  visualPrompt: string;
  // For animated_image - matched scraped image
  matchedImage?: {
    url: string;
    alt?: string;
    score: number;
    qualityScore: number;
    combinedScore: number;
    width?: number;
    height?: number;
  };
  // For logo_brand - logo URL
  logoUrl?: string;
}

interface MatchVisualsRequest {
  scenes: AdScene[];
  images: ScrapedImage[];
  logo?: string;
}

interface MatchVisualsResponse {
  success: boolean;
  matches?: MatchedScene[];
  error?: string;
  timing?: {
    total: number;
    clipMatching: number;
  };
}

/**
 * Calculate image quality score based on dimensions and type
 * Returns 0-1 score where higher is better
 *
 * Note: Scraper already filters out icons/thumbnails (<100px),
 * so we focus on preferring larger, well-composed images
 */
function calculateImageQuality(image: ScrapedImage): number {
  let score = 0.5; // Base score

  const width = image.width || 0;
  const height = image.height || 0;

  // Prefer larger images (better for video quality)
  if (width >= 400 && height >= 200) {
    score += 0.2; // Large image bonus
  } else if (width >= 300 && height >= 150) {
    score += 0.1; // Medium image bonus
  }

  // Prefer landscape aspect ratio for video (16:9 to 4:3 range)
  if (width > 0 && height > 0) {
    const aspectRatio = width / height;
    if (aspectRatio >= 1.3 && aspectRatio <= 1.9) {
      score += 0.15; // Ideal video aspect ratio
    } else if (aspectRatio >= 1.0 && aspectRatio <= 2.0) {
      score += 0.05; // Acceptable aspect ratio
    }
    // Square or portrait images don't get bonus but aren't penalized
  }

  // Prefer product-type images (scraper classifies these)
  if (image.type === 'product') {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score)); // Clamp to 0-1
}

/**
 * Stop words to ignore when matching alt-text to visual prompt
 */
const STOP_WORDS = ['a', 'an', 'the', 'with', 'and', 'of', 'on', 'in', 'to', 'for'];

/**
 * Calculate alt-text match score
 * Checks how many meaningful keywords from the visual prompt appear in the image's alt text
 */
function calculateAltTextMatch(alt: string | undefined, visualPrompt: string): number {
  if (!alt) return 0;

  const altLower = alt.toLowerCase();
  const promptWords = visualPrompt.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.includes(word));

  if (promptWords.length === 0) return 0;

  // Count how many prompt keywords appear in alt text
  const matches = promptWords.filter(word => altLower.includes(word)).length;
  return matches / promptWords.length; // 0-1 score
}

/**
 * Normalize CLIP scores to make small differences meaningful
 * When all scores are 95-99%, this spreads them to 0-100%
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

  // If all scores are nearly identical, use original scores
  if (range < 0.01) {
    return results.map(r => ({ ...r, normalizedScore: r.score }));
  }

  // Normalize to 0-1 range
  return results.map(r => ({
    ...r,
    normalizedScore: (r.score - minScore) / range,
  }));
}

export async function POST(request: NextRequest): Promise<NextResponse<MatchVisualsResponse>> {
  const startTime = Date.now();
  let clipTime = 0;

  try {
    const body: MatchVisualsRequest = await request.json();
    const { scenes, images, logo } = body;

    // Validate input
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'scenes array is required' },
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { success: false, error: 'images array is required' },
        { status: 400 }
      );
    }

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
    const matches: MatchedScene[] = [];
    const usedImageUrls = new Set<string>();

    // Process each scene
    for (const scene of scenes) {
      const match: MatchedScene = {
        sceneId: scene.id,
        visualType: scene.visualType,
        visualPrompt: scene.visualPrompt,
      };

      switch (scene.visualType) {
        case 'animated_image': {
          // Use CLIP + quality + alt-text scoring to find best matching scraped image
          if (imageUrls.length > 0) {
            const clipStart = Date.now();

            // Filter out already used images
            const availableImages = imageUrls.filter(url => !usedImageUrls.has(url));

            if (availableImages.length > 0) {
              // Use full visual prompt - CLIP needs coherent phrases
              const clipResults = await findBestMatchingImages(
                availableImages,
                scene.visualPrompt
              );

              clipTime += Date.now() - clipStart;

              // Normalize CLIP scores so small differences become meaningful
              const normalizedResults = normalizeScores(clipResults);

              // Combine normalized CLIP + quality + alt-text match
              // Formula: 50% normalized CLIP + 30% quality + 20% alt-text match
              const scoredResults = normalizedResults.map(result => {
                const qualityData = imageQualityMap.get(result.url)!;
                const altTextScore = calculateAltTextMatch(qualityData.image.alt, scene.visualPrompt);

                const combinedScore =
                  (result.normalizedScore * 0.5) +
                  (qualityData.quality * 0.3) +
                  (altTextScore * 0.2);

                return {
                  ...result,
                  qualityScore: qualityData.quality,
                  altTextScore,
                  combinedScore,
                  image: qualityData.image,
                };
              });

              // Sort by combined score
              scoredResults.sort((a, b) => b.combinedScore - a.combinedScore);

              // Pick best if it meets minimum threshold
              if (scoredResults.length > 0 && scoredResults[0].combinedScore > 0.2) {
                const best = scoredResults[0];
                match.matchedImage = {
                  url: best.url,
                  alt: best.image.alt,
                  score: best.score, // Original CLIP score for reference
                  qualityScore: best.qualityScore,
                  combinedScore: best.combinedScore,
                  width: best.image.width,
                  height: best.image.height,
                };
                usedImageUrls.add(best.url);
              }
            }
          }
          // Note: If no match found, scene still has visualPrompt for fallback handling
          break;
        }

        case 'stock_video': {
          // Pass through - visualPrompt is used by Pexels step
          // No additional processing needed here
          break;
        }

        case 'logo_brand': {
          // Use scraped logo
          if (logo) {
            match.logoUrl = logo;
          }
          break;
        }
      }

      matches.push(match);
    }

    return NextResponse.json({
      success: true,
      matches,
      timing: {
        total: Date.now() - startTime,
        clipMatching: clipTime,
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
