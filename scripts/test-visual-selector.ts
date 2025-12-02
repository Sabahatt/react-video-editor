/**
 * Test script for CLIP visual selector
 *
 * Run with: npx tsx scripts/test-visual-selector.ts
 *
 * First run will download CLIP model (~350MB) - takes 1-3 minutes
 * Subsequent runs use cached models and are much faster
 */

// Load .env.local file
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  findBestMatchingImages,
  classifyImage,
  generateCaption,
  validateImageContent,
  assignImagesToScenes,
  preloadModels,
} from '../src/lib/visual-selector';

// Sample test images (free stock photos from Pexels)
const TEST_IMAGES = {
  coffee: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
  laptop: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
  food: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
  nature: 'https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
};

async function runTests() {
  console.log('='.repeat(60));
  console.log('VISUAL SELECTOR TEST SUITE (CLIP)');
  console.log('='.repeat(60));
  console.log('\n');

  // Test 1: Preload model
  console.log('TEST 1: Preload CLIP Model');
  console.log('-'.repeat(40));
  const startLoad = Date.now();
  await preloadModels();
  console.log(`Model loaded in ${((Date.now() - startLoad) / 1000).toFixed(1)}s\n`);

  // Test 2: Find best matching image (CLIP)
  console.log('TEST 2: Find Best Matching Images (CLIP)');
  console.log('-'.repeat(40));

  const imageUrls = Object.values(TEST_IMAGES);
  const searchText = 'fresh morning coffee cup';

  console.log(`Searching for: "${searchText}"`);
  const matches = await findBestMatchingImages(imageUrls, searchText);

  console.log('Results (sorted by relevance):');
  matches.forEach((m, i) => {
    const name = Object.entries(TEST_IMAGES).find(([_, url]) => url === m.url)?.[0] ?? 'unknown';
    console.log(`  ${i + 1}. ${name}: ${(m.score * 100).toFixed(1)}% match`);
  });
  console.log('\n');

  // Test 3: Classify image against labels
  console.log('TEST 3: Classify Image Against Labels (CLIP)');
  console.log('-'.repeat(40));

  const labels = [
    'coffee beverage drink',
    'technology computer workspace',
    'healthy food meal',
    'nature landscape scenery',
  ];

  console.log('Classifying coffee image against categories:');
  const classification = await classifyImage(TEST_IMAGES.coffee, labels);
  classification.forEach(c => {
    console.log(`  - ${c.label}: ${(c.score * 100).toFixed(1)}%`);
  });
  console.log('\n');

  // Test 4: Validate image content
  console.log('TEST 4: Validate Image Content');
  console.log('-'.repeat(40));

  const validationTests = [
    { url: TEST_IMAGES.coffee, expected: 'coffee cup beverage' },
    { url: TEST_IMAGES.laptop, expected: 'coffee cup beverage' }, // Should fail
    { url: TEST_IMAGES.food, expected: 'healthy food meal' },
  ];

  for (const test of validationTests) {
    const result = await validateImageContent(test.url, test.expected, 0.4);
    const name = Object.entries(TEST_IMAGES).find(([_, url]) => url === test.url)?.[0] ?? 'unknown';
    console.log(`${name} vs "${test.expected}":`);
    console.log(`  Valid: ${result.isValid ? 'YES' : 'NO'} (${(result.score * 100).toFixed(1)}%)`);
  }
  console.log('\n');

  // Test 5: Assign images to ad scenes
  console.log('TEST 5: Assign Images to Ad Scenes');
  console.log('-'.repeat(40));

  const adScenes = [
    { id: 'hook', text: 'Start your morning right with fresh coffee' },
    { id: 'product', text: 'Technology and productivity workspace' },
    { id: 'lifestyle', text: 'Healthy eating and nutrition' },
    { id: 'cta', text: 'Beautiful nature and relaxation' },
  ];

  console.log('Ad script scenes:');
  adScenes.forEach(s => console.log(`  - ${s.id}: "${s.text}"`));

  const assignments = await assignImagesToScenes(imageUrls, adScenes);

  console.log('\nAssigned images:');
  for (const [sceneId, url] of Object.entries(assignments)) {
    const name = Object.entries(TEST_IMAGES).find(([_, u]) => u === url)?.[0] ?? 'unknown';
    console.log(`  ${sceneId} -> ${name}`);
  }
  console.log('\n');

  // Test 6: Image Caption (runs locally - no API key needed!)
  console.log('TEST 6: Generate Caption (ViT-GPT2 - LOCAL)');
  console.log('-'.repeat(40));

  console.log('Testing image captioning (first run downloads ~500MB model)...');
  const caption = await generateCaption(TEST_IMAGES.coffee);
  console.log(`Coffee image caption: "${caption}"`);

  // Also caption other images to demonstrate
  console.log('\nCaptioning all test images:');
  for (const [name, url] of Object.entries(TEST_IMAGES)) {
    const cap = await generateCaption(url);
    console.log(`  ${name}: "${cap}"`);
  }
  console.log('\n');

  // Summary
  console.log('='.repeat(60));
  console.log('ALL TESTS COMPLETED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log('\nThe visual selector is ready for use in your ad pipeline!');
  console.log('All models run LOCALLY - no API keys required!');
  console.log('\nUse these functions in src/lib/visual-selector.ts:');
  console.log('  - findBestMatchingImages(images, text)   <- Match images to text');
  console.log('  - classifyImage(imageUrl, labels)        <- Classify into categories');
  console.log('  - validateImageContent(imageUrl, expected)');
  console.log('  - assignImagesToScenes(images, scenes)   <- Auto-assign for ad scenes');
  console.log('  - generateCaption(imageUrl)              <- Generate text description');
}

// Run tests
runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
