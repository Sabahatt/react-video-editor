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
  duration?: number; // in seconds, default 10
  url?: string; // original website URL for POC detection
  contact?: ContactInfo; // contact info for CTA scene
}

/**
 * Visual type for each scene - determines how the visual is sourced
 */
export type VisualType =
  | 'stock_video'      // Use stock footage from Pexels
  | 'animated_image'   // Animate a scraped product image with Kling
  | 'logo_brand';      // Logo + brand colors (for CTA)

/**
 * A single scene in the ad
 */
export interface AdScene {
  id: 'hook' | 'value' | 'benefit' | 'cta';

  // Audio
  voiceoverText: string;  // What the narrator says (~2-3 words per second)

  // On-screen text
  displayText: string;    // Short text overlay (ALL CAPS, 2-4 words)

  // Timing
  duration: number;       // Scene duration in seconds

  // Visual direction
  visualType: VisualType;
  visualPrompt: string;   // Describes the visual for CLIP/stock search
                          // e.g., "steaming pizza close-up" or "busy restaurant kitchen"

  /** Contact info to display (only for CTA scene) */
  contactOverlay?: ContactInfo;
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
}
