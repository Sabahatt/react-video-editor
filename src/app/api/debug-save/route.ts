/**
 * Debug Save API - Saves generated script/design data to a file for inspection
 * Files are saved to: test/poc-responses/{restaurant}/debug-{timestamp}.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant, scriptResult, enrichedScript, brand, design, timestamp } = body;

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'test', 'poc-responses', restaurant || 'unknown');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename with timestamp
    const safeTimestamp = timestamp?.replace(/[:.]/g, '-') || new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug-${safeTimestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Save the debug data
    const debugData = {
      restaurant,
      timestamp,
      scriptResult,
      enrichedScript,
      brand,
      design,
    };

    await fs.writeFile(filepath, JSON.stringify(debugData, null, 2));

    // Also save a "latest" version for easy access
    const latestPath = path.join(outputDir, 'debug-latest.json');
    await fs.writeFile(latestPath, JSON.stringify(debugData, null, 2));

    console.log(`[Debug Save] Saved to: ${filepath}`);
    console.log(`[Debug Save] Latest at: ${latestPath}`);

    return NextResponse.json({
      success: true,
      filepath,
      latestPath,
    });
  } catch (error) {
    console.error('[Debug Save] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
