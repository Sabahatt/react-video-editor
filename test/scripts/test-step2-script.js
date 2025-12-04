/**
 * Test Step 2: Script Generation
 *
 * Run: node test/scripts/test-step2-script.js [restaurant]
 *
 * Examples:
 *   node test/scripts/test-step2-script.js joes-pizza
 *   node test/scripts/test-step2-script.js doughnut-vault
 *   node test/scripts/test-step2-script.js sweetgreen
 *   node test/scripts/test-step2-script.js all
 *
 * Requires: Step 1 response files (step1-scrape.json)
 * Make sure dev server is running: pnpm dev
 */

const fs = require('fs');
const path = require('path');

const POC_RESTAURANTS = {
  'joes-pizza': {
    name: "Joe's Pizza",
    tone: 'playful',
  },
  'doughnut-vault': {
    name: 'The Doughnut Vault',
    tone: 'friendly',
  },
  'sweetgreen': {
    name: 'Sweetgreen',
    tone: 'professional',
  },
};

function loadScrapeData(key) {
  const filePath = path.join(__dirname, `../poc-responses/${key}/step1-scrape.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function generateScript(key, restaurant) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENERATING SCRIPT: ${restaurant.name}`);
  console.log('='.repeat(60));

  // Load scrape data
  const scrapeResult = loadScrapeData(key);
  if (!scrapeResult || !scrapeResult.success) {
    console.log('ERROR: No scrape data found. Run step 1 first:');
    console.log(`  node test/scripts/test-step1-scrape.js ${key}`);
    return null;
  }

  const scrapeData = scrapeResult.data;
  console.log(`\nUsing scraped data:`);
  console.log(`  Brand: ${scrapeData.brand?.name || restaurant.name}`);
  console.log(`  Cuisine: ${scrapeData.brand?.cuisine || 'unknown'}`);

  const requestBody = {
    brandName: scrapeData.brand?.name || restaurant.name,
    tagline: scrapeData.brand?.tagline,
    description: scrapeData.brand?.description,
    cuisine: scrapeData.brand?.cuisine,
    tone: restaurant.tone,
    duration: 10,
    url: scrapeData.sourceUrl,
  };

  console.log(`\nRequest:`);
  console.log(`  Tone: ${requestBody.tone}`);
  console.log(`  Duration: ${requestBody.duration}s`);

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`\nSUCCESS (${elapsed}s)`);
      console.log(`\nGenerated Script:`);
      console.log(`  Full: "${result.script.fullScript}"`);
      console.log(`\nScenes:`);
      result.script.scenes.forEach((scene, i) => {
        console.log(`  ${i + 1}. ${scene.id} (${scene.visualType})`);
        console.log(`     VO: "${scene.voiceoverText}"`);
        console.log(`     Display: "${scene.displayText}"`);
        console.log(`     Visual: "${scene.visualPrompt}"`);
      });

      // Save response
      const outputPath = path.join(__dirname, `../poc-responses/${key}/step2-script.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\nSaved to: ${outputPath}`);
    } else {
      console.log(`\nFAILED: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    console.log('Make sure the dev server is running: pnpm dev');
    return null;
  }
}

async function main() {
  const arg = process.argv[2] || 'all';

  console.log('STEP 2: SCRIPT GENERATION TEST');
  console.log('Make sure dev server is running: pnpm dev\n');

  if (arg === 'all') {
    for (const [key, restaurant] of Object.entries(POC_RESTAURANTS)) {
      await generateScript(key, restaurant);
    }
  } else if (POC_RESTAURANTS[arg]) {
    await generateScript(arg, POC_RESTAURANTS[arg]);
  } else {
    console.log(`Unknown restaurant: ${arg}`);
    console.log(`Available: ${Object.keys(POC_RESTAURANTS).join(', ')}, all`);
  }
}

main();
