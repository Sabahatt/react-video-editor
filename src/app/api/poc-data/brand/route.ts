/**
 * API to load brand data for a restaurant
 * GET /api/poc-data/brand?restaurant=joes-pizza
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurant = searchParams.get('restaurant');

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant parameter is required' },
        { status: 400 }
      );
    }

    // Path to brand.json
    const brandPath = path.join(process.cwd(), 'poc-data', restaurant, 'brand.json');

    try {
      const brandContent = await fs.readFile(brandPath, 'utf-8');
      const brand = JSON.parse(brandContent);

      return NextResponse.json({
        success: true,
        brand,
        restaurant
      });
    } catch {
      return NextResponse.json(
        { success: false, error: `No brand found for ${restaurant}` },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('[POC Brand API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
