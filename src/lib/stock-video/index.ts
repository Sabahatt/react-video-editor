/**
 * Stock Video Library - Step 4 of the Ad Pipeline
 *
 * Provides cuisine-specific video queries and handles Pexels API integration
 * for resolving stock_video scenes in enriched scripts.
 *
 * POC Focus: Curated queries for demo restaurants (Doughnut Vault, Joe's Pizza, Sweetgreen)
 */

// ============ POC Restaurant Video Queries ============

/**
 * POC-specific curated Pexels queries that are PROVEN to return great footage
 * These are manually tested and selected for the demo
 */
export const POC_VIDEO_QUERIES: Record<string, Record<string, string[]>> = {
  // The Doughnut Vault - bakery/donut shop
  'doughnutvault': {
    'fresh donuts bakery': ['donut shop', 'fresh donuts', 'bakery morning'],
    'bakery kitchen': ['bakery kitchen', 'pastry chef baking', 'fresh baked goods'],
    'donut making': ['donut frying', 'glazing donuts', 'bakery preparation'],
    'default': ['bakery', 'fresh donuts', 'pastry shop'],
  },
  // Joe's Pizza - NYC pizza
  'joespizza': {
    'pizza chef tossing dough': ['pizza dough tossing', 'pizza chef', 'making pizza dough'],
    'pizza oven': ['pizza oven fire', 'brick oven pizza', 'pizza baking'],
    'busy pizzeria': ['pizzeria kitchen', 'pizza restaurant busy', 'pizza making'],
    'customers enjoying food at tables': ['restaurant customers eating', 'people eating pizza', 'pizzeria dining'],
    'default': ['pizza making', 'italian pizza', 'pizza chef'],
  },
  // Sweetgreen - healthy salads
  'sweetgreen': {
    'fresh salad preparation': ['salad preparation', 'chef making salad', 'fresh vegetables cutting'],
    'healthy food kitchen': ['healthy restaurant kitchen', 'salad bar', 'fresh ingredients prep'],
    'vegetables chopping': ['chopping vegetables', 'fresh produce', 'salad ingredients'],
    'default': ['healthy salad', 'fresh vegetables', 'salad restaurant'],
  },
};

/**
 * Get POC restaurant key from brand name or URL
 */
export function getPOCRestaurantKey(brandName?: string, url?: string): string | null {
  const text = `${brandName || ''} ${url || ''}`.toLowerCase();

  if (text.includes('doughnut') || text.includes('vault')) {
    return 'doughnutvault';
  }
  if (text.includes('joe') && text.includes('pizza')) {
    return 'joespizza';
  }
  if (text.includes('sweetgreen')) {
    return 'sweetgreen';
  }

  return null;
}

// ============ Cuisine Query Mappings (fallback for non-POC) ============

/**
 * Maps cuisine types to relevant Pexels search queries
 * These queries are optimized to return high-quality restaurant/food footage
 */
export const CUISINE_QUERIES: Record<string, string[]> = {
  italian: [
    'pizza making',
    'italian restaurant',
    'pasta cooking',
    'pizza oven',
    'italian kitchen',
  ],
  pizza: [
    'pizza dough tossing',
    'pizza chef',
    'pizza oven fire',
    'pizzeria kitchen',
  ],
  mexican: [
    'taco preparation',
    'mexican food',
    'salsa making',
    'mexican restaurant',
    'tortilla making',
  ],
  japanese: [
    'sushi chef',
    'japanese restaurant',
    'ramen cooking',
    'sushi preparation',
    'japanese kitchen',
  ],
  chinese: [
    'chinese cooking',
    'wok cooking',
    'chinese restaurant',
    'dim sum',
    'noodle making',
  ],
  american: [
    'burger grilling',
    'american diner',
    'fries cooking',
    'bbq cooking',
    'grill restaurant',
  ],
  indian: [
    'indian cooking',
    'curry preparation',
    'indian restaurant',
    'tandoor cooking',
    'spice cooking',
  ],
  thai: [
    'thai cooking',
    'thai restaurant',
    'wok stir fry',
    'thai kitchen',
    'noodle cooking',
  ],
  mediterranean: [
    'mediterranean food',
    'kebab grilling',
    'mediterranean restaurant',
    'fresh salad preparation',
    'olive oil cooking',
  ],
  french: [
    'french cuisine',
    'bakery kitchen',
    'french restaurant',
    'pastry chef',
    'fine dining',
  ],
  cafe: [
    'barista',
    'coffee pour',
    'cafe atmosphere',
    'latte art',
    'coffee shop',
  ],
  bakery: [
    'donut shop',
    'bakery kitchen',
    'pastry chef',
    'fresh baking',
    'donut making',
  ],
  salad: [
    'salad preparation',
    'healthy restaurant',
    'fresh vegetables',
    'chef making salad',
  ],
  healthy: [
    'salad preparation',
    'healthy food',
    'fresh vegetables',
    'smoothie making',
    'healthy restaurant',
  ],
  default: [
    'restaurant cooking',
    'food preparation',
    'chef kitchen',
    'cooking food',
    'restaurant kitchen',
  ],
};

