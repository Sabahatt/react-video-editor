/**
 * Test script for BLIP Image Captioning (Local Service)
 *
 * Prerequisites:
 *   cd blip-service
 *   pip install -r requirements.txt
 *   python main.py
 *
 * Usage:
 *   npx tsx scripts/test-blip.ts
 *   npx tsx scripts/test-blip.ts --brand=doughnut-vault
 *   npx tsx scripts/test-blip.ts --brand=joes-pizza
 *   npx tsx scripts/test-blip.ts --brand=sweetgreen
 */

import * as fs from "fs";
import * as path from "path";
import {
  generateCaptions,
  checkBLIPService,
  testBLIPConnection,
  type ImageInput,
  type ImageWithCaption,
} from "../src/utils/blip-captions";

const POC_DATA_DIR = path.join(__dirname, "..", "poc-data");

async function loadProducts(brand: string): Promise<ImageInput[]> {
  const productsPath = path.join(POC_DATA_DIR, brand, "products.json");

  if (!fs.existsSync(productsPath)) {
    throw new Error(`Products file not found: ${productsPath}`);
  }

  const content = fs.readFileSync(productsPath, "utf-8");
  return JSON.parse(content);
}

async function loadBrand(brand: string): Promise<Record<string, unknown>> {
  const brandPath = path.join(POC_DATA_DIR, brand, "brand.json");

  if (!fs.existsSync(brandPath)) {
    throw new Error(`Brand file not found: ${brandPath}`);
  }

  const content = fs.readFileSync(brandPath, "utf-8");
  return JSON.parse(content);
}

function saveResults(brand: string, results: ImageWithCaption[]) {
  const outputPath = path.join(POC_DATA_DIR, brand, "products-with-captions.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n[SAVE] Results saved to: ${outputPath}`);
}

async function testBLIP(brandSlug: string) {
  console.log("=".repeat(60));
  console.log("BLIP Image Captioning Test (Local Service)");
  console.log("=".repeat(60));

  // Check if BLIP service is running
  console.log("\n[CHECK] Verifying BLIP service is running...");
  const isRunning = await checkBLIPService();

  if (!isRunning) {
    console.error("\n" + "=".repeat(60));
    console.error("BLIP SERVICE NOT RUNNING");
    console.error("=".repeat(60));
    console.error("\nPlease start the service first:\n");
    console.error("  cd blip-service");
    console.error("  pip install -r requirements.txt");
    console.error("  python main.py");
    console.error("\nThen run this test again.");
    process.exit(1);
  }

  // Load products
  const products = await loadProducts(brandSlug);
  console.log(`\nLoaded ${products.length} products from ${brandSlug}`);

  // Test with first image
  console.log("\n[TEST] Testing with first product image...");
  const testOk = await testBLIPConnection(products[0].url);
  if (!testOk) {
    console.error("Connection test failed");
    process.exit(1);
  }

  // Load brand info
  const brand = await loadBrand(brandSlug);
  console.log(`\nBrand: ${brand.name}`);
  console.log(`Type: ${brand.mainDishType}`);
  console.log(`Tone: ${brand.tone}`);

  // Generate captions
  console.log("\n" + "-".repeat(60));
  console.log("Generating captions...");
  console.log("-".repeat(60));

  const startTime = Date.now();
  const captioned = await generateCaptions(products);
  const totalTime = Date.now() - startTime;

  // Display results
  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));

  captioned.forEach((img, i) => {
    console.log(`\n--- Image ${i + 1}/${captioned.length} ---`);
    console.log(`Product:     ${img.productName}`);
    console.log(`Original:    ${img.productDescription || "N/A"}`);
    console.log(`BLIP:        ${img.caption}`);
    console.log(`Dimensions:  ${img.dimensions?.width}x${img.dimensions?.height}`);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total images:     ${captioned.length}`);
  console.log(`Total time:       ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Avg per image:    ${(totalTime / captioned.length / 1000).toFixed(2)}s`);

  // Compare BLIP captions to original descriptions
  console.log("\n" + "-".repeat(60));
  console.log("Caption Quality Check");
  console.log("-".repeat(60));

  const withOriginal = captioned.filter((img) => img.productDescription);
  console.log(`\nImages with original description: ${withOriginal.length}/${captioned.length}`);

  if (withOriginal.length > 0) {
    console.log("\nComparison (Original vs BLIP):");
    withOriginal.forEach((img) => {
      console.log(`\n  ${img.productName}:`);
      console.log(`    Original: "${img.productDescription}"`);
      console.log(`    BLIP:     "${img.caption}"`);
    });
  }

  // Save results
  saveResults(brandSlug, captioned);

  console.log("\n" + "=".repeat(60));
  console.log("Test complete!");
  console.log("=".repeat(60));

  return captioned;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let brandSlug = "doughnut-vault"; // default

  for (const arg of args) {
    if (arg.startsWith("--brand=")) {
      brandSlug = arg.split("=")[1];
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
    await testBLIP(brandSlug);
  } catch (error) {
    console.error("\n[ERROR]", error);
    process.exit(1);
  }
}

main();
