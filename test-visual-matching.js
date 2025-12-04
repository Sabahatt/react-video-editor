/**
 * Test script for Visual Matching API (Step 3)
 *
 * Run: node test-visual-matching.js
 *
 * Tests the visual matching API using:
 * - Joe's Pizza scraped images (from poc-res-objs/web-scrape/)
 * - Custom test scenes with CONCRETE product names (matching alt text)
 *
 * Make sure dev server is running: pnpm dev
 *
 * NOTE: First run will download CLIP model (~350MB) - takes 1-3 minutes
 */

const fs = require('fs');
const path = require('path');

// Load scraped data
const scrapeData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'poc-res-objs/web-scrape/joes-pizza-scrape-res.json'),
    'utf-8'
  )
);

const scriptData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'poc-res-objs/script-gen/joes-pizza-script-res.json'),
    'utf-8'
  )
);

async function testVisualMatching() {
  console.log('='.repeat(60));
  console.log('VISUAL MATCHING API TEST - Joe\'s Pizza');
  console.log('='.repeat(60));
  console.log('\nMake sure the dev server is running: pnpm dev\n');

  // Prepare request body with CONCRETE product names
  const requestBody = {
    scenes: scriptData.script.scenes,
    images: scrapeData.data.images,
    logo: scrapeData.data.logo,
  };

  console.log('Input Summary:');
  console.log(`  - ${requestBody.scenes.length} scenes to match`);
  console.log(`  - ${requestBody.images.length} scraped images available`);
  console.log(`  - Logo: ${requestBody.logo ? 'Yes' : 'No'}`);
  console.log('\nScenes to match:');
  requestBody.scenes.forEach((scene, i) => {
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
      console.log(`SUCCESS! (${elapsed}s total, ${result.timing?.clipMatching}ms CLIP matching)\n`);

      console.log('Matched Visuals:');
      console.log('='.repeat(60));

      result.matches.forEach((match, i) => {
        console.log(`\n${i + 1}. Scene: ${match.sceneId.toUpperCase()}`);
        console.log(`   Visual Type: ${match.visualType}`);
        console.log(`   Prompt: "${match.visualPrompt}"`);

        if (match.matchedImage) {
          console.log(`   MATCHED IMAGE:`);
          console.log(`     URL: ${match.matchedImage.url.substring(0, 80)}...`);
          console.log(`     Alt: ${match.matchedImage.alt || 'N/A'}`);
          console.log(`     Dimensions: ${match.matchedImage.width || '?'}x${match.matchedImage.height || '?'}`);
          console.log(`     Scores: CLIP=${(match.matchedImage.score * 100).toFixed(1)}% | Quality=${(match.matchedImage.qualityScore * 100).toFixed(1)}% | Combined=${(match.matchedImage.combinedScore * 100).toFixed(1)}%`);
        }

        if (match.visualType === 'stock_video') {
          console.log(`   -> Needs stock video (handled by Pexels step)`);
        }

        if (match.logoUrl) {
          console.log(`   LOGO URL: ${match.logoUrl.substring(0, 80)}...`);
        }
      });

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60));

      const animatedCount = result.matches.filter(m => m.matchedImage).length;
      const stockCount = result.matches.filter(m => m.visualType === 'stock_video').length;
      const logoCount = result.matches.filter(m => m.logoUrl).length;
      const unmatchedAnimated = result.matches.filter(m => m.visualType === 'animated_image' && !m.matchedImage).length;

      console.log(`  Matched to scraped images: ${animatedCount}`);
      console.log(`  Need stock video: ${stockCount}`);
      console.log(`  Using logo: ${logoCount}`);
      if (unmatchedAnimated > 0) {
        console.log(`  WARNING: ${unmatchedAnimated} animated_image scene(s) couldn't find a match`);
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
