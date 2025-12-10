/**
 * Ad Generation Orchestration API - v3 (POC Demo Mode)
 *
 * POC Plan Implementation:
 * 1. Scrape website (uses pre-scraped data for POC restaurants)
 * 2. Generate script with POC brand context
 * 3. Plan scenes (animated vs static with pattern variation)
 * 4. Select images (main dish priority for animated, supporting for static)
 * 5. Generate POC-specific Akool animation prompts
 * 6. Animate images via Akool API (optional, disabled by default for POC)
 * 7. Build timeline for editor
 *
 * Key Changes in v3:
 * - Pre-scraped data for POC restaurants (fast, consistent quality)
 * - Scene planner with 5 pattern variations for animated/static balance
 * - Intro always static (USP focus), body has 2 animated + 2 static
 * - Main dish prioritization for animated scenes
 * - POC-specific Akool prompts with texture inference
 * - Ken Burns direction for static scenes
 * - animateImages defaults to false (no Akool credits for demo)
 */

import { NextRequest, NextResponse } from "next/server";
import { buildTimelineDesign } from "@/lib/timeline-builder";
import { detectPOCBrand } from "@/lib/script-generator/poc-brands";
import {
  categorizeImages,
  selectImagesForScenePlan,
  getMainDishType,
} from "@/lib/script-generator/image-selector";
import { generateAkoolPromptWithLLM, NEGATIVE_PROMPT } from "@/lib/script-generator/akool-prompts";
import {
  planScenes,
  type ScenePlan,
} from "@/lib/script-generator/scene-planner";

