/**
 * Test Script Generator v3
 *
 * Tests the full POC pipeline with:
 * - Scene planner (animated vs static with pattern variation)
 * - Image selector with main dish prioritization
 * - TEMPLATE-based Akool prompts (NO LLM for POC demos - proven prompts only)
 *
 * Uses curated poc-data (brand.json + products.json) for best quality.
 * POC demos use pre-defined templates for consistent, tested video quality.
 *
 * Run with: npx tsx test/scripts/test-script-generator-v3.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { generateScript, detectPOCBrand } from '../../src/lib/script-generator';
import {
  categorizeImages,
  selectImagesForScenePlan,
  getMainDishType,
} from '../../src/lib/script-generator/image-selector';
import { planScenes, BODY_SCENE_PATTERNS } from '../../src/lib/script-generator/scene-planner';
import { generatePOCTemplatePrompt } from '../../src/lib/script-generator/akool-prompts';
import type { ScrapedImage } from '../../src/lib/scraper/types';
import type { GeneratedScript, AkoolAnimationConfig } from '../../src/lib/script-generator/types';
import type { ScenePlan, PlannedScene } from '../../src/lib/script-generator/scene-planner';
import type { SelectedImageWithMode } from '../../src/lib/script-generator/image-selector';

// Load curated POC data (brand.json + products.json)
import joesBrand from '../../poc-data/joes-pizza/brand.json';
import joesProducts from '../../poc-data/joes-pizza/products.json';
import sweetgreenBrand from '../../poc-data/sweetgreen/brand.json';
import sweetgreenProducts from '../../poc-data/sweetgreen/products.json';
import doughnutVaultBrand from '../../poc-data/doughnut-vault/brand.json';
import doughnutVaultProducts from '../../poc-data/doughnut-vault/products.json';

/**
 * Product from products.json - curated product data
 */
