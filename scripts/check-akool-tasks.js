/**
 * Script to check Akool task status and download completed videos
 *
 * Usage:
 *   node scripts/check-akool-tasks.js
 *   node scripts/check-akool-tasks.js <taskId1> <taskId2> ...
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load API key from .env.local or environment
require('dotenv').config({ path: '.env.local' });

const AKOOL_API_KEY = process.env.AKOOL_API_KEY;
const BASE_URL = 'https://openapi.akool.com/api/open/v4';

if (!AKOOL_API_KEY) {
  console.error('ERROR: AKOOL_API_KEY not found in environment');
  console.log('Make sure you have a .env file with AKOOL_API_KEY=your_key');
  process.exit(1);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': AKOOL_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

async function getTaskStatus(taskIds) {
  console.log(`\nChecking status for task(s): ${taskIds}`);

  const result = await fetchJson(`${BASE_URL}/image2Video/resultsByIds`, {
    method: 'POST',
    body: JSON.stringify({ _ids: taskIds }),
  });

  console.log('\nRaw API Response:', JSON.stringify(result, null, 2));

  if (result.code !== 1000) {
    console.error('API Error:', result.msg || result);
    return null;
  }

  // Handle different response formats - Akool returns data.result
  const data = result.data?.result || result.data || result.result || result;
  return Array.isArray(data) ? data : [data];
}

async function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function listRecentTasks() {
  // Try to get recent tasks - trying multiple possible endpoints
  console.log('\nAttempting to list recent tasks...');

  const endpoints = [
    { url: `${BASE_URL}/image2Video/list`, method: 'POST', body: { page: 1, limit: 20 } },
    { url: `${BASE_URL}/image2Video/tasks`, method: 'GET' },
    { url: `${BASE_URL}/image2video/list`, method: 'POST', body: { page: 1, limit: 20 } },
    { url: `${BASE_URL}/task/list`, method: 'POST', body: { type: 'image2video', page: 1, limit: 20 } },
    { url: `${BASE_URL}/tasks`, method: 'GET' },
    { url: 'https://openapi.akool.com/api/open/v3/image2Video/list', method: 'POST', body: { page: 1, limit: 20 } },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Trying: ${ep.url}`);
      const result = await fetchJson(ep.url, {
        method: ep.method,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });

      console.log('Response:', JSON.stringify(result).substring(0, 200));

      if (result.code === 1000 && result.data) {
        return Array.isArray(result.data) ? result.data : [result.data];
      }
    } catch (e) {
      console.log(`  Failed: ${e.message}`);
    }
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);

  console.log('=== Akool Task Checker ===\n');

  // Create output directory
  const outputDir = path.join(__dirname, '..', 'test', 'akool-videos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (args.length > 0) {
    // Check specific task IDs provided as arguments
    const taskIds = args.join(',');
    const tasks = await getTaskStatus(taskIds);

    if (tasks) {
      for (const task of tasks) {
        console.log('\n--- Task Details ---');
        console.log('ID:', task._id);
        console.log('Status:', task.status, getStatusText(task.status));
        console.log('Video URL:', task.video_url || 'N/A');
        console.log('Credits:', task.deduction_credit || 'N/A');

        if (task.video_url && task.status === 3) {
          const filename = `akool-${task._id}.mp4`;
          const outputPath = path.join(outputDir, filename);
          console.log(`\nDownloading video to: ${outputPath}`);
          try {
            await downloadVideo(task.video_url, outputPath);
            console.log('Download complete!');
          } catch (e) {
            console.error('Download failed:', e.message);
          }
        }
      }
    }
  } else {
    // Try to list recent tasks
    console.log('No task IDs provided. Trying to list recent tasks...');
    const tasks = await listRecentTasks();

    if (tasks && tasks.length > 0) {
      console.log(`\nFound ${tasks.length} recent tasks:\n`);
      for (const task of tasks) {
        console.log(`- ${task._id}: ${getStatusText(task.status)} ${task.video_url ? '(has video)' : ''}`);
      }
    } else {
      console.log('\nCould not retrieve task list.');
      console.log('\nTo check specific tasks, run:');
      console.log('  node scripts/check-akool-tasks.js <taskId1> <taskId2> ...');
      console.log('\nYou can find task IDs in your browser console logs');
      console.log('Look for: [Generation] Task IDs: ["..."]');
    }
  }
}

function getStatusText(status) {
  switch (status) {
    case 1: return '(queuing)';
    case 2: return '(processing)';
    case 3: return '(COMPLETED)';
    case 4: return '(failed)';
    default: return '(unknown)';
  }
}

main().catch(console.error);
