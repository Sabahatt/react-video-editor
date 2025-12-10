/**
 * API Route: /api/scrape
 * Scrapes brand assets from a website URL
 *
 * For POC restaurants, returns pre-scraped data from poc-data/ folder
 * for consistent quality and fast demo experience.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite, quickScrape } from '@/lib/scraper';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for scraping

// POC Restaurant URL patterns to slug mapping
const POC_URL_PATTERNS: Record<string, string> = {
  'joespizza.com': 'joes-pizza',
  'sweetgreen.com': 'sweetgreen',
  'doughnutvault.com': 'doughnut-vault',
};

// Brand-specific color palettes (curated for each POC)
const BRAND_COLORS: Record<string, {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  palette: string[];
}> = {
  'joes-pizza': {
    primary: '#c41e3a',
    secondary: '#2d5a27',
    accent: '#f4c430',
    background: '#fff8f0',
    text: '#1a1a1a',
    palette: ['#c41e3a', '#2d5a27', '#f4c430', '#fff8f0', '#1a1a1a'],
  },
  'sweetgreen': {
    primary: '#00473e',
    secondary: '#8fbc8f',
    accent: '#f5f5dc',
    background: '#ffffff',
    text: '#1a1a1a',
    palette: ['#00473e', '#8fbc8f', '#f5f5dc', '#ffffff', '#1a1a1a'],
  },
  'doughnut-vault': {
    primary: '#8b4513',
    secondary: '#deb887',
    accent: '#ffd700',
    background: '#fffaf0',
    text: '#1a1a1a',
    palette: ['#8b4513', '#deb887', '#ffd700', '#fffaf0', '#1a1a1a'],
  },
};

const BRAND_CUISINE: Record<string, string> = {
  'joes-pizza': 'Italian Pizza',
  'sweetgreen': 'Healthy Salads & Bowls',
  'doughnut-vault': 'Artisan Bakery',
};

interface ScrapeRequestBody {
  url: string;
  quick?: boolean;
  forceLive?: boolean; // Force live scraping even for POC restaurants
  options?: {
    timeout?: number;
    maxImages?: number;
    extractMenu?: boolean;
  };
}

/**
 * Detect if URL belongs to a POC restaurant
 */
function detectPOCSlug(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace('www.', '');
    for (const [pattern, slug] of Object.entries(POC_URL_PATTERNS)) {
      if (hostname.includes(pattern)) {
        return slug;
      }
    }
  } catch {
    // Invalid URL, not a POC
  }
  return null;
}

/**
 * Load pre-scraped POC data
 */
async function loadPOCData(slug: string) {
  const pocDataPath = path.join(process.cwd(), 'poc-data', slug);

  const [brandJson, productsJson] = await Promise.all([
    fs.readFile(path.join(pocDataPath, 'brand.json'), 'utf-8'),
    fs.readFile(path.join(pocDataPath, 'products.json'), 'utf-8'),
  ]);

  const brand = JSON.parse(brandJson);
  const products = JSON.parse(productsJson);

  // Transform to scraped data format
  return {
    brand: {
      name: brand.name,
      tagline: brand.usp,
      description: brand.notes?.brandIdentity || brand.notes?.origin,
      cuisine: BRAND_CUISINE[slug],
      logo: brand.logo.url,
      colors: BRAND_COLORS[slug],
    },
    images: products.map((p: { url: string; productName: string; dimensions: { width: number; height: number }; foodType?: string; productDescription?: string }) => ({
      url: p.url,
      alt: p.productName,
      width: p.dimensions.width,
      height: p.dimensions.height,
      type: 'product' as const,
      foodType: p.foodType,
      productDescription: p.productDescription,
    })),
    contact: {
      website: brand.contact.website,
      phone: brand.contact.phone,
      address: brand.contact.address,
      hours: brand.contact.hours,
    },
    sourceUrl: brand.contact.website,
    scrapedAt: new Date().toISOString(),
    isPOC: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScrapeRequestBody;
    const { url, quick = false, forceLive = false, options = {} } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Check if this is a POC restaurant (use pre-scraped data)
    const pocSlug = detectPOCSlug(url);
    if (pocSlug && !forceLive) {
      console.log(`[Scrape] POC restaurant detected: ${pocSlug}, using pre-scraped data`);
      const startTime = Date.now();

      try {
        const data = await loadPOCData(pocSlug);
        const totalTime = Date.now() - startTime;

        console.log(`[Scrape] POC data loaded in ${totalTime}ms`);

        return NextResponse.json({
          success: true,
          data,
          timing: {
            total: totalTime,
            pageLoad: 0,
            extraction: totalTime,
            colorExtraction: 0,
          },
        });
      } catch (pocError) {
        console.warn(`[Scrape] Failed to load POC data, falling back to live scrape:`, pocError);
        // Fall through to live scraping
      }
    }

    // Perform live scrape
    console.log(`[Scrape] Starting live scrape for: ${url}`);
    const startTime = Date.now();

    const result = quick
      ? await quickScrape(url)
      : await scrapeWebsite(url, options);

    console.log(`[Scrape] Completed in ${Date.now() - startTime}ms`);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Scrape] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for simple URL testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { success: false, error: 'URL query parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Scrape GET] Starting quick scrape for: ${url}`);
    const result = await quickScrape(url);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Scrape GET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