interface POCProduct {
  url: string;
  productName: string;
  productDescription?: string;
  foodType: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Convert POC products.json format to ScrapedImage format for image selector
 */
function convertProductsToScrapedImages(products: POCProduct[]): ScrapedImage[] {
  return products.map(p => ({
    url: p.url,
    alt: p.productName, // Use productName as alt text for image selector
    width: p.dimensions?.width,
    height: p.dimensions?.height,
    type: 'product' as const,
    productName: p.productName,
    productDescription: p.productDescription,
    foodType: p.foodType,
  }));
}

interface SceneWithImagesV3 {
  sceneId: string;
  sceneIndex: number;
  voiceoverText: string;
  displayText: string;
  duration: number;
  /** Whether this scene uses Akool animation or Ken Burns static */
  visualMode: 'animated' | 'static';
  /** Ken Burns direction for static scenes */
  kenBurnsDirection?: string;
  /** Selected product image for this scene */
  selectedImage: {
    url: string;
    alt: string;
    category: string;
    foodType?: string;
  } | null;
  /** Akool config for animated scenes only */
  akoolConfig: AkoolAnimationConfig | null;
}

interface ScriptOutputV3 {
  success: boolean;
  pocBrand: string | null;
  mainDishType: string | null;
  /** Full voiceover script (concatenated from all scenes) */
  fullScript: string;
  tone: string;
  totalDuration: number;
  scenePlan: {
    patternIndex: number;
    patternName: string;
    animatedCount: number;
    staticCount: number;
  };
  /** Final scenes with images, Akool configs, and Ken Burns directions */
  scenes: SceneWithImagesV3[];
  generatedAt: string;
}

// Test configuration
const TEST_CONFIG = {
  // Force a specific pattern (0-4) or null for random
  patternIndex: null as number | null,
  // Ad duration
  duration: 20,
};

async function testScriptGeneration() {
  console.log('='.repeat(60));
  console.log('Testing Script Generator v3');
  console.log('='.repeat(60));
  console.log('\nFeatures being tested:');
  console.log('  - Scene planner with animated/static balance');
  console.log('  - Hook always STATIC (USP focus)');
  console.log('  - Body: exactly 2 animated + 2 static');
  console.log('  - Image selector with main dish prioritization');
  console.log('  - TEMPLATE-based Akool prompts (NO LLM for POC demos)');
  console.log('  - Using curated poc-data (brand.json + products.json)');
  console.log('');

  // Build test cases from POC data
  const testCases = [
    {
      name: "joes-pizza",
      displayName: "Joe's Pizza",
      brand: joesBrand as {
        name: string;
        slug: string;
        usp: string;
        logo: { url: string };
        contact: { website: string; phone?: string };
        mainDishType: string;
      },
      products: joesProducts as POCProduct[],
      url: 'https://www.joespizza.com'
    },
    {
      name: 'sweetgreen',
      displayName: 'Sweetgreen',
      brand: sweetgreenBrand as {
        name: string;
        slug: string;
        usp: string;
        logo: { url: string };
        contact: { website: string; phone?: string };
        mainDishType: string;
      },
      products: sweetgreenProducts as POCProduct[],
      url: 'https://www.sweetgreen.com'
    },
    {
      name: 'doughnut-vault',
      displayName: 'Doughnut Vault',
      brand: doughnutVaultBrand as {
        name: string;
        slug: string;
        usp: string;
        logo: { url: string };
        contact: { website: string; phone?: string; hours?: string };
        mainDishType: string;
      },
      products: doughnutVaultProducts as POCProduct[],
      url: 'https://www.doughnutvault.com'
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Testing: ${testCase.displayName}`);
    console.log('─'.repeat(60));

    // ============ Step 1: POC Detection ============
    const pocBrand = detectPOCBrand(testCase.brand.name || testCase.displayName, testCase.url);
    console.log(`\n✓ POC Brand Detected: ${pocBrand?.brandName || 'NOT DETECTED'}`);
    if (pocBrand) {
      console.log(`  Tone: ${pocBrand.tone}`);
      console.log(`  Categories: ${Object.keys(pocBrand.menuCategories).join(', ')}`);
    }

    // Get main dish type from brand.json (preferred) or detect from name
    const mainDishType = (testCase.brand.mainDishType as 'pizza' | 'salad' | 'doughnut') || getMainDishType(testCase.displayName);
    console.log(`  Main dish type: ${mainDishType || 'unknown'}`);
    console.log(`  USP: "${testCase.brand.usp}"`);
    console.log(`  Products loaded: ${testCase.products.length}`);

    // ============ Step 2: Script Generation ============
    console.log('\n📝 Generating script...');
    const startTime = Date.now();

    const result = await generateScript({
      brandName: testCase.brand.name || testCase.displayName,
      tagline: testCase.brand.usp,
      duration: TEST_CONFIG.duration,
      url: testCase.url,
      contact: testCase.brand.contact,
    });

    const scriptTime = Date.now() - startTime;
    console.log(`  Time: ${scriptTime}ms`);

    if (!result.success || !result.script) {
      console.log(`  ❌ Error: ${result.error}`);
      continue;
    }

    console.log(`  ✓ Success! ${result.script.scenes.length} scenes`);

    // ============ Step 3: Scene Planning ============
    console.log('\n🎬 Planning scenes (animated vs static)...');
    console.log('  Per plan: Hook=STATIC, Body=2 animated + 2 static, CTA=STATIC');

    const scenesForPlanning = result.script.scenes.map((s) => ({
      id: s.id,
      visualCategory: s.visualCategory,
      visualType: s.visualType,
    }));

    const scenePlan: ScenePlan = planScenes(
      scenesForPlanning,
      pocBrand,
      TEST_CONFIG.patternIndex ?? undefined
    );

    const patternDesc = BODY_SCENE_PATTERNS[scenePlan.patternIndex];
    console.log(`  Pattern: ${scenePlan.patternIndex + 1}/5`);
    console.log(`    Body1: ${patternDesc.body1}, Body2: ${patternDesc.body2}, Body3: ${patternDesc.body3}, Body4: ${patternDesc.body4}`);
    console.log(`  Animated: ${scenePlan.animatedCount}, Static: ${scenePlan.staticCount}`);

    // ============ Step 4: Image Selection ============
    console.log('\n🖼️  Selecting images with main dish priority...');

    // Convert products.json to ScrapedImage format
    const scrapedImages = convertProductsToScrapedImages(testCase.products);

    let selectedImages: SelectedImageWithMode[] = [];
    if (pocBrand) {
      const categorizedImages = categorizeImages(
        scrapedImages,
        pocBrand.menuCategories
      );

      console.log(`  Categorized ${categorizedImages.all.length} images`);
      console.log(`  Food types found: ${Object.keys(categorizedImages.byFoodType).join(', ')}`);

      selectedImages = selectImagesForScenePlan(
        categorizedImages,
        scenePlan,
        mainDishType
      );

      console.log(`  Selected ${selectedImages.length} images`);
      console.log(`    Animated: ${selectedImages.filter(i => i.visualMode === 'animated').length}`);
      console.log(`    Static: ${selectedImages.filter(i => i.visualMode === 'static').length}`);
    }

    // ============ Step 5: POC Template Akool Prompt Generation ============
    console.log('\n🎯 Generating Akool prompts from PROVEN TEMPLATES (no LLM)...');

    const promptStartTime = Date.now();
    let imageIndex = 0;

    const scenesWithImages: SceneWithImagesV3[] = [];

    for (let sceneIdx = 0; sceneIdx < result.script.scenes.length; sceneIdx++) {
      const scene = result.script.scenes[sceneIdx];
      const plannedScene = scenePlan.scenes.find(s => s.sceneIndex === sceneIdx);
      const shouldAnimate = plannedScene?.visualMode === 'animated';
      const kenBurnsDirection = plannedScene?.kenBurnsDirection;
      const isMainDish = plannedScene?.isMainDish || false;

      // Get selected image (if not CTA)
      let selectedImage = null;
      if (scene.visualType !== 'logo_brand' && scene.id !== 'cta') {
        selectedImage = imageIndex < selectedImages.length
          ? selectedImages[imageIndex++]
          : null;
      }

      // Generate Akool prompt for animated scenes using TEMPLATES (no LLM for POC)
      let akoolConfig: AkoolAnimationConfig | null = null;
      if (shouldAnimate && selectedImage) {
        console.log(`  Template prompt for ${scene.id}: "${selectedImage.alt}" (${selectedImage.foodType})...`);
        akoolConfig = generatePOCTemplatePrompt(
          selectedImage.alt,
          {
            productDescription: selectedImage.productDescription,
            foodType: selectedImage.foodType,
            brandName: testCase.displayName,
            sceneIndex: sceneIdx,
          }
        );
      }

      // For HOOK scene: displayText should be the USP from brand.json
      const displayText = scene.id === 'hook'
        ? testCase.brand.usp  // Use actual USP for hook overlay
        : scene.displayText;

      scenesWithImages.push({
        sceneId: scene.id,
        sceneIndex: sceneIdx,
        voiceoverText: scene.voiceoverText,
        displayText,
        duration: scene.duration,
        visualMode: shouldAnimate ? 'animated' : 'static',
        kenBurnsDirection,
        selectedImage: selectedImage ? {
          url: selectedImage.url,
          alt: selectedImage.alt,
          category: selectedImage.category,
          foodType: selectedImage.foodType,
        } : null,
        akoolConfig,
      });
    }

    const promptTime = Date.now() - promptStartTime;
    console.log(`  Template prompt generation time: ${promptTime}ms`);

    // ============ Print Results ============
    console.log('\n📜 Results:');
    console.log(`  Full Script: "${result.script.fullScript}"`);

    console.log(`\n🎬 Scenes:`);
    for (const scene of scenesWithImages) {
      const modeIcon = scene.visualMode === 'animated' ? '🎥' : '📷';
      const mainDishTag = scene.isMainDish ? ' [MAIN DISH]' : '';

      console.log(`\n  ${modeIcon} [${scene.sceneId.toUpperCase()}] (${scene.duration}s) - ${scene.visualMode.toUpperCase()}${mainDishTag}`);
      console.log(`    Voiceover: "${scene.voiceoverText}"`);
      console.log(`    Display: "${scene.displayText}"`);

      if (scene.selectedImage) {
        console.log(`    Image: ${scene.selectedImage.alt}`);
        console.log(`    Food Type: ${scene.selectedImage.foodType || 'unknown'}`);
      }

      if (scene.akoolConfig) {
        console.log(`    Akool Prompt: "${scene.akoolConfig.prompt}"`);
      }

      if (scene.kenBurnsDirection) {
        console.log(`    Ken Burns: ${scene.kenBurnsDirection}`);
      }
    }

    // ============ Save Output ============
    const output: ScriptOutputV3 = {
      success: true,
      pocBrand: result.pocBrand || null,
      mainDishType: mainDishType || null,
      fullScript: result.script.fullScript,
      tone: result.script.tone,
      totalDuration: result.script.totalDuration,
      scenePlan: {
        patternIndex: scenePlan.patternIndex,
        patternName: `Pattern ${scenePlan.patternIndex + 1}`,
        animatedCount: scenePlan.animatedCount,
        staticCount: scenePlan.staticCount,
      },
      scenes: scenesWithImages,
      generatedAt: new Date().toISOString(),
    };

    const outputDir = path.join(__dirname, '..', 'poc-responses', testCase.name);
    const outputPath = path.join(outputDir, 'step2-script-v3.json');

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved to: ${outputPath}`);

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total time: ${totalTime}ms`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete!');
  console.log('Results saved to: test/poc-responses/*/step2-script-v3.json');
  console.log('='.repeat(60));
}

// Run tests
testScriptGeneration().catch(console.error);
