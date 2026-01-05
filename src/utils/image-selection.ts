/**
 * Image Selection Utility using Google Gemini
 *
 * Uses Gemini to intelligently select the best images for video ads
 * based on captions, brand context, and visual suitability.
 *
 * Setup:
 *   1. Get API key at https://aistudio.google.com
 *   2. Add to .env.local: GOOGLE_AI_API_KEY=AIza...
 */

import { GoogleGenAI } from "@google/genai";

// Types
export interface ImageWithCaption {
  url: string;
  productName: string;
  caption: string;
  productDescription?: string;
  foodType?: string;
  dimensions?: { width: number; height: number };
  [key: string]: unknown;
}

export interface BrandContext {
  name: string;
  slug?: string;
  usp?: string;
  mainDishType?: string;
  tone?: string;
  notes?: {
    brandIdentity?: string;
    signatureItems?: string[];
    visualStyle?: string;
  };
  [key: string]: unknown;
}

export interface SelectionScore {
  brandRelevance: number;
  videoSuitability: number;
  visualQuality: number;
  composite: number;
}

export interface SelectedImage extends ImageWithCaption {
  selection: {
    reasoning: string;
    scores: SelectionScore;
  };
}

export interface SelectionResult {
  images: SelectedImage[];
  diversityNotes: string;
  metadata: {
    totalAnalyzed: number;
    selected: number;
    model: string;
  };
}

// Initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing Google AI API key. Set GOOGLE_AI_API_KEY in .env.local\n" +
      "Get your free key at: https://aistudio.google.com"
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Select the best images for video ads using Gemini
 */
export async function selectImages(
  images: ImageWithCaption[],
  brand: BrandContext,
  count: number = 5
): Promise<SelectionResult> {
  const ai = getGeminiClient();

  console.log(`[Selection] Analyzing ${images.length} images for ${brand.name}...`);

  // Build the prompt
  const imagesText = images
    .map(
      (img, i) => `
Image ${i + 1}:
- Product: ${img.productName}
- Description: ${img.productDescription || "N/A"}
- AI Caption: ${img.caption}
- Dimensions: ${img.dimensions?.width || "?"}x${img.dimensions?.height || "?"}
- Food Type: ${img.foodType || "N/A"}`
    )
    .join("\n");

  const prompt = `You are selecting images for an animated video ad.

**Brand Context:**
- Name: ${brand.name}
- Industry/Type: ${brand.mainDishType || "food"}
- Tone: ${brand.tone || "professional"}
- USP: ${brand.usp || "N/A"}
- Visual Style: ${brand.notes?.visualStyle || "N/A"}
- Brand Identity: ${brand.notes?.brandIdentity || "N/A"}
- Signature Items: ${brand.notes?.signatureItems?.join(", ") || "N/A"}

**Available Images (${images.length} total):**
${imagesText}

**Task:** Select the TOP ${count} images that would work best for an animated video ad.

**Selection Criteria:**
1. **Brand Relevance (40%):** Does it represent the brand well? Match the visual style and identity?
2. **Video Suitability (35%):** Will it animate well? Needs depth, interesting composition, not too static
3. **Visual Quality (25%):** Professional, well-composed, good lighting

**Important:**
- Ensure variety - don't pick ${count} similar images
- Consider how they would flow in a video sequence
- Prefer images that showcase the product attractively

**Return ONLY valid JSON with this exact structure (no markdown, no code blocks):**
{
  "selected": [
    {
      "imageIndex": 0,
      "reasoning": "Brief explanation why selected (1-2 sentences)",
      "brandRelevanceScore": 8,
      "videoSuitabilityScore": 9,
      "visualQualityScore": 7
    }
  ],
  "diversityNotes": "Brief explanation of how selected images provide variety"
}

Select exactly ${count} images. Scores should be 1-10.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const responseText = response.text?.trim() || "";

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?/g, "");
    }

    const selection = JSON.parse(jsonText);

    // Map back to full image objects with selection data
    const selectedImages: SelectedImage[] = selection.selected.map(
      (sel: {
        imageIndex: number;
        reasoning: string;
        brandRelevanceScore: number;
        videoSuitabilityScore: number;
        visualQualityScore: number;
      }) => {
        const img = images[sel.imageIndex];
        const composite =
          sel.brandRelevanceScore * 0.4 +
          sel.videoSuitabilityScore * 0.35 +
          sel.visualQualityScore * 0.25;

        return {
          ...img,
          selection: {
            reasoning: sel.reasoning,
            scores: {
              brandRelevance: sel.brandRelevanceScore,
              videoSuitability: sel.videoSuitabilityScore,
              visualQuality: sel.visualQualityScore,
              composite: parseFloat(composite.toFixed(2)),
            },
          },
        };
      }
    );

    console.log(`[Selection] Selected ${selectedImages.length} images`);

    return {
      images: selectedImages,
      diversityNotes: selection.diversityNotes,
      metadata: {
        totalAnalyzed: images.length,
        selected: selectedImages.length,
        model: "gemini-2.0-flash",
      },
    };
  } catch (error) {
    console.error("[Selection] Error:", error);
    throw error;
  }
}

/**
 * Test the Gemini connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say 'OK' if you can read this.",
    });

    const text = response.text?.trim() || "";
    console.log(`[Selection] Gemini connection test: ${text}`);
    return text.toLowerCase().includes("ok");
  } catch (error) {
    console.error("[Selection] Connection test failed:", error);
    return false;
  }
}
