import { NextRequest, NextResponse } from 'next/server';
import {
  generateScript,
  detectPOCBrand,
  type AdTone,
  type ContactInfo,
} from '@/lib/script-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brandName,
      tagline,
      description,
      cuisine,
      tone,
      duration = 20, // Default to 20s for richer ads
      url,
      contact,
    } = body;

    // Validate required fields
    if (!brandName || typeof brandName !== 'string') {
      return NextResponse.json(
        { error: 'brandName is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if this is a POC brand
    const pocBrand = detectPOCBrand(brandName.trim(), url);

    // Determine effective tone
    const validTones: AdTone[] = ['professional', 'playful', 'urgent', 'friendly'];
    let effectiveTone: AdTone;

    if (tone && validTones.includes(tone)) {
      effectiveTone = tone as AdTone;
    } else if (pocBrand) {
      effectiveTone = pocBrand.tone;
    } else {
      effectiveTone = 'friendly';
    }

    // Validate duration (extended for v2)
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration < 5 || numDuration > 60) {
      return NextResponse.json(
        { error: 'Duration must be a number between 5 and 60 seconds' },
        { status: 400 }
      );
    }

    // Build contact info if provided
    const contactInfo: ContactInfo | undefined = contact ? {
      phone: contact.phone?.trim(),
      address: contact.address?.trim(),
      website: contact.website?.trim(),
      hours: contact.hours?.trim(),
    } : undefined;

    const result = await generateScript({
      brandName: brandName.trim(),
      tagline: tagline?.trim(),
      description: description?.trim(),
      cuisine: cuisine?.trim(),
      tone: effectiveTone,
      duration: numDuration,
      url: url?.trim(),
      contact: contactInfo,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate script' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      script: result.script,
      pocBrand: pocBrand ? {
        name: pocBrand.brandName,
        tone: pocBrand.tone,
        menuCategories: Object.keys(pocBrand.menuCategories),
      } : null,
    });
  } catch (error) {
    console.error('Script generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
