/**
 * API to generate AI voice narration using ElevenLabs TTS
 * POST /api/generate-voice
 * Body: { text: string, voiceId: string, folder?: string }
 *
 * Requires ELEVENLABS_API_KEY in .env.local
 * Free tier: 10,000 characters/month
 * Get key at: https://elevenlabs.io
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, folder = 'ai-voice-generations' } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    console.log('[Generate Voice] Starting ElevenLabs TTS...');
    console.log('[Generate Voice] Text length:', text.length);
    console.log('[Generate Voice] Voice ID:', voiceId);

    // Call ElevenLabs TTS API
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[Generate Voice] ElevenLabs error:', errorText);
      throw new Error(`ElevenLabs API error: ${ttsResponse.status} - ${errorText}`);
    }

    // Get audio buffer
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    console.log('[Generate Voice] Audio generated, size:', audioBuffer.length);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename
    const filename = `voice-${Date.now()}.mp3`;
    const filePath = path.join(outputDir, filename);

    // Save the file
    await fs.writeFile(filePath, audioBuffer);

    const localUrl = `/uploads/${folder}/${filename}`;
    console.log('[Generate Voice] Audio saved to:', localUrl);

    return NextResponse.json({
      success: true,
      url: localUrl,
      agent: {
        url: localUrl,
      },
    });

  } catch (error) {
    console.error('[Generate Voice] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate voice' },
      { status: 500 }
    );
  }
}
