/**
 * Web Scraper - Main orchestrator for extracting brand assets from websites
 * Optimized for restaurant websites
 */

import { chromium, type Browser, type Page } from 'playwright';
import {
  extractBrandInfo,
  extractLogo,
  extractImages,
  extractContact,
  extractMenuItems,
  extractSocialLinks,
  extractBrandColorsFromCSS,
} from './extractors';
import { extractColorsFromImage } from './color-extractor';
import type { ScrapedData, ScrapeOptions, ScrapeResult, BrandColors } from './types';

// Singleton browser instance for reuse
let browserInstance: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

/**
 * Clean up browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Scroll page to trigger lazy-loaded images
 * Many restaurant sites lazy-load food/product images
 * Enhanced for React/Next.js/Wix sites that load content dynamically
 */
async function scrollPageForLazyImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const scrollStep = window.innerHeight * 0.6; // Smaller steps to trigger more lazy loads
    const maxScrolls = 15; // More scrolls to catch all content on long pages
    let currentScroll = 0;
    let lastHeight = document.body.scrollHeight;

    for (let i = 0; i < maxScrolls; i++) {
      currentScroll += scrollStep;
      window.scrollTo({ top: currentScroll, behavior: 'smooth' });

      // Wait longer for Wix/React/Next.js content to render
      await new Promise(resolve => setTimeout(resolve, 800));

      // Trigger any intersection observers by scrolling slightly up and down
      window.scrollTo({ top: currentScroll - 50, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 100));
      window.scrollTo({ top: currentScroll, behavior: 'instant' });

      // Check if new content loaded (infinite scroll detection)
      const newHeight = document.body.scrollHeight;
      if (newHeight > lastHeight) {
        lastHeight = newHeight;
        // Wait extra time when new content loads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if we've reached the bottom
      if (currentScroll >= document.body.scrollHeight - window.innerHeight) {
        // Wait longer at bottom for any final content
        await new Promise(resolve => setTimeout(resolve, 800));
        break;
      }
    }

    // Do a final scroll through to ensure all images triggered
    for (let pos = 0; pos < document.body.scrollHeight; pos += window.innerHeight) {
      window.scrollTo({ top: pos, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

/**
 * Validate and normalize URL
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }

  // Validate URL
  try {
    const urlObj = new URL(normalized);
    // Clean up double slashes in pathname (e.g., /food// -> /food/)
    urlObj.pathname = urlObj.pathname.replace(/\/+/g, '/');
    return urlObj.toString();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Main scrape function - extracts all brand assets from a URL
 */
export async function scrapeWebsite(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const {
    timeout = 45000, // 45s for slower sites
    waitForImages = true,
    maxImages = 20,
    extractMenu = true,
  } = options;

  const startTime = Date.now();
  let page: Page | null = null;

  try {
    const normalizedUrl = normalizeUrl(url);
    const browser = await getBrowser();

    // Create new page with realistic viewport and user agent
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    // Navigate to page with retry logic for protocol errors
    const pageLoadStart = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(normalizedUrl, {
          waitUntil: 'domcontentloaded',
          timeout,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error;
        const errorMsg = lastError.message || '';

        // Retry on protocol errors or connection issues
        if (errorMsg.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
            errorMsg.includes('ERR_CONNECTION') ||
            errorMsg.includes('net::')) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        // Don't retry other errors
        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    // Wait for initial JS to execute (important for React/Next.js sites)
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Scroll page to trigger lazy-loaded images (food/product images often lazy load)
    await scrollPageForLazyImages(page);

    // Wait for images to load after scrolling
    if (waitForImages) {
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
        // Ignore timeout - proceed with what we have
      });
    }

    // Additional wait for lazy images to render (React hydration, etc.)
    await page.waitForTimeout(1000);

    const pageLoadTime = Date.now() - pageLoadStart;

    // Extract all data in parallel
    const extractionStart = Date.now();

    const [brand, logo, images, contact, menuItems, socialLinks, cssColors] = await Promise.all([
      extractBrandInfo(page, normalizedUrl),
      extractLogo(page, normalizedUrl),
      extractImages(page, normalizedUrl, maxImages),
      extractContact(page, normalizedUrl),
      extractMenu ? extractMenuItems(page) : Promise.resolve([]),
      extractSocialLinks(page),
      extractBrandColorsFromCSS(page),
    ]);

    const extractionTime = Date.now() - extractionStart;

    // Extract colors - prioritize CSS/theme colors over image-based extraction
    // CSS colors reflect intentional brand choices, while food images just show food colors
    const colorExtractionStart = Date.now();
    let colors: BrandColors;

    if (cssColors && (cssColors.primary || cssColors.accent)) {
      // Use CSS-extracted colors as primary source
      colors = {
        primary: cssColors.primary || '#333333',
        secondary: cssColors.secondary || '#666666',
        accent: cssColors.accent || cssColors.primary || '#007bff',
        background: cssColors.background || '#ffffff',
        text: cssColors.text || '#1a1a1a',
        palette: [
          cssColors.primary,
          cssColors.secondary,
          cssColors.accent,
          cssColors.background,
          cssColors.text,
        ].filter((c): c is string => !!c),
      };

      // If we have a logo, extract colors from it to supplement the palette
      if (logo) {
        try {
          const logoColors = await extractColorsFromImage(logo);
          // Add unique logo colors to palette (logo colors are legitimate brand colors)
          const uniqueLogoColors = logoColors.palette.filter(c => !colors.palette.includes(c));
          colors.palette = [...colors.palette, ...uniqueLogoColors].slice(0, 8);
        } catch {}
      }
    } else if (logo) {
      // Fallback: extract from logo only (not food images)
      colors = await extractColorsFromImage(logo);
    } else {
      // Last resort: default colors
      colors = {
        primary: '#333333',
        secondary: '#666666',
        accent: '#007bff',
        background: '#ffffff',
        text: '#1a1a1a',
        palette: ['#333333', '#666666', '#007bff', '#ffffff'],
      };
    }
    const colorExtractionTime = Date.now() - colorExtractionStart;

    const totalTime = Date.now() - startTime;

    const scrapedData: ScrapedData = {
      brand,
      logo,
      images,
      colors,
      contact,
      menuItems: menuItems.length > 0 ? menuItems : undefined,
      socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
      scrapedAt: new Date().toISOString(),
      sourceUrl: normalizedUrl,
    };

    return {
      success: true,
      data: scrapedData,
      timing: {
        total: totalTime,
        pageLoad: pageLoadTime,
        extraction: extractionTime,
        colorExtraction: colorExtractionTime,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Scraping failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      timing: {
        total: Date.now() - startTime,
        pageLoad: 0,
        extraction: 0,
        colorExtraction: 0,
      },
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Quick scrape - faster version that skips some optional extractions
 * Still waits for images since food/product images are critical
 */
export async function quickScrape(url: string): Promise<ScrapeResult> {
  return scrapeWebsite(url, {
    timeout: 45000, // Increased for slower sites
    waitForImages: true, // Need this for lazy-loaded food images
    maxImages: 15,
    extractMenu: false,
  });
}

// Re-export types
export type { ScrapedData, ScrapeOptions, ScrapeResult, ScrapedImage, BrandColors, BrandInfo, ContactInfo } from './types';
