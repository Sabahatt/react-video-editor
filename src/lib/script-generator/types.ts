/**
 * Script Generator Types
 */

export type AdTone = 'professional' | 'playful' | 'urgent' | 'friendly';

/**
 * Contact info from scraping - used for CTA scene
 */
export interface ContactInfo {
  phone?: string;
  address?: string;
  website?: string; // Display URL (e.g., "joespizza.com")
  hours?: string;
}

export interface ScriptGeneratorInput {
  brandName: string;
  tagline?: string;
  description?: string;
  cuisine?: string;
  tone?: AdTone;
  duration?: number; // in seconds, default 20
  url?: string; // original website URL for POC detection
  contact?: ContactInfo; // contact info for CTA scene
}

/**
 * Visual type for each scene - determines how the visual is sourced
 * Note: stock_video has been removed - all visuals now use animated images via Akool
 */
export type VisualType =
  | 'animated_image'   // Animate a scraped product image with Akool
  | 'logo_brand';      // Logo + brand colors (for CTA)

/**
 * Akool image-to-video animation configuration
 */
export interface AkoolAnimationConfig {
  /** Animation prompt describing the motion (e.g., "slow zoom in, steam rising") */
  prompt: string;
  /** What to avoid in animation (e.g., "blurry, distorted, text") */
  negativePrompt: string;
  /** Video clip length in seconds */
  videoLength: 5 | 10;
  /** Output resolution */
  resolution: '720p' | '1080p';
}

/**
 * Selected image information for a scene
 */
export interface SelectedImage {
  /** Image URL from scraped data */
  url: string;
  /** Alt text / description */
  alt: string;
  /** Category for diversity tracking (e.g., "pizzas", "salads") */
  category: string;
}

/**
 * Scene IDs - new format uses body1-4, legacy uses value/benefit/extra
 */
export type SceneId =
  | 'hook'    // Intro/USP scene - always STATIC
  | 'body1'   // Body scene 1 - animated or static per pattern
  | 'body2'   // Body scene 2 - animated or static per pattern
  | 'body3'   // Body scene 3 - animated or static per pattern
  | 'body4'   // Body scene 4 - animated or static per pattern
  | 'value'   // Legacy: maps to body1
  | 'benefit' // Legacy: maps to body2
  | 'extra'   // Legacy: maps to body3
  | 'cta';    // Call to action - always STATIC

/**
 * A single scene in the ad
 */
export interface AdScene {
  id: SceneId;

  // Audio
  voiceoverText: string;  // What the narrator says (~2.5 words per second)

  // On-screen text
  displayText: string;    // Short text overlay (ALL CAPS, 2-4 words)

  // Timing
  duration: number;       // Scene duration in seconds

  // Visual direction
  visualType: VisualType;

  /**
   * For animated_image scenes: which menu category to pull image from
   * Used by image selector to ensure diversity
   */
  visualCategory?: string;

  /**
   * Selected image for this scene (resolved after image selection step)
   */
  selectedImage?: SelectedImage;

  /**
   * Akool animation config for animated_image scenes
   */
  akoolConfig?: AkoolAnimationConfig;

  /**
   * Animated video URL (resolved after Akool processing)
   */
  animatedVideoUrl?: string;

  /** Contact info to display (only for CTA scene) */
  contactOverlay?: ContactInfo;
}

/**
 * LLM output format for scene generation
 * This is what the LLM returns before image selection and scene planning
 */
export interface LLMSceneOutput {
  id: SceneId;
  voiceoverText: string;
  displayText: string;
  duration: number;
  /** Optional - LLM may not set this, scene planner determines animated vs static */
  visualType?: VisualType;
  /** Which menu category to use for image selection */
  visualCategory?: string;
  /** Akool animation prompt - deprecated, now generated after scene planning */
  akoolPrompt?: string;
  /** Akool negative prompt - deprecated */
  akoolNegativePrompt?: string;
}

export interface GeneratedScript {
  /** Combined voiceover text from all scenes (for TTS) */
  fullScript: string;
  scenes: AdScene[];
  tone: AdTone;
  totalDuration: number;
}

export interface ScriptGeneratorResult {
  success: boolean;
  script?: GeneratedScript;
  error?: string;
  /** Detected POC brand name if matched */
  pocBrand?: string;
}
