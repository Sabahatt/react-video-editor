/**
 * Test script for the script generator
 * Run: node test-script-generator.js
 *
 * Tests the three POC demo restaurants:
 * - The Doughnut Vault
 * - Joe's Pizza
 * - Sweetgreen
 *
 * Requires GROQ_API_KEY environment variable to be set
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// POC Restaurants - tone is NOT passed so the API auto-uses suggestedTone
const POC_RESTAURANTS = [
  {
    brandName: "The Doughnut Vault",
    url: "https://www.doughnutvault.com/the-classics",
    // tone will auto-resolve to "friendly" from POC config
  },
  {
    brandName: "Joe's Pizza",
    url: "https://www.joespizza.com/menu-joes-pizza-santa-monica-venice",
    // tone will auto-resolve to "playful" from POC config
  },
  {
    brandName: "Sweetgreen",
    url: "https://www.sweetgreen.com/menu",
    // tone will auto-resolve to "professional" from POC config
  }
];

async function testSingleRestaurant(restaurant) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${restaurant.brandName}`);
  console.log(`URL: ${restaurant.url}`);
  console.log(`Tone: (auto from POC config)`);
  console.log('='.repeat(60));

  try {
    const response = await fetch('http://localhost:3000/api/generate-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...restaurant,
        duration: 10
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('\nSUCCESS!');
      if (result.pocRestaurant) {
        console.log(`POC Restaurant Detected: ${result.pocRestaurant.name}`);
      }
      console.log(`Tone Used: ${result.script.tone}`);
      console.log('\nGenerated Script:');
      console.log(`Full Script: "${result.script.fullScript}"`);
      console.log('\nScenes:');
      result.script.scenes.forEach((scene, i) => {
        console.log(`\n  ${i + 1}. ${scene.id.toUpperCase()} (${scene.duration}s)`);
        console.log(`     Voiceover: "${scene.voiceoverText}"`);
        console.log(`     Display: "${scene.displayText}"`);
        console.log(`     Visual Type: ${scene.visualType}`);
        console.log(`     Visual Prompt: "${scene.visualPrompt}"`);
        if (scene.contactOverlay) {
          console.log(`     Contact: ${JSON.stringify(scene.contactOverlay)}`);
        }
      });

      // Summary of visual types
      const visualCounts = result.script.scenes.reduce((acc, s) => {
        acc[s.visualType] = (acc[s.visualType] || 0) + 1;
        return acc;
      }, {});
      console.log(`\nVisual Type Distribution: ${JSON.stringify(visualCounts)}`);
      return true;
    } else {
      console.log('FAILED:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

async function testAllPOCRestaurants() {
  console.log('Testing Script Generator - POC Restaurants');
  console.log('Make sure the dev server is running: pnpm dev\n');

  let passed = 0;
  let failed = 0;

  for (const restaurant of POC_RESTAURANTS) {
    const success = await testSingleRestaurant(restaurant);
    if (success) passed++;
    else failed++;

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
}

// Run tests
testAllPOCRestaurants().catch(console.error);
