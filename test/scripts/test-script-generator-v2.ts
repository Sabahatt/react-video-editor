/**
 * Test Script Generator v2
 *
 * Run with: npx ts-node test/scripts/test-script-generator-v2.ts
 * Or: npx tsx test/scripts/test-script-generator-v2.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { generateScript, detectPOCBrand, selectImagesForAd } from '../../src/lib/script-generator';
import { generateAkoolPrompt } from '../../src/lib/script-generator/akool-prompts';
import type { ScrapedImage } from '../../src/lib/scraper/types';
import type { AdScene, GeneratedScript, AkoolAnimationConfig } from '../../src/lib/script-generator/types';

// Load test scraped data
import joesPizzaScrape from '../poc-responses/joes-pizza/step1-scrape.json';
import sweetgreenScrape from '../poc-responses/sweetgreen/step1-scrape.json';
import doughnutVaultScrape from '../poc-responses/doughnut-vault/step1-scrape.json';

interface ScriptWithImages {
  success: boolean;
  pocBrand: string | null;
  script: GeneratedScript;
  scenesWithImages: Array<{
    sceneId: string;
    voiceoverText: string;
    displayText: string;
    duration: number;
    visualType: string;
    visualCategory: string | null;
    selectedImage: {
      url: string;
      alt: string;
      category: string;
    } | null;
    akoolConfig: {
      prompt: string;
      negativePrompt: string;
      videoLength: number;
      resolution: string;
    } | null;
  }>;
  generatedAt: string;
}

async function testScriptGeneration() {
  console.log('='.repeat(60));
  console.log('Testing Script Generator v2');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: "joes-pizza",
      displayName: "Joe's Pizza",
      data: joesPizzaScrape.data,
      url: 'https://www.joespizza.com'
    },
    {
      name: 'sweetgreen',
      displayName: 'Sweetgreen',
      data: sweetgreenScrape.data,
      url: 'https://www.sweetgreen.com'
    },
    {
      name: 'doughnut-vault',
      displayName: 'Doughnut Vault',
      data: doughnutVaultScrape.data,
      url: 'https://www.doughnutvault.com'
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Testing: ${testCase.displayName}`);
    console.log('─'.repeat(60));

    // Test POC detection
    const pocBrand = detectPOCBrand(testCase.data.brand.name, testCase.url);
    console.log(`\n✓ POC Brand Detected: ${pocBrand?.brandName || 'NOT DETECTED'}`);
    if (pocBrand) {
      console.log(`  Tone: ${pocBrand.tone}`);
      console.log(`  Categories: ${Object.keys(pocBrand.menuCategories).join(', ')}`);
    }

    // Test script generation
    console.log('\n📝 Generating script (20s ad)...');
    const startTime = Date.now();

    const result = await generateScript({
      brandName: testCase.data.brand.name,
      tagline: testCase.data.brand.tagline,
      description: testCase.data.brand.description,
      cuisine: testCase.data.brand.cuisine,
      duration: 20,
      url: testCase.url,
      contact: testCase.data.contact,
    });

    const elapsed = Date.now() - startTime;
    console.log(`  Time: ${elapsed}ms`);

    if (!result.success || !result.script) {
      console.log(`  ❌ Error: ${result.error}`);
      continue;
    }

    console.log(`  ✓ Success! POC Brand: ${result.pocBrand || 'none'}`);
    console.log(`\n📜 Generated Script:`);
    console.log(`  Full Script: "${result.script.fullScript}"`);
    console.log(`  Tone: ${result.script.tone}`);
    console.log(`  Duration: ${result.script.totalDuration}s`);

    // Select images for scenes
    let selectedImages: Array<{ url: string; alt: string; category: string }> = [];
    if (pocBrand && testCase.data.images) {
      const requestedCategories = result.script.scenes
        .filter(s => s.visualType === 'animated_image')
        .map(s => s.visualCategory);

      selectedImages = selectImagesForAd(
        testCase.data.images as ScrapedImage[],
        pocBrand.menuCategories,
        requestedCategories,
        requestedCategories.length
      );
    }

    // Build scenes with images and generate context-aware Akool prompts
    let imageIndex = 0;
    const scenesWithImages = result.script.scenes.map((scene: AdScene) => {
      const selectedImage = scene.visualType === 'animated_image' && selectedImages[imageIndex]
        ? selectedImages[imageIndex++]
        : null;

      // Generate Akool prompt based on ACTUAL image content (not generic prompts)
      let akoolConfig: AkoolAnimationConfig | null = null;
      if (selectedImage && scene.visualType === 'animated_image') {
        // Use the smart prompt generator that analyzes the image alt text
        akoolConfig = generateAkoolPrompt(
          selectedImage.alt || '',
          selectedImage.category,
          scene.id
        );
      }

      return {
        sceneId: scene.id,
        voiceoverText: scene.voiceoverText,
        displayText: scene.displayText,
        duration: scene.duration,
        visualType: scene.visualType,
        visualCategory: scene.visualCategory || null,
        selectedImage,
        akoolConfig,
      };
    });

    // Print scenes
    console.log(`\n🎬 Scenes with Selected Images:`);
    for (const scene of scenesWithImages) {
      console.log(`\n  [${scene.sceneId.toUpperCase()}] (${scene.duration}s)`);
      console.log(`    Voiceover: "${scene.voiceoverText}"`);
      console.log(`    Display: "${scene.displayText}"`);
      console.log(`    Visual: ${scene.visualType} → ${scene.visualCategory || 'n/a'}`);
      if (scene.selectedImage) {
        console.log(`    Image: ${scene.selectedImage.alt || 'no alt'}`);
        console.log(`    Image URL: ${scene.selectedImage.url}`);
      }
      if (scene.akoolConfig) {
        console.log(`    Akool Prompt: "${scene.akoolConfig.prompt}"`);
        console.log(`    Akool Negative: "${scene.akoolConfig.negativePrompt}"`);
      }
    }

    // Build output object
    const output: ScriptWithImages = {
      success: true,
      pocBrand: result.pocBrand || null,
      script: result.script,
      scenesWithImages,
      generatedAt: new Date().toISOString(),
    };

    // Save to file
    const outputDir = path.join(__dirname, '..', 'poc-responses', testCase.name);
    const outputPath = path.join(outputDir, 'step2-script-v2.json');

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved to: ${outputPath}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete! Results saved to poc-responses/*/step2-script-v2.json');
  console.log('='.repeat(60));
}

// Run tests
testScriptGeneration().catch(console.error);
