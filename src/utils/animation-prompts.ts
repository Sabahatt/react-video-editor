/**
 * Animation Prompt Generator using Google Gemini
 *
 * Generates simple, effective animation prompts for Akool
 * based on image captions and product info.
 *
 * Prompt pattern: "animate this image of [description] [optional motion]"
 */

import { GoogleGenAI } from "@google/genai";

export interface ImageForAnimation {
  url: string;
  productName: string;
  caption: string;
  productDescription?: string;
  foodType?: string;
  [key: string]: unknown;
}

export interface AnimationPrompt {
  url: string;
  productName: string;
  caption: string;
  animationPrompt: string;
}

export interface AnimationPromptsResult {
  prompts: AnimationPrompt[];
  metadata: {
    total: number;
    model: string;
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing Google AI API key. Set GOOGLE_AI_API_KEY in .env.local"
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Generate animation prompts for selected images
 */
export async function generateAnimationPrompts(
  images: ImageForAnimation[]
): Promise<AnimationPromptsResult> {
  const ai = getGeminiClient();

  console.log(`[Animation] Generating prompts for ${images.length} images...`);

  const imagesText = images
    .map(
      (img, i) => `
Image ${i + 1}:
- Product: ${img.productName}
- Caption: ${img.caption}
- Description: ${img.productDescription || "N/A"}`
    )
    .join("\n");

  const prompt = `Generate simple animation prompts for Akool image-to-video.

**Format:** "animate this image of [what you SEE] [simple motion]"

**Good examples:**
- "animate this image of fresh donut stack in hands slowly extending towards camera"
- "animate this image of stacked bowls of fresh donuts"
- "animate this image of hands holding a long plate of donuts"
- "animate this image of strawberry cheesecake slice with the strawberry sauce dripping"

**Critical rules:**
1. Describe what's VISUALLY in the image based on the caption - if caption says "hands holding" include that
2. Add natural motion: extending towards camera, dripping, steam rising, slight zoom, etc.
3. Keep it SHORT - under 12 words after "animate this image of"
4. NO product names or brand names - just describe what you see
5. Focus on the visual elements: hands, stacks, plates, dripping sauce, steam, etc.

**Images:**
${imagesText}

**Return ONLY valid JSON (no markdown):**
{
  "prompts": [
    {"imageIndex": 0, "prompt": "animate this image of ..."},
    {"imageIndex": 1, "prompt": "animate this image of ..."}
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const responseText = response.text?.trim() || "";

    let jsonText = responseText;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?/g, "");
    }

    const result = JSON.parse(jsonText);

    const prompts: AnimationPrompt[] = result.prompts.map(
      (p: { imageIndex: number; prompt: string }) => {
        const img = images[p.imageIndex];
        return {
          url: img.url,
          productName: img.productName,
          caption: img.caption,
          animationPrompt: p.prompt,
        };
      }
    );

    console.log(`[Animation] Generated ${prompts.length} prompts`);

    return {
      prompts,
      metadata: {
        total: prompts.length,
        model: "gemini-2.0-flash",
      },
    };
  } catch (error) {
    console.error("[Animation] Error:", error);
    throw error;
  }
}