// POC Restaurant configs
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
  /** If true, animate images via Akool API (consumes credits). Defaults to false for POC. */
  animateImages?: boolean;
  /** Optional: Force a specific pattern (0-4) for testing */
  patternIndex?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAdRequest = await request.json();
    // Default animateImages to false for POC demo (no Akool credits)
    const { restaurant, animateImages = false, patternIndex } = body;

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
    console.log(`GENERATING AD v3 (POC Demo): ${restaurantConfig.name}`);
    console.log(`  Animation: ${animateImages ? 'Enabled (Akool)' : 'Disabled (Ken Burns only)'}`);
    console.log("=".repeat(60));

    // ============ Step 1: Scrape (uses pre-scraped POC data automatically) ============
    console.log("\n[Step 1] Loading brand data...");
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
    console.log(`  ✓ Loaded: ${scrapedImages.length} images`);

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
        duration: 20, // v3: 20s ads with 5 scenes
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

    // ============ Step 3: Plan Scenes (Animated vs Static) ============
    console.log("\n[Step 3] Planning scene visual modes...");

    // Build scene data for planner
    const scenesForPlanning = scriptResult.script.scenes.map(
      (s: { id: string; visualCategory?: string; visualType?: string }) => ({
        id: s.id,
        visualCategory: s.visualCategory,
        visualType: s.visualType,
      })
    );

    // Plan scenes with pattern variation
    const scenePlan: ScenePlan = planScenes(
      scenesForPlanning,
      pocBrand,
      patternIndex // Use provided pattern or random
    );

    console.log(`  ✓ Using pattern ${scenePlan.patternIndex + 1}/5`);
    console.log(`  ✓ Animated scenes: ${scenePlan.animatedCount}`);
    console.log(`  ✓ Static scenes: ${scenePlan.staticCount}`);

    // ============ Step 4: Select Images by Scene Plan ============
    console.log("\n[Step 4] Selecting images with main dish priority...");

    // Categorize all scraped images
    const categorizedImages = categorizeImages(scrapedImages, menuCategories);

    // Get main dish type for this brand
    const mainDishType = getMainDishType(restaurantConfig.name);
    console.log(`  ✓ Main dish type: ${mainDishType || 'unknown'}`);

    // Select images based on scene plan (animated gets main dish priority)
    const selectedImages = selectImagesForScenePlan(
      categorizedImages,
      scenePlan,
      mainDishType
    );

    console.log(
      `  ✓ Selected: ${selectedImages.length} images`
    );
    console.log(
      `    - Animated: ${selectedImages.filter(i => i.visualMode === 'animated').length}`
    );
    console.log(
      `    - Static: ${selectedImages.filter(i => i.visualMode === 'static').length}`
    );

    // ============ Step 5: Build Enriched Scenes with LLM-generated Akool Prompts ============
    console.log("\n[Step 5] Building enriched scenes with LLM-generated Akool prompts...");

    // First, collect all animated scenes that need LLM prompts
    const animatedScenesForLLM: Array<{
      sceneIdx: number;
      selectedImage: typeof selectedImages[0];
    }> = [];

    let imageIndex = 0;
    const sceneData = scriptResult.script.scenes.map(
      (scene: {
        id: string;
        voiceoverText: string;
        displayText: string;
        duration: number;
        visualType: string;
        visualCategory?: string;
        contactOverlay?: { phone?: string; address?: string; website?: string; hours?: string };
      }, sceneIdx: number) => {
        const plannedScene = scenePlan.scenes.find(s => s.sceneIndex === sceneIdx);
        const shouldAnimate = plannedScene?.visualMode === 'animated';
        const kenBurnsDirection = plannedScene?.kenBurnsDirection;

        // Get the selected image for this scene (if not CTA)
        let selectedImage = null;
        if (scene.visualType !== "logo_brand" && scene.id !== "cta") {
          selectedImage = imageIndex < selectedImages.length
            ? selectedImages[imageIndex++]
            : null;
        }

        // Collect animated scenes for LLM prompt generation
        if (shouldAnimate && selectedImage) {
          animatedScenesForLLM.push({ sceneIdx, selectedImage });
        }

        return {
          scene,
          sceneIdx,
          plannedScene,
          shouldAnimate,
          kenBurnsDirection,
          selectedImage,
        };
      }
    );

    // Generate LLM prompts for all animated scenes in parallel
    console.log(`  ✓ Generating LLM prompts for ${animatedScenesForLLM.length} animated scenes...`);

    const llmPromptResults = await Promise.all(
      animatedScenesForLLM.map(async ({ sceneIdx, selectedImage }) => {
        const akoolConfig = await generateAkoolPromptWithLLM(
          selectedImage.alt,
          {
            productDescription: selectedImage.productDescription,
            foodType: selectedImage.foodType,
            brandName: restaurantConfig.name,
            sceneIndex: sceneIdx,
          }
        );
        return { sceneIdx, akoolConfig };
      })
    );

    // Create a map for quick lookup
    const akoolConfigMap = new Map<number, typeof llmPromptResults[0]['akoolConfig']>();
    for (const result of llmPromptResults) {
      akoolConfigMap.set(result.sceneIdx, result.akoolConfig);
    }

    // Build enriched scenes with the LLM-generated prompts
    const enrichedScenes = sceneData.map(
      ({ scene, sceneIdx, shouldAnimate, kenBurnsDirection, selectedImage }: {
        scene: {
          id: string;
          voiceoverText: string;
          displayText: string;
          duration: number;
          visualType: string;
          visualCategory?: string;
          contactOverlay?: { phone?: string; address?: string; website?: string; hours?: string };
        };
        sceneIdx: number;
        plannedScene: unknown;
        shouldAnimate: boolean;
        kenBurnsDirection: string | undefined;
        selectedImage: typeof selectedImages[0] | null;
      }) => {
        if (scene.visualType === "logo_brand" || scene.id === "cta") {
          // CTA scene - always logo
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
            visualMode: 'static' as const,
            contactOverlay: scene.contactOverlay,
          };
        }

        if (!selectedImage) {
          // No image available - use static with Ken Burns
          return {
            id: scene.id,
            voiceoverText: scene.voiceoverText,
            displayText: scene.displayText,
            duration: scene.duration,
            visual: {
              type: "static_image" as const,
              url: null,
              alt: "",
            },
            visualMode: 'static' as const,
            kenBurnsDirection,
            contactOverlay: scene.contactOverlay,
          };
        }

        if (shouldAnimate) {
          // Get the LLM-generated Akool prompt
          const akoolConfig = akoolConfigMap.get(sceneIdx)!;

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
            visualMode: 'animated' as const,
            contactOverlay: scene.contactOverlay,
            akoolConfig,
            foodType: selectedImage.foodType,
          };
        } else {
          // Static scene with Ken Burns effect
          return {
            id: scene.id,
            voiceoverText: scene.voiceoverText,
            displayText: scene.displayText,
            duration: scene.duration,
            visual: {
              type: "static_image" as const,
              url: selectedImage.url,
              alt: selectedImage.alt,
            },
            visualMode: 'static' as const,
            kenBurnsDirection,
            contactOverlay: scene.contactOverlay,
            foodType: selectedImage.foodType,
          };
        }
      }
    );

    const animatedSceneCount = enrichedScenes.filter(
      (s: { visualMode: string }) => s.visualMode === 'animated'
    ).length;
    const staticSceneCount = enrichedScenes.filter(
      (s: { visualMode: string; visual: { type: string } }) =>
        s.visualMode === 'static' && s.visual.type !== 'logo_brand'
    ).length;

    console.log(`  ✓ Enriched ${enrichedScenes.length} scenes`);
    console.log(`    - ${animatedSceneCount} animated (Akool)`);
    console.log(`    - ${staticSceneCount} static (Ken Burns)`);

    // ============ Step 6: Animate Images (Optional) ============
    if (animateImages) {
      console.log("\n[Step 6] Animating images via Akool...");

      // Only animate scenes marked as animated
      const scenesToAnimate = enrichedScenes
        .filter((s: { visualMode: string; visual: { type: string; url: string | null } }) =>
          s.visualMode === 'animated' && s.visual.type === "animated_image" && s.visual.url
        )
        .map((s: {
          id: string;
          visual: { url: string };
          akoolConfig?: { prompt: string; negativePrompt: string; videoLength: number; resolution: string }
        }) => ({
          sceneId: s.id,
          imageUrl: s.visual.url,
          prompt: s.akoolConfig?.prompt || "slow zoom in, appetizing food photography",
          negativePrompt: s.akoolConfig?.negativePrompt || NEGATIVE_PROMPT,
          videoLength: s.akoolConfig?.videoLength || 5,
          resolution: s.akoolConfig?.resolution || "720p",
        }));

      if (scenesToAnimate.length > 0) {
        console.log(`  ✓ Submitting ${scenesToAnimate.length} scenes for animation...`);

        const animateRes = await fetch(`${baseUrl}/api/animate-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenes: scenesToAnimate }),
        });
        const animateResult = await animateRes.json();

        if (animateResult.success && animateResult.results) {
          // Update scenes with video URLs or task IDs
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
        console.log("  ⚠ No animated scenes to process");
      }
    } else {
      console.log("\n[Step 6] Skipping animation (animateImages=false)");
      console.log("  ℹ  Static scenes will use Ken Burns effect in editor");
    }

    // ============ Step 7: Build Timeline ============
    console.log("\n[Step 7] Building timeline...");
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
    console.log("AD GENERATION v3 COMPLETE");
    console.log("=".repeat(60));
    console.log(`Pattern used: ${scenePlan.patternIndex + 1}/5`);
    console.log(`Main dish type: ${mainDishType || 'unknown'}`);
    console.log(`Animated scenes: ${animatedSceneCount}`);
    console.log(`Static scenes: ${staticSceneCount}`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      design,
      brand,
      script: enrichedScript,
      selectedImages,
      scenePlan: {
        patternIndex: scenePlan.patternIndex,
        animatedCount: scenePlan.animatedCount,
        staticCount: scenePlan.staticCount,
        scenes: scenePlan.scenes,
      },
      mainDishType,
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
