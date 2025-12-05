/**
 * Timeline Builder - Step 5 of the Ad Pipeline
 *
 * Converts enriched script (with resolved visuals) to editor-compatible design format.
 * Creates timeline tracks with video/image clips and text overlays.
 */

// ============ Types ============

interface ResolvedVisual {
  type: 'animated_image' | 'stock_video' | 'logo_brand';
  url: string | null;
  alt?: string;
  prompt?: string;
  preview?: string; // Thumbnail URL for videos
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

// Editor Design Types (matching @designcombo/types)
interface BoxShadow {
  color: string;
  x: number;
  y: number;
  blur: number;
}

interface TrackItemDetails {
  // Common
  opacity: number;
  top: string;
  left: string;
  transform?: string;
  visibility?: string;

  // Video/Image specific
  src?: string;
  width?: number;
  height?: number;
  volume?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: BoxShadow;
  blur?: number;
  brightness?: number;
  flipX?: boolean;
  flipY?: boolean;
  rotate?: string;

  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontUrl?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  color?: string;
  backgroundColor?: string;
  textDecoration?: string;
  lineHeight?: string;
  letterSpacing?: string;
  wordSpacing?: string;
  border?: string;
  textShadow?: string;
  wordWrap?: string;
  wordBreak?: string;
  WebkitTextStrokeColor?: string;
  WebkitTextStrokeWidth?: string;
  textTransform?: string;
  skewX?: number;
  skewY?: number;
}

interface TrackItem {
  id: string;
  name: string;
  type: 'video' | 'image' | 'text';
  display: {
    from: number;
    to: number;
  };
  trim?: {
    from: number;
    to: number;
  };
  duration?: number;
  playbackRate?: number;
  details: TrackItemDetails;
  metadata?: Record<string, unknown>;
  isMain?: boolean;
}

interface Track {
  id: string;
  items: string[];
  type: string;
  name?: string;
  accepts: string[];
  magnetic: boolean;
  static: boolean;
}

interface Design {
  id: string;
  fps: number;
  tracks: Track[];
  size: {
    width: number;
    height: number;
  };
  trackItemIds: string[];
  transitionsMap: Record<string, unknown>;
  trackItemsMap: Record<string, TrackItem>;
  transitionIds: string[];
  duration: number;
}

// ============ Utilities ============

/**
 * Generate a random ID for track items
 */
function generateId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Convert seconds to milliseconds
 */
function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Default accepts for media tracks
 */
const MEDIA_ACCEPTS = [
  'text', 'image', 'video', 'audio', 'composition',
  'caption', 'template', 'customTrack', 'customTrack2',
  'illustration', 'custom', 'main', 'shape',
  'linealAudioBars', 'radialAudioBars', 'progressFrame',
  'progressBar', 'rect', 'progressSquare'
];

/**
 * Default accepts for text tracks
 */
const TEXT_ACCEPTS = ['text', 'caption'];

// Canvas dimensions (landscape 16:9 for video ads)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// ============ Track Item Builders ============

/**
 * Create a video track item - fills entire canvas
 */
function createVideoItem(
  id: string,
  src: string,
  from: number,
  to: number,
  sceneDuration: number,
  previewUrl?: string,
  alt?: string
): TrackItem {
  return {
    id,
    name: 'video',
    type: 'video',
    display: { from, to },
    trim: { from: 0, to: sceneDuration },
    duration: sceneDuration,
    playbackRate: 1,
    details: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      opacity: 100,
      src,
      volume: 0, // Muted since we'll have TTS voiceover
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      boxShadow: { color: '#000000', x: 0, y: 0, blur: 0 },
      top: '0px',
      left: '0px',
      transform: 'none',
      blur: 0,
      brightness: 100,
      flipX: false,
      flipY: false,
      rotate: '0deg',
      visibility: 'visible',
    },
    metadata: {
      previewUrl, // Thumbnail for media panel
      alt,
    },
    isMain: true,
  };
}

/**
 * Create an image track item - fills entire canvas with object-fit cover behavior
 */
