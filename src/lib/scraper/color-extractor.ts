/**
 * Color Extractor - Extract brand colors from logo/images using node-vibrant
 */

import { Vibrant } from 'node-vibrant/node';
import type { BrandColors } from './types';

/**
 * Extract dominant colors from an image URL
 */
export async function extractColorsFromImage(imageUrl: string): Promise<BrandColors> {
  try {
    // Fetch image and extract palette
    const palette = await Vibrant.from(imageUrl).getPalette();

    // Map Vibrant swatches to our color structure
    const colors: BrandColors = {
      primary: palette.Vibrant?.hex || palette.DarkVibrant?.hex || '#333333',
      secondary: palette.Muted?.hex || palette.LightMuted?.hex || '#666666',
      accent: palette.LightVibrant?.hex || palette.Vibrant?.hex || '#007bff',
      background: palette.LightMuted?.hex || '#ffffff',
      text: palette.DarkMuted?.hex || '#1a1a1a',
      palette: [],
    };

    // Build full palette array
    const allSwatches = [
      palette.Vibrant,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.Muted,
      palette.DarkMuted,
      palette.LightMuted,
    ];

    colors.palette = allSwatches
      .filter(Boolean)
      .map(swatch => swatch!.hex)
      .filter((hex, index, self) => self.indexOf(hex) === index); // Dedupe

    return colors;
  } catch (error) {
    console.error('Color extraction failed:', error);

    // Return default colors on error
    return {
      primary: '#333333',
      secondary: '#666666',
      accent: '#007bff',
      background: '#ffffff',
      text: '#1a1a1a',
      palette: ['#333333', '#666666', '#007bff', '#ffffff'],
    };
  }
}

/**
 * Extract colors from multiple images and find the most representative colors
 */
export async function extractColorsFromMultipleImages(
  imageUrls: string[],
  maxImages = 3
): Promise<BrandColors> {
  const urlsToProcess = imageUrls.slice(0, maxImages);

  // Extract colors from each image
  const allColors = await Promise.all(
    urlsToProcess.map(url => extractColorsFromImage(url).catch(() => null))
  );

  const validColors = allColors.filter(Boolean) as BrandColors[];

  if (validColors.length === 0) {
    return {
      primary: '#333333',
      secondary: '#666666',
      accent: '#007bff',
      background: '#ffffff',
      text: '#1a1a1a',
      palette: ['#333333', '#666666', '#007bff', '#ffffff'],
    };
  }

  // Use the first valid result as primary
  // Could be enhanced to find most common colors across all images
  const primaryResult = validColors[0];

  // Merge all palettes
  const allPaletteColors = validColors.flatMap(c => c.palette);
  const uniquePalette = [...new Set(allPaletteColors)].slice(0, 8);

  return {
    ...primaryResult,
    palette: uniquePalette,
  };
}

/**
 * Ensure color contrast is sufficient for text readability
 */
export function ensureContrast(
  foreground: string,
  background: string
): { foreground: string; background: string } {
  // Simple contrast check - could be enhanced with WCAG calculations
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  const fgLum = getLuminance(foreground);
  const bgLum = getLuminance(background);

  // If both are too similar, adjust
  if (Math.abs(fgLum - bgLum) < 0.3) {
    // Make foreground darker or lighter based on background
    return {
      foreground: bgLum > 0.5 ? '#1a1a1a' : '#ffffff',
      background,
    };
  }

  return { foreground, background };
}