/**
 * Generic scene-type queries for fallback
 */
export const SCENE_QUERIES: Record<string, string[]> = {
  hook: ['food close up', 'delicious food', 'appetizing dish'],
  value: ['chef cooking', 'fresh ingredients', 'food preparation'],
  benefit: ['customers eating', 'restaurant atmosphere', 'happy dining'],
  cta: ['restaurant interior', 'food serving', 'restaurant service'],
};

// ============ Types ============

export interface StockVideoResult {
  id: string;
  url: string;
  preview: string;
  width: number;
  height: number;
  duration: number;
}

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

export interface PexelsApiVideo {
  id: `pexels_video_${number}`;
  details: {
    src: string;
    width: number;
    height: number;
    duration: number;
    fps: number;
  };
  preview: string;
  type: 'video';
  metadata: {
    pexels_id: number;
    video_files: PexelsVideoFile[];
  };
}

export interface PexelsApiResponse {
  videos: PexelsApiVideo[];
  total_results: number;
  page: number;
  per_page: number;
}

// ============ Query Building ============

/**
 * Get the best search query for a scene based on cuisine and visual prompt
 */
export function buildVideoQuery(
  visualPrompt: string,
  cuisine?: string,
  sceneId?: string
): string {
  // First, try the visual prompt directly (it may be descriptive enough)
  // e.g., "customers enjoying food at tables"
  if (visualPrompt && visualPrompt.length > 10) {
    return visualPrompt;
  }

  // Fall back to cuisine-specific queries
  const cuisineQueries = CUISINE_QUERIES[cuisine?.toLowerCase() || 'default'] || CUISINE_QUERIES.default;

  // If we have a scene ID, try scene-specific queries first
  if (sceneId) {
    const sceneQueries = SCENE_QUERIES[sceneId];
    if (sceneQueries && sceneQueries.length > 0) {
      // Combine cuisine context with scene type
      return `${cuisineQueries[0]} ${sceneQueries[0]}`;
    }
  }

  // Return the first cuisine query
  return cuisineQueries[0];
}

/**
 * Get multiple query variants for better results
 * POC restaurants get curated queries that are proven to work well
 */
export function getQueryVariants(
  visualPrompt: string,
  cuisine?: string,
  sceneId?: string,
  brandName?: string
): string[] {
  const queries: string[] = [];

  // Check if this is a POC restaurant first
  const pocKey = getPOCRestaurantKey(brandName);
  if (pocKey && POC_VIDEO_QUERIES[pocKey]) {
    const pocQueries = POC_VIDEO_QUERIES[pocKey];

    // Try to find exact match for the visual prompt
    const promptLower = visualPrompt.toLowerCase();
    for (const [promptKey, queryList] of Object.entries(pocQueries)) {
      if (promptKey !== 'default' && promptLower.includes(promptKey.split(' ')[0])) {
        queries.push(...queryList);
        break;
      }
    }

    // If no exact match, use default POC queries
    if (queries.length === 0 && pocQueries['default']) {
      queries.push(...pocQueries['default']);
    }

    // POC queries are curated, so return them directly
    if (queries.length > 0) {
      return queries;
    }
  }

  // Non-POC: use visual prompt and cuisine queries
  if (visualPrompt && visualPrompt.length > 5) {
    queries.push(visualPrompt);
  }

  // Add cuisine-specific queries
  const cuisineQueries = CUISINE_QUERIES[cuisine?.toLowerCase() || 'default'] || CUISINE_QUERIES.default;
  queries.push(...cuisineQueries.slice(0, 2));

  // Add scene-specific queries
  if (sceneId && SCENE_QUERIES[sceneId]) {
    queries.push(...SCENE_QUERIES[sceneId].slice(0, 1));
  }

  // Remove duplicates
  return [...new Set(queries)];
}

// ============ Video Selection ============

/**
 * Select the best video from results based on quality and duration
 * Prioritizes videos that closely match the scene duration
 */
