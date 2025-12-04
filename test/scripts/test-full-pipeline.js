/**
 * Test Full Pipeline: Steps 1-4
 *
 * Run: node test/scripts/test-full-pipeline.js [restaurant]
 *
 * Examples:
 *   node test/scripts/test-full-pipeline.js joes-pizza
 *   node test/scripts/test-full-pipeline.js doughnut-vault
 *   node test/scripts/test-full-pipeline.js sweetgreen
 *   node test/scripts/test-full-pipeline.js all
 *
 * This runs all steps sequentially and saves all response files.
 * Make sure dev server is running: pnpm dev
 */

const fs = require('fs');
const path = require('path');

const POC_RESTAURANTS = {
  'joes-pizza': {
    name: "Joe's Pizza",
    url: 'https://www.joespizza.com/menu-joes-pizza-santa-monica-venice',
    tone: 'playful',
  },
  'doughnut-vault': {
    name: 'The Doughnut Vault',
    url: 'https://www.doughnutvault.com/',
    tone: 'friendly',
  },
  'sweetgreen': {
    name: 'Sweetgreen',
    url: 'https://www.sweetgreen.com/',
    tone: 'professional',
  },
};

function saveResult(key, step, filename, result) {
  const outputPath = path.join(__dirname, `../poc-responses/${key}/${filename}`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`  Saved: ${filename}`);
}

async function runPipeline(key, restaurant) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FULL PIPELINE: ${restaurant.name}`);
  console.log('='.repeat(70));

  const results = {};
  const timings = {};

  // ============ STEP 1: Scrape ============
  console.log('\n[STEP 1] Web Scraping...');
  let startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: restaurant.url }),
    });
    results.scrape = await response.json();
    timings.scrape = ((Date.now() - startTime) / 1000).toFixed(1);

    if (results.scrape.success) {
      console.log(`  ✓ Scraped in ${timings.scrape}s`);
      console.log(`    - Brand: ${results.scrape.data?.brand?.name}`);
      console.log(`    - Images: ${results.scrape.data?.images?.length || 0}`);
      saveResult(key, 1, 'step1-scrape.json', results.scrape);
    } else {
      console.log(`  ✗ Failed: ${results.scrape.error}`);
      return null;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return null;
  }

  // ============ STEP 2: Generate Script ============
  console.log('\n[STEP 2] Script Generation...');
  startTime = Date.now();

  try {
    const scrapeData = results.scrape.data;
    const response = await fetch('http://localhost:3000/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: scrapeData.brand?.name || restaurant.name,
        tagline: scrapeData.brand?.tagline,
        description: scrapeData.brand?.description,
        cuisine: scrapeData.brand?.cuisine,
        tone: restaurant.tone,
        duration: 10,
        url: scrapeData.sourceUrl,
      }),
    });
    results.script = await response.json();
    timings.script = ((Date.now() - startTime) / 1000).toFixed(1);

    if (results.script.success) {
      console.log(`  ✓ Generated in ${timings.script}s`);
      console.log(`    - Scenes: ${results.script.script?.scenes?.length || 0}`);
      const visualTypes = results.script.script?.scenes?.map(s => s.visualType) || [];
      console.log(`    - Visual types: ${[...new Set(visualTypes)].join(', ')}`);
      saveResult(key, 2, 'step2-script.json', results.script);
    } else {
      console.log(`  ✗ Failed: ${results.script.error}`);
      return null;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return null;
  }

  // ============ STEP 3: Match Visuals ============
  console.log('\n[STEP 3] Visual Matching (CLIP)...');
  startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/match-visuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: results.script.script,
        scrapedData: results.scrape.data,
      }),
    });
    results.match = await response.json();
    timings.match = ((Date.now() - startTime) / 1000).toFixed(1);

    if (results.match.success) {
      console.log(`  ✓ Matched in ${timings.match}s`);
      const resolved = results.match.script?.scenes?.filter(s => s.visual.url).length || 0;
      const total = results.match.script?.scenes?.length || 0;
      console.log(`    - Resolved: ${resolved}/${total} scenes`);
      saveResult(key, 3, 'step3-match-visuals.json', results.match);
    } else {
      console.log(`  ✗ Failed: ${results.match.error}`);
      return null;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return null;
  }

  // ============ STEP 4: Resolve Stock Videos ============
  console.log('\n[STEP 4] Stock Video Resolution (Pexels)...');
  startTime = Date.now();

  const stockScenes = results.match.script?.scenes?.filter(
    s => s.visual.type === 'stock_video' && !s.visual.url
  ) || [];

  if (stockScenes.length === 0) {
    console.log('  - No stock videos to resolve');
    results.stockVideos = results.match;
    timings.stockVideos = '0.0';
    saveResult(key, 4, 'step4-stock-videos.json', results.stockVideos);
  } else {
    try {
      const response = await fetch('http://localhost:3000/api/resolve-stock-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: results.match.script,
          brand: {
            ...results.match.brand,
            cuisine: results.scrape.data?.brand?.cuisine,
          },
        }),
      });
      results.stockVideos = await response.json();
      timings.stockVideos = ((Date.now() - startTime) / 1000).toFixed(1);

      if (results.stockVideos.success) {
        console.log(`  ✓ Resolved in ${timings.stockVideos}s`);
        const stockResolved = Object.keys(results.stockVideos.stockVideos || {}).length;
        console.log(`    - Stock videos: ${stockResolved}/${stockScenes.length}`);
        saveResult(key, 4, 'step4-stock-videos.json', results.stockVideos);
      } else {
        console.log(`  ✗ Failed: ${results.stockVideos.error}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  // ============ SUMMARY ============
  console.log('\n' + '-'.repeat(70));
  console.log('PIPELINE SUMMARY');
  console.log('-'.repeat(70));

  const totalTime = Object.values(timings).reduce((a, b) => parseFloat(a) + parseFloat(b), 0).toFixed(1);
  console.log(`Total time: ${totalTime}s`);
  console.log(`  Step 1 (Scrape): ${timings.scrape}s`);
  console.log(`  Step 2 (Script): ${timings.script}s`);
  console.log(`  Step 3 (Match):  ${timings.match}s`);
  console.log(`  Step 4 (Stock):  ${timings.stockVideos}s`);

  // Final scene status
  const finalScenes = results.stockVideos?.script?.scenes || [];
  console.log(`\nFinal Scenes:`);
  finalScenes.forEach((scene, i) => {
    const status = scene.visual.url ? '✓' : '✗';
    console.log(`  ${status} ${scene.id} (${scene.visual.type})`);
  });

  const allResolved = finalScenes.every(s => s.visual.url);
  console.log(`\nResult: ${allResolved ? '✓ ALL VISUALS RESOLVED' : '⚠ SOME VISUALS MISSING'}`);

  return results;
}

async function main() {
  const arg = process.argv[2] || 'all';

  console.log('FULL PIPELINE TEST (Steps 1-4)');
  console.log('Make sure dev server is running: pnpm dev');
  console.log('Requires: PEXELS_API_KEY in .env.local for stock videos\n');

  if (arg === 'all') {
    for (const [key, restaurant] of Object.entries(POC_RESTAURANTS)) {
      await runPipeline(key, restaurant);
    }
  } else if (POC_RESTAURANTS[arg]) {
    await runPipeline(arg, POC_RESTAURANTS[arg]);
  } else {
    console.log(`Unknown restaurant: ${arg}`);
    console.log(`Available: ${Object.keys(POC_RESTAURANTS).join(', ')}, all`);
  }
}

main();
