/**
 * API to load pre-made ad designs for POC demo
 * GET /api/poc-data/ads?restaurant=joes-pizza
 * Returns a random pre-made ad design for the restaurant
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

    // Path to pre-made ads
    const adsDir = path.join(process.cwd(), 'poc-data', restaurant, 'ads');

    // Check if directory exists
    try {
      await fs.access(adsDir);
    } catch {
      return NextResponse.json(
        { success: false, error: `No pre-made ads found for ${restaurant}` },
        { status: 404 }
      );
    }

    // Get all JSON files in the ads directory
    const files = await fs.readdir(adsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: `No ad files found for ${restaurant}` },
        { status: 404 }
      );
    }

    // Pick a random ad
    const randomIndex = Math.floor(Math.random() * jsonFiles.length);
    const selectedFile = jsonFiles[randomIndex];
    const filePath = path.join(adsDir, selectedFile);

    // Read and parse the JSON
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const design = JSON.parse(fileContent);

    // Also load brand info
    const brandPath = path.join(process.cwd(), 'poc-data', restaurant, 'brand.json');
    let brand = null;
    try {
      const brandContent = await fs.readFile(brandPath, 'utf-8');
      brand = JSON.parse(brandContent);
    } catch {
      // Brand file is optional
    }

    return NextResponse.json({
      success: true,
      design,
      brand,
      adFile: selectedFile,
      totalAds: jsonFiles.length
    });

  } catch (error) {
    console.error('[POC Ads API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