export function selectBestVideo(
  videos: PexelsApiVideo[],
  preferredDuration?: number
): StockVideoResult | null {
  if (!videos || videos.length === 0) {
    return null;
  }

  // Default scene duration if not specified
  const targetDuration = preferredDuration || 3;

  // Score each video
  const scored = videos.map(video => {
    let score = 0;
    const duration = video.details.duration;

    // Duration scoring - prioritize videos close to target duration
    // Videos can be trimmed down but not extended, so slightly longer is OK
    const durationDiff = duration - targetDuration;

    if (durationDiff >= 0 && durationDiff <= 2) {
      // Perfect: video is 0-2s longer than needed (easy trim)
      score += 40;
    } else if (durationDiff > 2 && durationDiff <= 5) {
      // Good: video is 2-5s longer (still trimmable)
      score += 30;
    } else if (durationDiff > 5 && durationDiff <= 10) {
      // OK: video is 5-10s longer (more trimming needed)
      score += 15;
    } else if (durationDiff < 0 && durationDiff >= -1) {
      // Slightly short but usable (can slow down slightly)
      score += 25;
    } else if (durationDiff < -1) {
      // Too short - penalize
      score += 5;
    } else {
      // Way too long (>10s extra)
      score += 10;
    }

    // Prefer HD quality (1080p or higher)
    if (video.details.height >= 1080) {
      score += 25;
    } else if (video.details.height >= 720) {
      score += 15;
    } else {
      score += 5;
    }

    // Prefer landscape aspect ratio for video ads (16:9 ideal)
    const aspectRatio = video.details.width / video.details.height;
    if (aspectRatio >= 1.7 && aspectRatio <= 1.85) {
      score += 20; // Perfect 16:9
    } else if (aspectRatio >= 1.5 && aspectRatio <= 2.0) {
      score += 15; // Close to 16:9
    } else if (aspectRatio >= 1.0 && aspectRatio < 1.5) {
      score += 5; // Square-ish, less ideal
    }
    // Portrait videos get no bonus

    return { video, score, duration };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Log top 3 candidates for debugging
  console.log(`Video selection for ${targetDuration}s scene:`);
  scored.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i + 1}. Score ${s.score}: ${s.duration}s, ${s.video.details.height}p`);
  });

  const best = scored[0].video;

  // Find the best quality video file (HD preferred)
  const hdFile = best.metadata.video_files.find(f => f.quality === 'hd');
  const sdFile = best.metadata.video_files.find(f => f.quality === 'sd');
  const bestFile = hdFile || sdFile || best.metadata.video_files[0];

  return {
    id: best.id,
    url: bestFile?.link || best.details.src,
    preview: best.preview,
    width: bestFile?.width || best.details.width,
    height: bestFile?.height || best.details.height,
    duration: best.details.duration,
  };
}

// ============ API Integration ============

const PEXELS_API_BASE_URL = 'https://api.pexels.com/videos';

interface PexelsRawVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  video_files: PexelsVideoFile[];
  video_pictures: Array<{ id: number; picture: string; nr: number }>;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsRawVideo[];
}

/**
 * Fetch videos directly from Pexels API
 */
export async function fetchPexelsVideos(
  query: string,
  apiKey?: string
): Promise<PexelsApiVideo[]> {
  const key = apiKey || process.env.PEXELS_API_KEY;

  if (!key) {
    console.warn('PEXELS_API_KEY not configured - stock videos will not be resolved');
    return [];
  }

  try {
    const url = `${PEXELS_API_BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=10`;
    const response = await fetch(url, {
      headers: {
        Authorization: key,
      },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      return [];
    }

    const data: PexelsSearchResponse = await response.json();

    // Transform to our internal format
    return (data.videos || []).map(video => {
      const hdFile = video.video_files.find(f => f.quality === 'hd');
      const sdFile = video.video_files.find(f => f.quality === 'sd');
      const bestFile = hdFile || sdFile || video.video_files[0];

      return {
        id: `pexels_video_${video.id}` as `pexels_video_${number}`,
        details: {
          src: bestFile?.link || '',
          width: video.width,
          height: video.height,
          duration: video.duration,
          fps: bestFile?.fps || 30,
        },
        preview: video.video_pictures[0]?.picture || video.image,
        type: 'video' as const,
        metadata: {
          pexels_id: video.id,
          video_files: video.video_files,
        },
      };
    });
  } catch (error) {
    console.error('Failed to fetch Pexels videos:', error);
    return [];
  }
}

/**
 * Search for a stock video matching the visual prompt
 * Tries multiple query variants for better results
 * POC restaurants use curated queries for best demo performance
 */
export async function findStockVideo(
  visualPrompt: string,
  options: {
    cuisine?: string;
    sceneId?: string;
    preferredDuration?: number;
    apiKey?: string;
    brandName?: string;
  } = {}
): Promise<StockVideoResult | null> {
  const { cuisine, sceneId, preferredDuration, apiKey, brandName } = options;

  // Get query variants to try (POC restaurants get curated queries)
  const queries = getQueryVariants(visualPrompt, cuisine, sceneId, brandName);

  // Try each query until we find a good result
  for (const query of queries) {
    const videos = await fetchPexelsVideos(query, apiKey);

    if (videos.length > 0) {
      const best = selectBestVideo(videos, preferredDuration);
      if (best) {
        return best;
      }
    }
  }

  // Last resort: try generic restaurant footage
  const fallbackVideos = await fetchPexelsVideos('restaurant food cooking', apiKey);
  return selectBestVideo(fallbackVideos, preferredDuration);
}
