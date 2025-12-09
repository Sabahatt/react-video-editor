import { NextRequest, NextResponse } from 'next/server';
import { AkoolClient, AKOOL_STATUS, AKOOL_CREDIT_COSTS } from '@/lib/akool/client';

interface AnimationRequest {
  imageUrl: string;
  prompt: string;
  negativePrompt: string;
  videoLength?: 5 | 10;
  resolution?: '720p' | '1080p' | '4k';
}

interface SceneAnimationRequest {
  sceneId: string;
  imageUrl: string;
  prompt: string;
  negativePrompt: string;
  videoLength?: 5 | 10;
  resolution?: '720p' | '1080p' | '4k';
}

/**
 * POST /api/animate-images
 *
 * Animate one or more images using Akool's image2video API.
 *
 * Request body:
 * - Single image: { imageUrl, prompt, negativePrompt, videoLength?, resolution? }
 * - Multiple images: { scenes: [{ sceneId, imageUrl, prompt, negativePrompt, ... }] }
 *
 * Response:
 * - Single: { success, taskId, videoUrl?, status, credits }
 * - Multiple: { success, results: [{ sceneId, taskId, videoUrl?, status, credits, error? }] }
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.AKOOL_API_KEY) {
      return NextResponse.json(
        { error: 'AKOOL_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const client = new AkoolClient();

    // Check if this is a batch request
    if (body.scenes && Array.isArray(body.scenes)) {
      return handleBatchAnimation(client, body.scenes);
    }

    // Single image animation
    return handleSingleAnimation(client, body);
  } catch (error) {
    console.error('Animation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle single image animation
 */
async function handleSingleAnimation(
  client: AkoolClient,
  body: AnimationRequest
): Promise<NextResponse> {
  const {
    imageUrl,
    prompt,
    negativePrompt,
    videoLength = 5,
    resolution = '720p',
  } = body;

  // Validate required fields
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json(
      { error: 'imageUrl is required' },
      { status: 400 }
    );
  }

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json(
      { error: 'prompt is required' },
      { status: 400 }
    );
  }

  // Create animation task
  const task = await client.createAnimation(
    imageUrl,
    prompt,
    negativePrompt || 'blurry, distorted, oversaturated',
    { videoLength, resolution }
  );

  const creditKey = `${videoLength}s_${resolution}` as keyof typeof AKOOL_CREDIT_COSTS;

  return NextResponse.json({
    success: true,
    taskId: task._id,
    status: task.status,
    statusText: getStatusText(task.status),
    credits: task.deduction_credit || AKOOL_CREDIT_COSTS[creditKey],
    videoUrl: task.video_url,
  });
}

/**
 * Handle batch animation (multiple scenes)
 */
async function handleBatchAnimation(
  client: AkoolClient,
  scenes: SceneAnimationRequest[]
): Promise<NextResponse> {
  // Validate scenes
  if (scenes.length === 0) {
    return NextResponse.json(
      { error: 'scenes array cannot be empty' },
      { status: 400 }
    );
  }

  // Estimate total credits
  const totalCredits = scenes.reduce((sum, scene) => {
    const videoLength = scene.videoLength || 5;
    const resolution = scene.resolution || '720p';
    const creditKey = `${videoLength}s_${resolution}` as keyof typeof AKOOL_CREDIT_COSTS;
    return sum + AKOOL_CREDIT_COSTS[creditKey];
  }, 0);

  // Start all animations in parallel
  const results = await Promise.all(
    scenes.map(async (scene) => {
      try {
        const task = await client.createAnimation(
          scene.imageUrl,
          scene.prompt,
          scene.negativePrompt || 'blurry, distorted, oversaturated',
          {
            videoLength: scene.videoLength || 5,
            resolution: scene.resolution || '720p',
          }
        );

        const creditKey = `${scene.videoLength || 5}s_${scene.resolution || '720p'}` as keyof typeof AKOOL_CREDIT_COSTS;

        return {
          sceneId: scene.sceneId,
          taskId: task._id,
          status: task.status,
          statusText: getStatusText(task.status),
          credits: task.deduction_credit || AKOOL_CREDIT_COSTS[creditKey],
          videoUrl: task.video_url,
        };
      } catch (error) {
        return {
          sceneId: scene.sceneId,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return NextResponse.json({
    success: true,
    totalCredits,
    results,
  });
}

/**
 * GET /api/animate-images?taskId=xxx
 *
 * Check status of an animation task
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const taskIds = searchParams.get('taskIds'); // Comma-separated for batch

    if (!process.env.AKOOL_API_KEY) {
      return NextResponse.json(
        { error: 'AKOOL_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = new AkoolClient();

    // Handle batch status check
    if (taskIds) {
      const ids = taskIds.split(',').map(id => id.trim()).filter(Boolean);
      const statuses = await Promise.all(
        ids.map(async (id) => {
          try {
            const status = await client.getTaskStatus(id);
            return {
              taskId: id,
              status: status.status,
              statusText: getStatusText(status.status),
              videoUrl: status.video_url,
              error: status.error,
            };
          } catch (error) {
            return {
              taskId: id,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      const allComplete = statuses.every(
        s => s.status === AKOOL_STATUS.COMPLETED || s.status === AKOOL_STATUS.FAILED || s.error
      );

      return NextResponse.json({
        success: true,
        allComplete,
        statuses,
      });
    }

    // Single task status
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId or taskIds query parameter is required' },
        { status: 400 }
      );
    }

    const status = await client.getTaskStatus(taskId);

    return NextResponse.json({
      success: true,
      taskId,
      status: status.status,
      statusText: getStatusText(status.status),
      videoUrl: status.video_url,
      error: status.error,
      isComplete: status.status === AKOOL_STATUS.COMPLETED,
      isFailed: status.status === AKOOL_STATUS.FAILED,
    });
  } catch (error) {
    console.error('Animation status API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get human-readable status text
 */
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
