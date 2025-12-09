/**
 * Ad Generation Orchestration API - v2
 *
 * Simplified pipeline for POC demo:
 * 1. Scrape website
 * 2. Generate script with POC brand context
 * 3. Select images by category + quality (no CLIP)
 * 4. Generate smart Akool animation prompts
 * 5. Animate images via Akool API (optional)
 * 6. Build timeline for editor
 */

import { NextRequest, NextResponse } from "next/server";
import { buildTimelineDesign } from "@/lib/timeline-builder";
import {
  detectPOCBrand,
  selectImagesForAd,
  generateAkoolPrompt,
} from "@/lib/script-generator";

// POC Restaurant URLs
const POC_RESTAURANTS: Record<
  string,
  { url: string; name: string; tone: string }
> = {
  "joes-pizza": {
    url: "https://www.joespizza.com/menu-joes-pizza-santa-monica-venice",
    name: "Joe's Pizza",
    tone: "playful",
  },
  "doughnut-vault": {
    url: "https://www.doughnutvault.com/",
    name: "The Doughnut Vault",
    tone: "friendly",
  },
  sweetgreen: {
    url: "https://www.sweetgreen.com/",
    name: "Sweetgreen",
    tone: "professional",
  },
};

interface GenerateAdRequest {
  restaurant: string;
  /** If true, animate images via Akool API (consumes credits) */
  animateImages?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAdRequest = await request.json();
    const { restaurant, animateImages = false } = body;

