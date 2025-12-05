/**
 * Resolve Stock Videos API - Step 4b of the Ad Pipeline
 *
 * Takes an enriched script (from match-visuals) and resolves all stock_video scenes
 * by fetching appropriate videos from Pexels API.
 *
 * Input: Enriched script with stock_video scenes having { type: 'stock_video', url: null, prompt: '...' }
 * Output: Same script with stock_video URLs resolved
 */

import { NextRequest, NextResponse } from 'next/server';
import { findStockVideo, StockVideoResult } from '@/lib/stock-video';

// ============ Types ============

interface ResolvedVisual {
  type: 'animated_image' | 'stock_video' | 'logo_brand';
  url: string | null;
  alt?: string;
  prompt?: string;
}

interface ContactInfo {
  phone?: string;
  address?: string;
  website?: string;
  hours?: string;
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

interface BrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  palette?: string[];
}

interface BrandInfo {
  name?: string;
  colors?: BrandColors;
  logo?: string;
  cuisine?: string;
}

interface ResolveStockVideosRequest {
  script: EnrichedScript;
  brand?: BrandInfo;
}

interface ResolveStockVideosResponse {
  success: boolean;
  script?: EnrichedScript;
  brand?: BrandInfo;
  stockVideos?: Record<string, StockVideoResult>;
  error?: string;
}

// ============ Main Handler ============

export async function POST(request: NextRequest): Promise<NextResponse<ResolveStockVideosResponse>> {
  try {
    const body: ResolveStockVideosRequest = await request.json();
    const { script, brand } = body;

    // Validate input
    if (!script || !script.scenes || !Array.isArray(script.scenes)) {
      return NextResponse.json(
        { success: false, error: 'script with scenes array is required' },
        { status: 400 }
      );
    }

    const cuisine = brand?.cuisine;

    // Track resolved stock videos for reference
    const stockVideos: Record<string, StockVideoResult> = {};

    // Process scenes and resolve stock_video types
    const resolvedScenes: EnrichedScene[] = await Promise.all(
      script.scenes.map(async (scene) => {
        // Only process stock_video scenes that need resolution
        if (scene.visual.type !== 'stock_video' || scene.visual.url) {
          return scene;
        }

        // Find a stock video for this scene
        // Uses cleaned prompt directly, cuisine as fallback
        const visualPrompt = scene.visual.prompt || scene.voiceoverText;
        const stockVideo = await findStockVideo(visualPrompt, {
          cuisine,
          sceneId: scene.id,
          preferredDuration: scene.duration,
        });

        if (stockVideo) {
          stockVideos[scene.id] = stockVideo;

          return {
            ...scene,
            visual: {
              type: 'stock_video' as const,
              url: stockVideo.url,
              alt: `Stock video: ${visualPrompt}`,
            },
          };
        }

        // Could not resolve - keep the prompt for manual resolution
        console.warn(`Could not find stock video for scene ${scene.id}: "${visualPrompt}"`);
        return scene;
      })
    );

    // Build resolved script
    const resolvedScript: EnrichedScript = {
      ...script,
      scenes: resolvedScenes,
    };

    // Count resolved vs unresolved
    const stockScenes = resolvedScenes.filter(s => s.visual.type === 'stock_video');
    const resolvedCount = stockScenes.filter(s => s.visual.url).length;
    const totalStockScenes = stockScenes.length;

    console.log(`Resolved ${resolvedCount}/${totalStockScenes} stock video scenes`);

    return NextResponse.json({
      success: true,
      script: resolvedScript,
      brand,
      stockVideos,
    });

  } catch (error) {
    console.error('Stock video resolution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Stock video resolution failed'
      },
      { status: 500 }
    );
  }
}
