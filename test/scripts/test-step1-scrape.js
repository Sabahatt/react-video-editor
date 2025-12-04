/**
 * Test Step 1: Web Scraping
 *
 * Run: node test/scripts/test-step1-scrape.js [restaurant]
 *
 * Examples:
 *   node test/scripts/test-step1-scrape.js joes-pizza
 *   node test/scripts/test-step1-scrape.js doughnut-vault
 *   node test/scripts/test-step1-scrape.js sweetgreen
 *   node test/scripts/test-step1-scrape.js all
 *
 * Make sure dev server is running: pnpm dev
 */

const fs = require('fs');
const path = require('path');

const POC_RESTAURANTS = {
  'joes-pizza': {
    name: "Joe's Pizza",
    url: 'https://www.joespizza.com/menu-joes-pizza-santa-monica-venice',
  },
  'doughnut-vault': {
    name: 'The Doughnut Vault',
    url: 'https://www.doughnutvault.com/',
  },
  'sweetgreen': {
    name: 'Sweetgreen',
    url: 'https://www.sweetgreen.com/',
  },
};

async function scrapeRestaurant(key, restaurant) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SCRAPING: ${restaurant.name}`);
  console.log(`URL: ${restaurant.url}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: restaurant.url }),
    });

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`\nSUCCESS (${elapsed}s)`);
      console.log(`  Brand: ${result.data?.brand?.name || 'N/A'}`);
      console.log(`  Cuisine: ${result.data?.brand?.cuisine || 'N/A'}`);
      console.log(`  Logo: ${result.data?.logo ? 'Yes' : 'No'}`);
      console.log(`  Images: ${result.data?.images?.length || 0}`);
      console.log(`  Colors: ${result.data?.colors ? Object.keys(result.data.colors).length + ' extracted' : 'No'}`);

      // Save response
      const outputPath = path.join(__dirname, `../poc-responses/${key}/step1-scrape.json`);
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

  console.log('STEP 1: WEB SCRAPING TEST');
  console.log('Make sure dev server is running: pnpm dev\n');

  if (arg === 'all') {
    for (const [key, restaurant] of Object.entries(POC_RESTAURANTS)) {
      await scrapeRestaurant(key, restaurant);
    }
  } else if (POC_RESTAURANTS[arg]) {
    await scrapeRestaurant(arg, POC_RESTAURANTS[arg]);
  } else {
    console.log(`Unknown restaurant: ${arg}`);
    console.log(`Available: ${Object.keys(POC_RESTAURANTS).join(', ')}, all`);
  }
}

main();