function createImageItem(
  id: string,
  src: string,
  from: number,
  to: number,
  alt?: string
): TrackItem {
  return {
    id,
    name: 'image',
    type: 'image',
    display: { from, to },
    details: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      opacity: 100,
      src,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      boxShadow: { color: '#000000', x: 0, y: 0, blur: 0 },
      top: '0px',
      left: '0px',
      transform: 'none',
      blur: 0,
      brightness: 100,
      flipX: false,
      flipY: false,
      rotate: '0deg',
      visibility: 'visible',
    },
    metadata: { alt },
    isMain: true,
  };
}

/**
 * Create a logo track item - full canvas with object-fit contain
 * Logo fills entire canvas container, but uses object-fit: contain to preserve aspect ratio
 * This ensures the logo is centered and properly sized without stretching
 */
function createLogoItem(
  id: string,
  src: string,
  from: number,
  to: number,
  alt?: string,
  backgroundColor?: string
): TrackItem {
  // Full canvas dimensions - object-fit: contain in image.tsx will handle proper sizing
  return {
    id,
    name: 'logo',
    type: 'image',
    display: { from, to },
    details: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      opacity: 100,
      src,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      boxShadow: { color: '#000000', x: 0, y: 0, blur: 0 },
      top: '0px',
      left: '0px',
      transform: 'none',
      blur: 0,
      brightness: 100,
      flipX: false,
      flipY: false,
      rotate: '0deg',
      visibility: 'visible',
    },
    metadata: {
      alt,
      isLogo: true, // Mark as logo for special rendering treatment (object-fit: contain)
    },
    isMain: true,
  };
}

/**
 * Create a text overlay track item - positioned at bottom center for landscape
 */
function createTextItem(
  id: string,
  text: string,
  from: number,
  to: number,
  options: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    top?: string;
    fontFamily?: string;
    fontUrl?: string;
  } = {}
): TrackItem {
  const {
    fontSize = 72,
    color = '#FFFFFF',
    backgroundColor = 'transparent',
    top = '800px', // Near bottom of 1080p canvas
    fontFamily = 'Inter',
    fontUrl = 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2',
  } = options;

  // Center text horizontally: (1920 - textWidth) / 2
  const textWidth = 1600;
  const leftOffset = (CANVAS_WIDTH - textWidth) / 2;

  // Professional text visibility: combine stroke + multiple layered shadows
  // This ensures readability on any background (light or dark)
  const textShadowLayers = [
    '0 0 10px rgba(0,0,0,0.9)',      // Tight glow for edge definition
    '0 0 20px rgba(0,0,0,0.7)',      // Medium glow for separation
    '0 4px 8px rgba(0,0,0,0.8)',     // Drop shadow for depth
  ].join(', ');

  return {
    id,
    name: 'text',
    type: 'text',
    display: { from, to },
    details: {
      text,
      fontSize,
      fontFamily,
      fontUrl,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      color,
      backgroundColor,
      textDecoration: 'none',
      lineHeight: 'normal',
      letterSpacing: '2px',
      wordSpacing: 'normal',
      border: 'none',
      textShadow: textShadowLayers,
      opacity: 100,
      wordWrap: 'normal',
      wordBreak: 'normal',
      WebkitTextStrokeColor: '#000000',
      WebkitTextStrokeWidth: '3px', // Slightly thicker stroke for better visibility
      top,
      left: `${leftOffset}px`,
      width: textWidth,
      height: 150,
      textTransform: 'uppercase',
      transform: 'none',
      skewX: 0,
      skewY: 0,
      boxShadow: { color: '#000000', x: 0, y: 0, blur: 0 },
    },
    metadata: {},
    isMain: false,
  };
}

/**
 * Create CTA text with contact info
 * Uses a subtle semi-transparent dark background for readability
 * Brand colors are NOT used for background to avoid jarring color blocks
 */
function createCtaTextItem(
  id: string,
  displayText: string,
  contactInfo: ContactInfo | undefined,
  from: number,
  to: number,
  brandColors?: BrandColors
): TrackItem {
  // Build CTA text with optional contact info
  let text = displayText;
  if (contactInfo?.website) {
    text = `${displayText}\n${contactInfo.website}`;
  }

  return createTextItem(id, text, from, to, {
    fontSize: 64,
    color: brandColors?.text || '#FFFFFF',
    // Use a subtle dark overlay, not brand primary color (which could be too bright/jarring)
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    top: '750px', // Adjusted for landscape
  });
}

// ============ Main Builder ============

