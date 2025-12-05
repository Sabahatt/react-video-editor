/**
 * Stock Video Library - Step 4 of the Ad Pipeline
 *
 * Handles Pexels API integration for resolving stock_video scenes.
 *
 * Strategy: Use visualPrompt directly as search query (with minor cleanup).
 * The script generator is responsible for creating search-friendly prompts.
 */

// ============ Query Cleanup ============

/**
 * Clean up a visual prompt to be more search-friendly
 * - Fix common plural issues that affect Pexels results
 * - Remove filler words
 */
export function cleanupSearchQuery(prompt: string): string {
  let query = prompt.toLowerCase().trim();

  // Fix plurals that hurt Pexels search
  query = query
    .replace(/\btables\b/g, 'table')
    .replace(/\bcustomers\b/g, 'people')
    .replace(/\bdiners\b/g, 'people eating');

  // Remove filler phrases
  query = query
    .replace(/\bwith\s+\w+\s+\w+\b/g, '') // "with warm lighting" etc
    .replace(/\benjoying\b/g, 'eating')
    .replace(/\bat\s+/g, ' ');

  // Clean up extra spaces
  query = query.replace(/\s+/g, ' ').trim();

  return query;
}

// ============ Cuisine Query Fallbacks ============

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
 * Get search queries for Pexels
 * Primary: cleaned visual prompt
 * Fallback: cuisine-specific queries
 */
export function getQueryVariants(
  visualPrompt: string,
  cuisine?: string,
  sceneId?: string
): string[] {
  const queries: string[] = [];

  // Primary: use the visual prompt directly (cleaned up)
  if (visualPrompt && visualPrompt.length > 3) {
    const cleanedPrompt = cleanupSearchQuery(visualPrompt);
    queries.push(cleanedPrompt);

    // Also try a shorter version (first 3-4 words) as fallback
    const words = cleanedPrompt.split(' ');
    if (words.length > 4) {
      queries.push(words.slice(0, 4).join(' '));
    }
  }

  // Fallback: cuisine-specific queries if prompt doesn't yield results
  const cuisineQueries = CUISINE_QUERIES[cuisine?.toLowerCase() || 'default'] || CUISINE_QUERIES.default;
  queries.push(...cuisineQueries.slice(0, 2));

  // Remove duplicates
  return [...new Set(queries)];
}

// ============ Video Selection ============

/**
 * Select the best video from results based on quality and duration
 * We can trim longer videos, so duration is less critical than quality
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

  // Score each video - prioritize quality over duration since we can trim
  const scored = videos.map(video => {
    let score = 0;
    const duration = video.details.duration;

    // Duration scoring - relaxed since we can trim
    // Just need video to be long enough (>= target duration)
    if (duration >= targetDuration) {
      // Video is long enough - give full points
      // Slight preference for not too long (less trimming)
      if (duration <= targetDuration + 10) {
        score += 25; // Good length
      } else if (duration <= 30) {
        score += 20; // Acceptable, just trim
      } else {
        score += 15; // Very long but still usable
      }
    } else if (duration >= targetDuration - 1) {
      // Slightly short but usable
      score += 15;
    } else {
      // Too short - bigger penalty
      score += 5;
    }

    // Quality is more important - prefer HD (1080p or higher)
    if (video.details.height >= 1080) {
      score += 35; // HD quality is key
    } else if (video.details.height >= 720) {
      score += 20;
    } else {
      score += 5;
    }

    // Prefer landscape aspect ratio for video ads (16:9 ideal)
    const aspectRatio = video.details.width / video.details.height;
    if (aspectRatio >= 1.7 && aspectRatio <= 1.85) {
      score += 25; // Perfect 16:9
    } else if (aspectRatio >= 1.5 && aspectRatio <= 2.0) {
      score += 20; // Close to 16:9
    } else if (aspectRatio >= 1.0 && aspectRatio < 1.5) {
      score += 10; // Square-ish, less ideal
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
 * Uses cleaned prompt directly, falls back to cuisine queries
 */
export async function findStockVideo(
  visualPrompt: string,
  options: {
    cuisine?: string;
    sceneId?: string;
    preferredDuration?: number;
    apiKey?: string;
  } = {}
): Promise<StockVideoResult | null> {
  const { cuisine, sceneId, preferredDuration, apiKey } = options;

  // Get query variants (cleaned prompt + cuisine fallbacks)
  const queries = getQueryVariants(visualPrompt, cuisine, sceneId);

  console.log(`Searching for: "${visualPrompt}"`);
  console.log(`Query variants: ${queries.join(' | ')}`);

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
