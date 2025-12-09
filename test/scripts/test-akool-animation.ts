/**
 * Test Akool Animation API
 *
 * Tests image-to-video animation using Akool's API.
 * Uses scene data from step2-script-v2.json files.
 *
 * Run with: npx tsx test/scripts/test-akool-animation.ts
 *
 * IMPORTANT: This test makes actual API calls and consumes credits.
 * Only run with explicit approval.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { AkoolClient, AKOOL_STATUS } from '../../src/lib/akool/client';

/**
 * Download a file from URL and save locally
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(outputPath);
          downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        fs.unlinkSync(outputPath);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}

// Test configuration
const TEST_CONFIG = {
  // Which POC to test (sweetgreen, joes-pizza, doughnut-vault)
  poc: 'sweetgreen',
  // Which scene to animate (hook, value, benefit, extra)
  sceneId: 'hook',
  // Output directory
  outputDir: 'v2',
};

interface SceneWithImage {
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
}

interface ScriptV2Response {
  success: boolean;
  pocBrand: string;
  script: unknown;
  scenesWithImages: SceneWithImage[];
  generatedAt: string;
}

async function loadSceneData(poc: string, sceneId: string): Promise<SceneWithImage | null> {
  const scriptPath = path.join(
    __dirname,
    '..',
    'poc-responses',
    poc,
    'step2-script-v2.json'
  );

  if (!fs.existsSync(scriptPath)) {
    console.error(`Script file not found: ${scriptPath}`);
    return null;
  }

  const data: ScriptV2Response = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const scene = data.scenesWithImages.find(s => s.sceneId === sceneId);

  if (!scene) {
    console.error(`Scene "${sceneId}" not found in ${poc}`);
    return null;
  }

  return scene;
}

async function testAkoolAnimation() {
  console.log('='.repeat(60));
  console.log('Akool Animation Test');
  console.log('='.repeat(60));

  // Check for API key
  if (!process.env.AKOOL_API_KEY) {
    console.error('AKOOL_API_KEY is not set in environment');
    console.log('Please add AKOOL_API_KEY to your .env.local file');
    process.exit(1);
  }

  const { poc, sceneId, outputDir } = TEST_CONFIG;

  console.log(`\nTest Configuration:`);
  console.log(`  POC: ${poc}`);
  console.log(`  Scene: ${sceneId}`);
  console.log(`  Output: test/poc-responses/${poc}/${outputDir}/`);

  // Load scene data
  console.log(`\nLoading scene data...`);
  const scene = await loadSceneData(poc, sceneId);

  if (!scene) {
    process.exit(1);
  }

  if (!scene.selectedImage || !scene.akoolConfig) {
    console.error('Scene does not have image or akool config');
    process.exit(1);
  }

  console.log(`\nScene Details:`);
  console.log(`  ID: ${scene.sceneId}`);
  console.log(`  Voiceover: "${scene.voiceoverText}"`);
  console.log(`  Display: "${scene.displayText}"`);
  console.log(`  Image: ${scene.selectedImage.alt}`);
  console.log(`  Image URL: ${scene.selectedImage.url}`);
  console.log(`  Akool Prompt: "${scene.akoolConfig.prompt}"`);
  console.log(`  Akool Negative: "${scene.akoolConfig.negativePrompt}"`);
  console.log(`  Video Length: ${scene.akoolConfig.videoLength}s`);
  console.log(`  Resolution: ${scene.akoolConfig.resolution}`);

  // Estimate credit cost
  const creditKey = `${scene.akoolConfig.videoLength}s_${scene.akoolConfig.resolution}` as const;
  const creditCosts: Record<string, number> = {
    '5s_720p': 20,
    '5s_1080p': 25,
    '10s_720p': 40,
    '10s_1080p': 50,
  };
  const estimatedCredits = creditCosts[creditKey] || 20;
  console.log(`\nEstimated Credit Cost: ${estimatedCredits} credits`);

  // Confirmation prompt
  console.log(`\n${'─'.repeat(60)}`);
  console.log('Ready to submit animation request to Akool API.');
  console.log('This will consume credits from your account.');
  console.log(`${'─'.repeat(60)}`);

  // Create output directory
  const outputPath = path.join(__dirname, '..', 'poc-responses', poc, outputDir);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Save request data (dry run output)
  const requestData = {
    sceneId: scene.sceneId,
    imageUrl: scene.selectedImage.url,
    imageAlt: scene.selectedImage.alt,
    prompt: scene.akoolConfig.prompt,
    negativePrompt: scene.akoolConfig.negativePrompt,
    videoLength: scene.akoolConfig.videoLength,
    resolution: scene.akoolConfig.resolution,
    estimatedCredits,
    preparedAt: new Date().toISOString(),
  };

  const requestPath = path.join(outputPath, `step3-akool-request-${sceneId}.json`);
  fs.writeFileSync(requestPath, JSON.stringify(requestData, null, 2));
  console.log(`\nRequest data saved to: ${requestPath}`);

  // Initialize Akool client
  const client = new AkoolClient();

  console.log('\nSubmitting animation request...');
  const startTime = Date.now();

  try {
    // Create animation task
    const task = await client.createAnimation(
      scene.selectedImage.url,
      scene.akoolConfig.prompt,
      scene.akoolConfig.negativePrompt,
      {
        videoLength: scene.akoolConfig.videoLength as 5 | 10,
        resolution: scene.akoolConfig.resolution as '720p' | '1080p',
      }
    );

    console.log(`\nTask created!`);
    console.log(`  Task ID: ${task._id}`);
    console.log(`  Status: ${task.status} (${getStatusText(task.status)})`);

    // Save task info
    const taskData = {
      ...requestData,
      taskId: task._id,
      status: task.status,
      statusText: getStatusText(task.status),
      submittedAt: new Date().toISOString(),
    };

    const taskPath = path.join(outputPath, `step3-akool-task-${sceneId}.json`);
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
    console.log(`Task data saved to: ${taskPath}`);

    // Poll for completion
    console.log('\nWaiting for completion...');
    console.log('(This may take 1-5 minutes)');

    const videoUrl = await client.waitForCompletion(task._id, {
      pollIntervalMs: 10000, // Check every 10 seconds
      maxWaitMs: 600000, // Max 10 minutes
    });

    const elapsed = Date.now() - startTime;

    console.log(`\nAnimation complete!`);
    console.log(`  Video URL: ${videoUrl}`);
    console.log(`  Time: ${Math.round(elapsed / 1000)}s`);

    // Download the video file
    const videoFileName = `step3-animation-${sceneId}.mp4`;
    const videoFilePath = path.join(outputPath, videoFileName);

    console.log(`\nDownloading video to: ${videoFilePath}`);
    try {
      await downloadFile(videoUrl, videoFilePath);
      const stats = fs.statSync(videoFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  Download complete! Size: ${fileSizeMB} MB`);
    } catch (downloadError) {
      console.error(`  Download failed:`, downloadError);
      console.log(`  Video URL is still available: ${videoUrl}`);
    }

    // Save result (includes both URL and local file path)
    const resultData = {
      ...taskData,
      videoUrl,
      localVideoFile: videoFileName,
      completedAt: new Date().toISOString(),
      elapsedMs: elapsed,
    };

    const resultPath = path.join(outputPath, `step3-akool-result-${sceneId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));
    console.log(`\nResult saved to: ${resultPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete!');
    console.log('='.repeat(60));
    console.log(`\nFiles created:`);
    console.log(`  - ${resultPath}`);
    console.log(`  - ${videoFilePath}`);

  } catch (error) {
    console.error('\nAnimation failed:', error);

    // Save error
    const errorData = {
      ...requestData,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
    };

    const errorPath = path.join(outputPath, `step3-akool-error-${sceneId}.json`);
    fs.writeFileSync(errorPath, JSON.stringify(errorData, null, 2));
    console.log(`Error saved to: ${errorPath}`);

    process.exit(1);
  }
}

function getStatusText(status: number): string {
  switch (status) {
    case AKOOL_STATUS.QUEUING:
      return 'queuing';
    case AKOOL_STATUS.PROCESSING:
      return 'processing';
    case AKOOL_STATUS.COMPLETED:
      return 'completed';
    case AKOOL_STATUS.FAILED:
      return 'failed';
    default:
      return 'unknown';
  }
}

// Run test
testAkoolAnimation().catch(console.error);
