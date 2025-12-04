/**
 * Test Step 3: Visual Matching (CLIP)
 *
 * Run: node test/scripts/test-step3-match-visuals.js [restaurant]
 *
 * Examples:
 *   node test/scripts/test-step3-match-visuals.js joes-pizza
 *   node test/scripts/test-step3-match-visuals.js doughnut-vault
 *   node test/scripts/test-step3-match-visuals.js sweetgreen
 *   node test/scripts/test-step3-match-visuals.js all
 *
 * Requires: Step 1 & 2 response files
 * Make sure dev server is running: pnpm dev
 *
 * NOTE: First run downloads CLIP model (~350MB) - takes 1-3 minutes
 */

const fs = require('fs');
const path = require('path');

const POC_RESTAURANTS = ['joes-pizza', 'doughnut-vault', 'sweetgreen'];

function loadStepData(key, step) {
  const filePath = path.join(__dirname, `../poc-responses/${key}/step${step}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function matchVisuals(key) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`MATCHING VISUALS: ${key}`);
  console.log('='.repeat(60));

  // Load required data
  const scrapeResult = loadStepData(key, '1-scrape');
  const scriptResult = loadStepData(key, '2-script');

  if (!scrapeResult?.success) {
    console.log('ERROR: No scrape data. Run step 1 first.');
    return null;
  }
  if (!scriptResult?.success) {
    console.log('ERROR: No script data. Run step 2 first.');
    return null;
  }

  const requestBody = {
    script: scriptResult.script,
    scrapedData: scrapeResult.data,
  };

  console.log(`\nInput:`);
  console.log(`  Scenes: ${requestBody.script.scenes.length}`);
  console.log(`  Available images: ${requestBody.scrapedData.images?.length || 0}`);
  console.log(`  Logo: ${requestBody.scrapedData.logo ? 'Yes' : 'No'}`);

  console.log(`\nScenes to match:`);
  requestBody.script.scenes.forEach((scene, i) => {
    console.log(`  ${i + 1}. ${scene.id} (${scene.visualType}): "${scene.visualPrompt}"`);
  });

  console.log('\nCalling /api/match-visuals...');
  console.log('(First run downloads CLIP model ~350MB - please wait)\n');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/match-visuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`SUCCESS (${elapsed}s)\n`);

      console.log('Matched Scenes:');
      result.script.scenes.forEach((scene, i) => {
        const status = scene.visual.url ? '✓ RESOLVED' : (scene.visual.prompt ? '→ NEEDS STOCK' : '✗ FAILED');
        console.log(`  ${i + 1}. ${scene.id} (${scene.visual.type}): ${status}`);
        if (scene.visual.url) {
          console.log(`     URL: ${scene.visual.url.substring(0, 60)}...`);
        } else if (scene.visual.prompt) {
          console.log(`     Prompt: "${scene.visual.prompt}"`);
        }
      });

      // Save response
      const outputPath = path.join(__dirname, `../poc-responses/${key}/step3-match-visuals.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\nSaved to: ${outputPath}`);
    } else {
      console.log(`FAILED: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    console.log('Make sure the dev server is running: pnpm dev');
    return null;
  }
}

async function main() {
  const arg = process.argv[2] || 'all';

  console.log('STEP 3: VISUAL MATCHING TEST (CLIP)');
  console.log('Make sure dev server is running: pnpm dev');

  if (arg === 'all') {
    for (const key of POC_RESTAURANTS) {
      await matchVisuals(key);
    }
  } else if (POC_RESTAURANTS.includes(arg)) {
    await matchVisuals(arg);
  } else {
    console.log(`Unknown restaurant: ${arg}`);
    console.log(`Available: ${POC_RESTAURANTS.join(', ')}, all`);
  }
}

main();
