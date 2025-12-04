/**
 * Test Step 4: Stock Video Resolution (Pexels)
 *
 * Run: node test/scripts/test-step4-stock-videos.js [restaurant]
 *
 * Examples:
 *   node test/scripts/test-step4-stock-videos.js joes-pizza
 *   node test/scripts/test-step4-stock-videos.js doughnut-vault
 *   node test/scripts/test-step4-stock-videos.js sweetgreen
 *   node test/scripts/test-step4-stock-videos.js all
 *
 * Requires: Step 3 response file (step3-match-visuals.json)
 * Make sure dev server is running: pnpm dev
 * Requires: PEXELS_API_KEY in .env.local
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

async function resolveStockVideos(key) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESOLVING STOCK VIDEOS: ${key}`);
  console.log('='.repeat(60));

  // Load visual matching result
  const matchResult = loadStepData(key, '3-match-visuals');
  const scrapeResult = loadStepData(key, '1-scrape');

  if (!matchResult?.success) {
    console.log('ERROR: No visual matching data. Run step 3 first.');
    return null;
  }

  // Count stock_video scenes that need resolution
  const stockScenes = matchResult.script.scenes.filter(
    s => s.visual.type === 'stock_video' && !s.visual.url
  );

  if (stockScenes.length === 0) {
    console.log('\nNo stock_video scenes to resolve.');
    console.log('Copying step 3 result as step 4 result...');

    const outputPath = path.join(__dirname, `../poc-responses/${key}/step4-stock-videos.json`);
    fs.writeFileSync(outputPath, JSON.stringify(matchResult, null, 2));
    console.log(`Saved to: ${outputPath}`);
    return matchResult;
  }

  console.log(`\nStock scenes to resolve: ${stockScenes.length}`);
  stockScenes.forEach((scene, i) => {
    console.log(`  ${i + 1}. ${scene.id}: "${scene.visual.prompt}"`);
  });

  const requestBody = {
    script: matchResult.script,
    brand: {
      ...matchResult.brand,
      cuisine: scrapeResult?.data?.brand?.cuisine,
    },
  };

  console.log('\nCalling /api/resolve-stock-videos...\n');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/resolve-stock-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`SUCCESS (${elapsed}s)\n`);

      console.log('Final Enriched Script:');
      result.script.scenes.forEach((scene, i) => {
        const status = scene.visual.url ? '✓' : '✗';
        console.log(`  ${i + 1}. ${scene.id} (${scene.visual.type}): ${status}`);
        if (scene.visual.url) {
          console.log(`     URL: ${scene.visual.url.substring(0, 60)}...`);
        }
      });

      // Show stock videos fetched
      if (result.stockVideos && Object.keys(result.stockVideos).length > 0) {
        console.log('\nStock Videos Fetched:');
        for (const [sceneId, video] of Object.entries(result.stockVideos)) {
          console.log(`  ${sceneId}: ${video.width}x${video.height}, ${video.duration}s`);
        }
      }

      // Summary
      const resolved = result.script.scenes.filter(s => s.visual.url).length;
      const total = result.script.scenes.length;
      console.log(`\nSummary: ${resolved}/${total} scenes resolved`);

      // Save response
      const outputPath = path.join(__dirname, `../poc-responses/${key}/step4-stock-videos.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\nSaved to: ${outputPath}`);
    } else {
      console.log(`FAILED: ${result.error}`);
      if (result.error?.includes('PEXELS')) {
        console.log('\nMake sure PEXELS_API_KEY is set in .env.local');
      }
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

  console.log('STEP 4: STOCK VIDEO RESOLUTION TEST (Pexels)');
  console.log('Make sure dev server is running: pnpm dev');
  console.log('Requires: PEXELS_API_KEY in .env.local');

  if (arg === 'all') {
    for (const key of POC_RESTAURANTS) {
      await resolveStockVideos(key);
    }
  } else if (POC_RESTAURANTS.includes(arg)) {
    await resolveStockVideos(arg);
  } else {
    console.log(`Unknown restaurant: ${arg}`);
    console.log(`Available: ${POC_RESTAURANTS.join(', ')}, all`);
  }
}

main();
