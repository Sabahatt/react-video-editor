import { NextRequest, NextResponse } from "next/server";

const JAMENDO_API_BASE_URL = "https://api.jamendo.com/v3.0/tracks/";

interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  artist_idstr: string;
  album_name: string;
  album_id: string;
  album_image: string;
  license_ccurl: string;
  position: number;
  releasedate: string;
  audio: string;
  audiodownload: string;
  image: string;
  shorturl: string;
  shareurl: string;
  audiodownload_allowed: boolean;
  musicinfo?: {
    vocalinstrumental: string;
    acousticelectric: string;
    speed: string;
    gender: string;
    lang: string;
    tags: {
      genres: string[];
      instruments: string[];
      vartags: string[];
    };
  };
}

interface JamendoResponse {
  headers: {
    status: string;
    code: number;
    error_message: string;
    warnings: string;
    results_count: number;
  };
  results: JamendoTrack[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("per_page") || "20");

  const clientId = process.env.JAMENDO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Jamendo API client ID not configured" },
      { status: 500 }
    );
  }

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * perPage;

    // Build URL for Jamendo Tracks API
    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: perPage.toString(),
      offset: offset.toString(),
      include: "musicinfo",
      audioformat: "mp32" // Higher quality VBR MP3
    });

    // Add search parameter if provided
    if (query) {
      params.append("search", query);
      params.append("order", "relevance");
    } else {
      // Default to popular/featured tracks
      params.append("order", "popularity_week_desc");
      params.append("featured", "1");
    }

    const url = `${JAMENDO_API_BASE_URL}?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Jamendo API error: ${response.status}`);
    }

    const data: JamendoResponse = await response.json();

    if (data.headers.code !== 0) {
      throw new Error(data.headers.error_message || "Jamendo API error");
    }

    // Transform the data to match our audio format
    const transformedAudio = data.results.map((track) => {
      // Get genre/mood from musicinfo
      const genres = track.musicinfo?.tags?.genres || [];
      const mood = genres[0] || track.musicinfo?.vocalinstrumental || "Music";

      return {
        id: `jamendo_audio_${track.id}`,
        name: track.name || "Untitled Track",
        details: {
          src: track.audio || track.audiodownload || ""
        },
        preview: track.album_image || track.image || "",
        type: "audio" as const,
        metadata: {
          jamendo_id: track.id,
          author: track.artist_name,
          mood: mood,
          duration: track.duration || 0,
          album: track.album_name,
          genres: genres,
          license: track.license_ccurl
        }
      };
    });

    // Jamendo doesn't return total count by default, estimate based on results
    const hasMore = data.results.length === perPage;
    const totalEstimate = hasMore ? (page + 1) * perPage : offset + data.results.length;

    return NextResponse.json({
      audios: transformedAudio,
      total_results: totalEstimate,
      page: page,
      per_page: perPage,
      next_page: hasMore ? page + 1 : null,
      prev_page: page > 1 ? page - 1 : null
    });
  } catch (error) {
    console.error("Jamendo Audio API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio from Jamendo" },
      { status: 500 }
    );
  }
}
