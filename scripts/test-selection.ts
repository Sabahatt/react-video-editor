/**
 * Test script for Image Selection using Google Gemini
 *
 * Prerequisites:
 *   1. Run captioning first: npx tsx scripts/test-blip.ts
 *   2. Set GOOGLE_AI_API_KEY in .env.local
 *
 * Usage:
 *   npx tsx scripts/test-selection.ts
 *   npx tsx scripts/test-selection.ts --brand=doughnut-vault
 *   npx tsx scripts/test-selection.ts --count=3
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import {
  selectImages,
  testGeminiConnection,
  type ImageWithCaption,
  type BrandContext,
  type SelectionResult,
} from "../src/utils/image-selection";

// Load environment variables
dotenv.config({ path: ".env.local" });

const POC_DATA_DIR = path.join(__dirname, "..", "poc-data");

async function loadCaptionedProducts(brand: string): Promise<ImageWithCaption[]> {
  // Try to load products with captions first
  const captionedPath = path.join(POC_DATA_DIR, brand, "products-with-captions.json");

  if (fs.existsSync(captionedPath)) {
    const content = fs.readFileSync(captionedPath, "utf-8");
    return JSON.parse(content);
  }

  // Fall back to regular products
  const productsPath = path.join(POC_DATA_DIR, brand, "products.json");

  if (!fs.existsSync(productsPath)) {
    throw new Error(`Products file not found. Run captioning first:\n  npx tsx scripts/test-blip.ts --brand=${brand}`);
  }

  console.log("[WARN] Using products without captions. Run captioning first for better results.");
  const content = fs.readFileSync(productsPath, "utf-8");
  const products = JSON.parse(content);

  // Add placeholder captions
  return products.map((p: ImageWithCaption) => ({
    ...p,
    caption: p.productDescription || p.productName || "No caption",
  }));
}

async function loadBrand(brand: string): Promise<BrandContext> {
  const brandPath = path.join(POC_DATA_DIR, brand, "brand.json");

  if (!fs.existsSync(brandPath)) {
    throw new Error(`Brand file not found: ${brandPath}`);
  }

  const content = fs.readFileSync(brandPath, "utf-8");
  return JSON.parse(content);
}

function saveResults(brand: string, results: SelectionResult) {
  const outputPath = path.join(POC_DATA_DIR, brand, "selected-images.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n[SAVE] Results saved to: ${outputPath}`);
}

async function testSelection(brandSlug: string, count: number) {
  console.log("=".repeat(60));
  console.log("Image Selection Test (Google Gemini)");
  console.log("=".repeat(60));

  // Check API key
  if (!process.env.GOOGLE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error("\n[ERROR] Missing GOOGLE_AI_API_KEY in .env.local");
    console.error("\nTo get a free API key:");
    console.error("  1. Go to https://aistudio.google.com");
    console.error("  2. Click 'Get API Key'");
    console.error("  3. Add to .env.local: GOOGLE_AI_API_KEY=AIza...");
    process.exit(1);
  }

  // Test Gemini connection
  console.log("\n[CHECK] Testing Gemini connection...");
  const isConnected = await testGeminiConnection();

  if (!isConnected) {
    console.error("\n[ERROR] Could not connect to Gemini API");
    process.exit(1);
  }

  // Load data
  const products = await loadCaptionedProducts(brandSlug);
  console.log(`\nLoaded ${products.length} captioned products from ${brandSlug}`);

  const brand = await loadBrand(brandSlug);
  console.log(`Brand: ${brand.name}`);
  console.log(`Type: ${brand.mainDishType}`);
  console.log(`Tone: ${brand.tone}`);

  // Run selection
  console.log("\n" + "-".repeat(60));
  console.log(`Selecting top ${count} images...`);
  console.log("-".repeat(60));

  const startTime = Date.now();
  const result = await selectImages(products, brand, count);
  const elapsed = Date.now() - startTime;

  // Display results
  console.log("\n" + "=".repeat(60));
  console.log("SELECTED IMAGES");
  console.log("=".repeat(60));

  result.images.forEach((img, i) => {
    console.log(`\n--- #${i + 1}: ${img.productName} ---`);
    console.log(`Caption:    ${img.caption}`);
    console.log(`Reasoning:  ${img.selection.reasoning}`);
    console.log(`Scores:     Brand=${img.selection.scores.brandRelevance}, Video=${img.selection.scores.videoSuitability}, Quality=${img.selection.scores.visualQuality}`);
    console.log(`Composite:  ${img.selection.scores.composite}/10`);
    console.log(`URL:        ${img.url.substring(0, 60)}...`);
  });

  console.log("\n" + "-".repeat(60));
  console.log("Diversity Notes:");
  console.log(result.diversityNotes);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total analyzed:  ${result.metadata.totalAnalyzed}`);
  console.log(`Selected:        ${result.metadata.selected}`);
  console.log(`Model:           ${result.metadata.model}`);
  console.log(`Time:            ${elapsed}ms`);

  // Save results
  saveResults(brandSlug, result);

  console.log("\n" + "=".repeat(60));
  console.log("Selection complete!");
  console.log("=".repeat(60));

  return result;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let brandSlug = "doughnut-vault";
  let count = 5;

  for (const arg of args) {
    if (arg.startsWith("--brand=")) {
      brandSlug = arg.split("=")[1];
    }
    if (arg.startsWith("--count=")) {
      count = parseInt(arg.split("=")[1], 10);
    }
  }

  // List available brands if requested
  if (args.includes("--list")) {
    console.log("\nAvailable brands:");
    const brands = fs.readdirSync(POC_DATA_DIR).filter((dir) => {
      const productsPath = path.join(POC_DATA_DIR, dir, "products.json");
      return fs.existsSync(productsPath);
    });
    brands.forEach((brand) => console.log(`  - ${brand}`));
    return;
  }

  try {
    await testSelection(brandSlug, count);
  } catch (error) {
    console.error("\n[ERROR]", error);
    process.exit(1);
  }
}

main();
