/**
 * API Route: /api/scrape
 * Scrapes brand assets from a website URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite, quickScrape } from '@/lib/scraper';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for scraping

interface ScrapeRequestBody {
  url: string;
  quick?: boolean;
  options?: {
    timeout?: number;
    maxImages?: number;
    extractMenu?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScrapeRequestBody;
    const { url, quick = false, options = {} } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Perform scrape
    console.log(`[Scrape] Starting scrape for: ${url}`);
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
