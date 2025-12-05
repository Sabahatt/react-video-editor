/**
 * Ad Generation Orchestration API
 *
 * Runs the full pipeline (Steps 1-4) and returns editor-compatible design data:
 * 1. Scrape website
 * 2. Generate script
 * 3. Match visuals (CLIP)
 * 4. Resolve stock videos (Pexels)
 * 5. Build timeline for editor
 */

import { NextRequest, NextResponse } from "next/server";
import { buildTimelineDesign } from "@/lib/timeline-builder";

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
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAdRequest = await request.json();
    const { restaurant } = body;

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
    console.log(`GENERATING AD: ${restaurantConfig.name}`);
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
    console.log(
      `  ✓ Scraped: ${scrapeResult.data?.images?.length || 0} images`
    );

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
        duration: 10,
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

    // ============ Step 3: Match Visuals ============
    console.log("\n[Step 3] Matching visuals (CLIP)...");
    const matchRes = await fetch(`${baseUrl}/api/match-visuals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: scriptResult.script,
        scrapedData: scrapeResult.data,
      }),
    });
    const matchResult = await matchRes.json();

    if (!matchResult.success) {
      throw new Error(`Visual matching failed: ${matchResult.error}`);
    }
    const matchedCount =
      matchResult.script?.scenes?.filter(
        (s: { visual: { url: string } }) => s.visual.url
      ).length || 0;
    console.log(
      `  ✓ Matched: ${matchedCount}/${matchResult.script?.scenes?.length || 0} scenes`
    );

    // ============ Step 4: Resolve Stock Videos ============
    console.log("\n[Step 4] Resolving stock videos (Pexels)...");
    const stockRes = await fetch(`${baseUrl}/api/resolve-stock-videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: matchResult.script,
        brand: {
          ...matchResult.brand,
          cuisine: scrapeResult.data?.brand?.cuisine,
        },
      }),
    });
    const stockResult = await stockRes.json();

    if (!stockResult.success) {
      throw new Error(`Stock video resolution failed: ${stockResult.error}`);
    }
    const stockCount = Object.keys(stockResult.stockVideos || {}).length;
    console.log(`  ✓ Resolved: ${stockCount} stock videos`);

    // ============ Step 5: Build Timeline ============
    console.log("\n[Step 5] Building timeline...");
    const design = buildTimelineDesign(stockResult.script, stockResult.brand);
    console.log(
      `  ✓ Built: ${design.trackItemIds.length} track items, ${design.duration}ms duration`
    );

    console.log("\n" + "=".repeat(60));
    console.log("AD GENERATION COMPLETE");
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      design,
      brand: stockResult.brand,
      script: stockResult.script,
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
