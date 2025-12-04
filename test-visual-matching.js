/**
 * Test script for Visual Matching API (Step 3)
 *
 * Run: node test-visual-matching.js
 *
 * Tests the visual matching API using:
 * - Joe's Pizza script (from poc-res-objs/script-gen/)
 * - Joe's Pizza scraped data (from poc-res-objs/web-scrape/)
 *
 * Make sure dev server is running: pnpm dev
 *
 * NOTE: First run will download CLIP model (~350MB) - takes 1-3 minutes
 */

const fs = require('fs');
const path = require('path');

// Load POC data
const scriptData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'poc-res-objs/script-gen/joes-pizza-script-res.json'),
    'utf-8'
  )
);

const scrapeData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'poc-res-objs/web-scrape/joes-pizza-scrape-res.json'),
    'utf-8'
  )
);

async function testVisualMatching() {
  console.log('='.repeat(60));
  console.log('VISUAL MATCHING API TEST - Joe\'s Pizza');
  console.log('='.repeat(60));
  console.log('\nMake sure the dev server is running: pnpm dev\n');

  // New request format: script + scrapedData
  const requestBody = {
    script: scriptData.script,
    scrapedData: scrapeData.data,
  };

  console.log('Input Summary:');
  console.log(`  - ${requestBody.script.scenes.length} scenes to match`);
  console.log(`  - ${requestBody.scrapedData.images.length} scraped images available`);
  console.log(`  - Logo: ${requestBody.scrapedData.logo ? 'Yes' : 'No'}`);
  console.log('\nScenes to match:');
  requestBody.script.scenes.forEach((scene, i) => {
    console.log(`  ${i + 1}. ${scene.id} (${scene.visualType}): "${scene.visualPrompt}"`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log('Calling /api/match-visuals...');
  console.log('(First run downloads CLIP model ~350MB - please wait)');
  console.log('-'.repeat(60) + '\n');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/match-visuals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`SUCCESS! (${elapsed}s)\n`);

      console.log('ENRICHED SCRIPT:');
      console.log('='.repeat(60));

      result.script.scenes.forEach((scene, i) => {
        console.log(`\n${i + 1}. Scene: ${scene.id.toUpperCase()} (${scene.duration}s)`);
        console.log(`   Voiceover: "${scene.voiceoverText}"`);
        console.log(`   Display: "${scene.displayText}"`);
        console.log(`   Visual Type: ${scene.visual.type}`);

        if (scene.visual.url) {
          console.log(`   Visual URL: ${scene.visual.url.substring(0, 70)}...`);
          if (scene.visual.alt) {
            console.log(`   Visual Alt: ${scene.visual.alt}`);
          }
        } else if (scene.visual.prompt) {
          console.log(`   Visual Prompt: "${scene.visual.prompt}" (needs resolution)`);
        } else {
          console.log(`   Visual: NOT RESOLVED`);
        }

        if (scene.contactOverlay) {
          console.log(`   Contact: ${JSON.stringify(scene.contactOverlay)}`);
        }
      });

      // Brand info
      console.log('\n' + '='.repeat(60));
      console.log('BRAND INFO:');
      console.log('='.repeat(60));
      console.log(`  Name: ${result.brand?.name || 'N/A'}`);
      console.log(`  Logo: ${result.brand?.logo ? 'Yes' : 'No'}`);
      console.log(`  Colors: ${result.brand?.colors ? Object.keys(result.brand.colors).join(', ') : 'N/A'}`);

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60));

      const resolved = result.script.scenes.filter(s => s.visual.url).length;
      const needsResolution = result.script.scenes.filter(s => !s.visual.url && s.visual.prompt).length;
      const failed = result.script.scenes.filter(s => !s.visual.url && !s.visual.prompt).length;

      console.log(`  Resolved visuals: ${resolved}`);
      console.log(`  Needs stock video: ${needsResolution}`);
      if (failed > 0) {
        console.log(`  Failed to resolve: ${failed}`);
      }

      // Save result for reference
      const outputPath = path.join(__dirname, 'poc-res-objs/visual-match/joes-pizza-visual-match-res.json');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\nResult saved to: ${outputPath}`);

    } else {
      console.log('FAILED:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure the dev server is running: pnpm dev');
  }
}

// Run test
testVisualMatching();
