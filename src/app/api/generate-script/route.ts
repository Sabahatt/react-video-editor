import { NextRequest, NextResponse } from 'next/server';
import { generateScript, detectPOCRestaurant, type AdTone, type ContactInfo } from '@/lib/script-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brandName,
      tagline,
      description,
      cuisine,
      tone, // No default - will use POC suggested tone or 'friendly'
      duration = 10,
      url,
      contact, // Optional contact info for CTA scene
    } = body;

    // Validate required fields
    if (!brandName || typeof brandName !== 'string') {
      return NextResponse.json(
        { error: 'brandName is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if this is a POC restaurant FIRST (before tone validation)
    const pocRestaurant = detectPOCRestaurant(brandName.trim(), url);

    // Determine effective tone:
    // 1. Use explicitly provided tone if valid
    // 2. Otherwise use POC suggested tone if detected
    // 3. Otherwise default to 'friendly'
    const validTones: AdTone[] = ['professional', 'playful', 'urgent', 'friendly'];
    let effectiveTone: AdTone;

    if (tone && validTones.includes(tone)) {
      // User explicitly provided a valid tone
      effectiveTone = tone as AdTone;
    } else if (pocRestaurant) {
      // Use POC restaurant's suggested tone
      effectiveTone = pocRestaurant.suggestedTone;
    } else {
      // Default fallback
      effectiveTone = 'friendly';
    }

    // Validate duration
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration < 5 || numDuration > 30) {
      return NextResponse.json(
        { error: 'Duration must be a number between 5 and 30 seconds' },
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
      pocRestaurant: pocRestaurant ? {
        name: pocRestaurant.brandName,
        suggestedTone: pocRestaurant.suggestedTone,
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
