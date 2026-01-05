/**
 * Test script for Animation Prompt Generation
 *
 * Prerequisites:
 *   1. Run selection first: npx tsx scripts/test-selection.ts
 *   2. Set GOOGLE_AI_API_KEY in .env.local
 *
 * Usage:
 *   npx tsx scripts/test-animation-prompts.ts
 *   npx tsx scripts/test-animation-prompts.ts --brand=doughnut-vault
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import {
  generateAnimationPrompts,
  type AnimationPromptsResult,
} from "../src/utils/animation-prompts";

dotenv.config({ path: ".env.local" });

const POC_DATA_DIR = path.join(__dirname, "..", "poc-data");

interface SelectedImage {
  url: string;
  productName: string;
  caption: string;
  productDescription?: string;
  foodType?: string;
  selection?: unknown;
}

async function loadSelectedImages(brand: string): Promise<SelectedImage[]> {
  const selectedPath = path.join(POC_DATA_DIR, brand, "selected-images.json");

  if (!fs.existsSync(selectedPath)) {
    throw new Error(
      `Selected images not found. Run selection first:\n  npx tsx scripts/test-selection.ts --brand=${brand}`
    );
  }

  const content = fs.readFileSync(selectedPath, "utf-8");
  const data = JSON.parse(content);
  return data.images;
}

function saveResults(brand: string, results: AnimationPromptsResult) {
  const outputPath = path.join(POC_DATA_DIR, brand, "animation-prompts.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n[SAVE] Results saved to: ${outputPath}`);
}

async function testAnimationPrompts(brandSlug: string) {
  console.log("=".repeat(60));
  console.log("Animation Prompt Generation Test");
  console.log("=".repeat(60));

  // Load selected images
  const images = await loadSelectedImages(brandSlug);
  console.log(`\nLoaded ${images.length} selected images from ${brandSlug}`);

  // Generate prompts
  console.log("\n" + "-".repeat(60));
  console.log("Generating animation prompts...");
  console.log("-".repeat(60));

  const startTime = Date.now();
  const result = await generateAnimationPrompts(images);
  const elapsed = Date.now() - startTime;

  // Display results
  console.log("\n" + "=".repeat(60));
  console.log("ANIMATION PROMPTS");
  console.log("=".repeat(60));

  result.prompts.forEach((p, i) => {
    console.log(`\n--- #${i + 1}: ${p.productName} ---`);
    console.log(`Caption:  ${p.caption}`);
    console.log(`Prompt:   ${p.animationPrompt}`);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total prompts:  ${result.metadata.total}`);
  console.log(`Model:          ${result.metadata.model}`);
  console.log(`Time:           ${elapsed}ms`);

  // Save results
  saveResults(brandSlug, result);

  console.log("\n" + "=".repeat(60));
  console.log("Animation prompts ready!");
  console.log("=".repeat(60));

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  let brandSlug = "doughnut-vault";

  for (const arg of args) {
    if (arg.startsWith("--brand=")) {
      brandSlug = arg.split("=")[1];
    }
  }

  try {
    await testAnimationPrompts(brandSlug);
  } catch (error) {
    console.error("\n[ERROR]", error);
    process.exit(1);
  }
}

main();