    // Validate restaurant
    const restaurantConfig = POC_RESTAURANTS[restaurant];
    if (!restaurantConfig) {
      return NextResponse.json(
        { success: false, error: `Unknown restaurant: ${restaurant}` },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    console.log(`\n${"=".repeat(60)}`);
    console.log(`GENERATING AD v2: ${restaurantConfig.name}`);
    console.log("=".repeat(60));

    // ============ Step 1: Scrape ============
    console.log("\n[Step 1] Scraping website...");
    const scrapeRes = await fetch(`${baseUrl}/api/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: restaurantConfig.url }),
    });
    const scrapeResult = await scrapeRes.json();

    if (!scrapeResult.success) {
      throw new Error(`Scraping failed: ${scrapeResult.error}`);
    }
    const scrapedImages = scrapeResult.data?.images || [];
    console.log(`  ✓ Scraped: ${scrapedImages.length} images`);

    // ============ Step 2: Generate Script ============
    console.log("\n[Step 2] Generating script...");
    const scriptRes = await fetch(`${baseUrl}/api/generate-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: scrapeResult.data?.brand?.name || restaurantConfig.name,
        tagline: scrapeResult.data?.brand?.tagline,
        description: scrapeResult.data?.brand?.description,
        cuisine: scrapeResult.data?.brand?.cuisine,
        tone: restaurantConfig.tone,
        duration: 20, // v2: longer ads
        url: restaurantConfig.url,
      }),
    });
    const scriptResult = await scriptRes.json();

    if (!scriptResult.success) {
      throw new Error(`Script generation failed: ${scriptResult.error}`);
    }
    console.log(
      `  ✓ Generated: ${scriptResult.script?.scenes?.length || 0} scenes`
    );

    // Get POC brand config for menu categories
    const pocBrand = detectPOCBrand(restaurantConfig.name, restaurantConfig.url);
    const menuCategories = pocBrand?.menuCategories || {};

    // ============ Step 3: Select Images by Category ============
    console.log("\n[Step 3] Selecting images by category...");

    // Get requested categories from script scenes
    const requestedCategories = scriptResult.script.scenes
      .filter((s: { visualType: string }) => s.visualType === "animated_image")
      .map((s: { visualCategory?: string }) => s.visualCategory);

    // Count scenes that need images (exclude CTA which uses logo)
    const sceneCount = scriptResult.script.scenes.filter(
      (s: { visualType: string }) => s.visualType === "animated_image"
    ).length;

    // Select diverse images by category + quality
    const selectedImages = selectImagesForAd(
      scrapedImages,
      menuCategories,
      requestedCategories,
      sceneCount
    );

    console.log(`  ✓ Selected: ${selectedImages.length} images from ${new Set(selectedImages.map(i => i.category)).size} categories`);

    // ============ Step 4: Build Enriched Scenes with Akool Prompts ============
    console.log("\n[Step 4] Generating animation prompts...");

    let imageIndex = 0;
    const enrichedScenes = scriptResult.script.scenes.map(
      (scene: {
        id: string;
        voiceoverText: string;
        displayText: string;
        duration: number;
        visualType: string;
        visualCategory?: string;
        contactOverlay?: { phone?: string; address?: string; website?: string; hours?: string };
      }) => {
        if (scene.visualType === "animated_image" && imageIndex < selectedImages.length) {
          const selectedImage = selectedImages[imageIndex];
          imageIndex++;

          // Generate smart Akool prompt based on image content
          const akoolConfig = generateAkoolPrompt(
            selectedImage.alt,
            selectedImage.category,
            scene.id
          );

          return {
            id: scene.id,
            voiceoverText: scene.voiceoverText,
            displayText: scene.displayText,
            duration: scene.duration,
            visual: {
              type: "animated_image" as const,
              url: selectedImage.url,
              alt: selectedImage.alt,
              prompt: akoolConfig.prompt,
            },
            contactOverlay: scene.contactOverlay,
            akoolConfig,
          };
        } else if (scene.visualType === "logo_brand") {
          return {
            id: scene.id,
            voiceoverText: scene.voiceoverText,
            displayText: scene.displayText,
            duration: scene.duration,
            visual: {
              type: "logo_brand" as const,
              url: scrapeResult.data?.brand?.logo || null,
              alt: restaurantConfig.name,
            },
            contactOverlay: scene.contactOverlay,
          };
        } else {
          return {
            id: scene.id,
            voiceoverText: scene.voiceoverText,
            displayText: scene.displayText,
            duration: scene.duration,
            visual: {
              type: scene.visualType,
              url: null,
              alt: "",
            },
            contactOverlay: scene.contactOverlay,
          };
        }
      }
    );

    console.log(`  ✓ Generated prompts for ${imageIndex} scenes`);

    // ============ Step 5: Animate Images (Optional) ============
    if (animateImages) {
      console.log("\n[Step 5] Animating images via Akool...");

      // Transform scenes to match animate-images API format
      const scenesToAnimate = enrichedScenes
        .filter((s: { visual: { type: string; url: string | null } }) =>
          s.visual.type === "animated_image" && s.visual.url
        )
        .map((s: {
          id: string;
          visual: { url: string };
          akoolConfig?: { prompt: string; negativePrompt: string; videoLength: number; resolution: string }
        }) => ({
          sceneId: s.id,
          imageUrl: s.visual.url,
          prompt: s.akoolConfig?.prompt || "slow zoom in, appetizing food photography",
          negativePrompt: s.akoolConfig?.negativePrompt || "blurry, distorted",
          videoLength: s.akoolConfig?.videoLength || 5,
          resolution: s.akoolConfig?.resolution || "720p",
        }));

      if (scenesToAnimate.length > 0) {
        const animateRes = await fetch(`${baseUrl}/api/animate-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenes: scenesToAnimate }),
        });
        const animateResult = await animateRes.json();

        if (animateResult.success && animateResult.results) {
          // Update scenes with task IDs (videos are generated async)
          for (const result of animateResult.results) {
            const scene = enrichedScenes.find((s: { id: string }) => s.id === result.sceneId);
            if (scene && result.videoUrl) {
              scene.visual.url = result.videoUrl;
              scene.visual.type = "stock_video"; // Now it's a video
            } else if (scene && result.taskId) {
              // Store task ID for later polling
              scene.akoolTaskId = result.taskId;
            }
          }
          console.log(`  ✓ Submitted: ${animateResult.results.length} animations`);
          console.log(`  ✓ Credits used: ${animateResult.totalCredits}`);
        } else {
          console.warn(`  ⚠ Animation failed: ${animateResult.error}`);
        }
      } else {
        console.log("  ⚠ No images to animate");
      }
    } else {
      console.log("\n[Step 5] Skipping animation (animateImages=false)");
    }

    // ============ Step 6: Build Timeline ============
    console.log("\n[Step 6] Building timeline...");
    const enrichedScript = {
      fullScript: scriptResult.script.fullScript,
      scenes: enrichedScenes,
      tone: scriptResult.script.tone,
      totalDuration: scriptResult.script.totalDuration,
    };

    const brand = {
      name: restaurantConfig.name,
      colors: scrapeResult.data?.brand?.colors,
      logo: scrapeResult.data?.brand?.logo,
      cuisine: scrapeResult.data?.brand?.cuisine,
    };

    const design = buildTimelineDesign(enrichedScript, brand);
    console.log(
      `  ✓ Built: ${design.trackItemIds.length} track items, ${design.duration}ms duration`
    );

    console.log("\n" + "=".repeat(60));
    console.log("AD GENERATION v2 COMPLETE");
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      design,
      brand,
      script: enrichedScript,
      selectedImages,
    });
  } catch (error) {
    console.error("Ad generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ad generation failed",
      },
      { status: 500 }
    );
  }
}
