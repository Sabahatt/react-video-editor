import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch voices from ElevenLabs public API
 * These are free premade voices with working preview URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 20, query = {} } = body;

    // Fetch voices from ElevenLabs public API (no API key needed for listing)
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform ElevenLabs format to our format
    let voices = data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name + (v.labels?.descriptive ? ` - ${v.labels.descriptive}` : ''),
      gender: v.labels?.gender || 'neutral',
      age: v.labels?.age || 'adult',
      useCase: v.labels?.use_case || 'general',
      category: v.category || 'premade',
      accent: v.labels?.accent || 'american',
      previewUrl: v.preview_url
    }));

    // Apply gender filter
    if (query.genders && query.genders.length > 0) {
      voices = voices.filter((v: any) => query.genders.includes(v.gender));
    }

    // Apply language filter (ElevenLabs voices are mostly English)
    if (query.languages && query.languages.length > 0 && !query.languages.includes('en')) {
      // Filter out if looking for non-English only
      voices = [];
    }

    return NextResponse.json({
      voices: voices.slice(0, limit),
      total: voices.length
    });

  } catch (error) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
