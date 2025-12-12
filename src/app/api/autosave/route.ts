/**
 * Auto-Save API - Periodically saves the editor state to prevent data loss
 * Files are saved to: poc-data/{restaurant}/autosave.json (single file, always overwritten)
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant, design, projectName } = body;

    if (!design) {
      return NextResponse.json(
        { success: false, error: 'No design data provided' },
        { status: 400 }
      );
    }

    // Use restaurant name or fallback to 'default'
    const folderName = restaurant || 'default';

    // Create output directory: poc-data/{restaurant}/
    const outputDir = path.join(process.cwd(), 'poc-data', folderName);
    await fs.mkdir(outputDir, { recursive: true });

    // Save data with metadata
    const saveData = {
      projectName: projectName || 'Untitled video',
      restaurant: folderName,
      savedAt: new Date().toISOString(),
      design,
    };

    // Save to single file (always overwritten)
    const filePath = path.join(outputDir, 'autosave.json');
    await fs.writeFile(filePath, JSON.stringify(saveData, null, 2));

    console.log(`[Auto-Save] Saved to: ${filePath}`);

    return NextResponse.json({
      success: true,
      filePath,
      savedAt: saveData.savedAt,
    });
  } catch (error) {
    console.error('[Auto-Save] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve the latest autosave
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurant = searchParams.get('restaurant') || 'default';

    const filePath = path.join(
      process.cwd(),
      'poc-data',
      restaurant,
      'autosave.json'
    );

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({
        success: true,
        data: JSON.parse(data),
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'No autosave found',
      });
    }
  } catch (error) {
    console.error('[Auto-Save] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