/**
 * Build a complete timeline design from enriched script
 */
export function buildTimelineDesign(
  script: EnrichedScript,
  brand?: BrandInfo
): Design {
  const designId = generateId();
  const trackItemIds: string[] = [];
  const trackItemsMap: Record<string, TrackItem> = {};

  // Track for visuals (videos/images)
  const visualTrackId = generateId();
  const visualTrackItems: string[] = [];

  // Track for text overlays
  const textTrackId = generateId();
  const textTrackItems: string[] = [];

  let currentTime = 0;

  // Process each scene
  for (const scene of script.scenes) {
    const sceneDurationMs = secondsToMs(scene.duration);
    const sceneEnd = currentTime + sceneDurationMs;

    // 1. Create visual item (video or image)
    const visualId = generateId();

    if (scene.visual.url) {
      if (scene.visual.type === 'stock_video') {
        const videoItem = createVideoItem(
          visualId,
          scene.visual.url,
          currentTime,
          sceneEnd,
          sceneDurationMs,
          scene.visual.preview, // Pass preview URL for thumbnail
          scene.visual.alt
        );
        trackItemsMap[visualId] = videoItem;
      } else if (scene.visual.type === 'logo_brand') {
        // Logo needs special handling - centered and contained, not stretched
        const logoItem = createLogoItem(
          visualId,
          scene.visual.url,
          currentTime,
          sceneEnd,
          scene.visual.alt,
          brand?.colors?.background || '#FFFFFF'
        );
        trackItemsMap[visualId] = logoItem;
      } else {
        // animated_image - fills canvas with cover behavior
        const imageItem = createImageItem(
          visualId,
          scene.visual.url,
          currentTime,
          sceneEnd,
          scene.visual.alt
        );
        trackItemsMap[visualId] = imageItem;
      }

      visualTrackItems.push(visualId);
      trackItemIds.push(visualId);
    }

    // 2. Create text overlay
    const textId = generateId();

    if (scene.id === 'cta') {
      // CTA scene with contact overlay
      const ctaItem = createCtaTextItem(
        textId,
        scene.displayText,
        scene.contactOverlay,
        currentTime,
        sceneEnd,
        brand?.colors
      );
      trackItemsMap[textId] = ctaItem;
    } else {
      // Regular display text
      const textItem = createTextItem(
        textId,
        scene.displayText,
        currentTime,
        sceneEnd,
        {
          fontSize: scene.id === 'hook' ? 80 : 64,
          color: '#FFFFFF',
        }
      );
      trackItemsMap[textId] = textItem;
    }

    textTrackItems.push(textId);
    trackItemIds.push(textId);

    currentTime = sceneEnd;
  }

  // Build tracks
  const tracks: Track[] = [
    {
      id: visualTrackId,
      items: visualTrackItems,
      type: 'video',
      name: 'Visuals',
      accepts: MEDIA_ACCEPTS,
      magnetic: false,
      static: false,
    },
    {
      id: textTrackId,
      items: textTrackItems,
      type: 'text',
      name: 'Text Overlays',
      accepts: TEXT_ACCEPTS,
      magnetic: false,
      static: false,
    },
  ];

  // Calculate total duration
  const totalDuration = secondsToMs(script.totalDuration);

  return {
    id: designId,
    fps: 30,
    tracks,
    size: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    },
    trackItemIds,
    transitionsMap: {},
    trackItemsMap,
    transitionIds: [],
    duration: totalDuration,
  };
}

/**
 * Build a simple test design for debugging
 */
export function buildTestDesign(): Design {
  const testScript: EnrichedScript = {
    fullScript: 'Test script',
    scenes: [
      {
        id: 'hook',
        voiceoverText: 'Welcome to our restaurant',
        displayText: 'WELCOME',
        duration: 2.5,
        visual: {
          type: 'animated_image',
          url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          alt: 'Food image',
        },
      },
      {
        id: 'cta',
        voiceoverText: 'Visit us today',
        displayText: 'ORDER NOW',
        duration: 2.5,
        visual: {
          type: 'animated_image',
          url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          alt: 'Food image',
        },
        contactOverlay: {
          website: 'example.com',
        },
      },
    ],
    tone: 'friendly',
    totalDuration: 5,
  };

  return buildTimelineDesign(testScript);
}
