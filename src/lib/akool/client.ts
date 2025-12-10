/**
 * Akool Image-to-Video API Client
 *
 * Uses Akool's image2video API to animate static images.
 * https://docs.akool.com/ai-tools-suite/image2video
 *
 * Credit costs (Pro plan - 600 credits):
 * - 5s @ 720p: 20 credits
 * - 5s @ 1080p: 25 credits
 * - 10s @ 720p: 40 credits
 * - 10s @ 1080p: 50 credits
 */

export interface AkoolImage2VideoRequest {
  /** URL of the image to animate */
  image_url: string;
  /** Animation prompt describing the motion */
  prompt: string;
  /** What to avoid in animation */
  negative_prompt: string;
  /** Output resolution */
  resolution: '720p' | '1080p' | '4k';
  /** Video duration in seconds */
  video_length: 5 | 10;
  /** Audio type: 1=AI generate, 2=custom, 3=none */
  audio_type: 1 | 2 | 3;
  /** Optional: Use extended prompts algorithm */
  extend_prompt?: boolean;
  /** Optional: Use premium model (faster, pro+ only) */
  is_premium_model?: boolean;
  /** Optional: Webhook URL for completion notification */
  webhookurl?: string;
}

export interface AkoolImage2VideoResponse {
  /** Task ID for status polling */
  _id: string;
  /** Status: 1=queuing, 2=processing, 3=completed, 4=failed */
  status: 1 | 2 | 3 | 4;
  /** Video URL (available when status=3) */
  video_url?: string;
  /** Credits deducted */
  deduction_credit?: number;
  /** Error message if failed */
  error?: string;
}

export interface AkoolTaskStatus {
  _id: string;
  status: 1 | 2 | 3 | 4;
  video_url?: string;
  deduction_credit?: number;
  error?: string;
}

/**
 * Status code meanings
 */
export const AKOOL_STATUS = {
  QUEUING: 1,
  PROCESSING: 2,
  COMPLETED: 3,
  FAILED: 4,
} as const;

/**
 * Credit costs by configuration
 */
export const AKOOL_CREDIT_COSTS = {
  '5s_720p': 20,
  '5s_1080p': 25,
  '5s_4k': 30,
  '10s_720p': 40,
  '10s_1080p': 50,
  '10s_4k': 60,
} as const;

/**
 * Akool API Client
 */
export class AkoolClient {
  private apiKey: string;
  private baseUrl = 'https://openapi.akool.com/api/open/v4';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AKOOL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('AKOOL_API_KEY is required');
    }
  }

  /**
   * Create an image-to-video animation task
   */
  async createAnimation(
    imageUrl: string,
    prompt: string,
    negativePrompt: string,
    options: {
      resolution?: '720p' | '1080p' | '4k';
      videoLength?: 5 | 10;
      webhookUrl?: string;
    } = {}
  ): Promise<AkoolImage2VideoResponse> {
    const {
      resolution = '720p',
      videoLength = 5,
      webhookUrl,
    } = options;

    const request: AkoolImage2VideoRequest = {
      image_url: imageUrl,
      prompt,
      negative_prompt: negativePrompt,
      resolution,
      video_length: videoLength,
      audio_type: 3, // No audio - we add voiceover separately
    };

    if (webhookUrl) {
      request.webhookurl = webhookUrl;
    }

    const response = await fetch(`${this.baseUrl}/image2Video/createBySourcePrompt`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Akool API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    // Handle Akool API response format
    if (result.code !== 1000) {
      throw new Error(`Akool API error: ${result.msg || 'Unknown error'}`);
    }

    return {
      _id: result.data._id || result.data.id,
      status: result.data.status || AKOOL_STATUS.QUEUING,
      video_url: result.data.video_url,
      deduction_credit: result.data.deduction_credit,
    };
  }

  /**
   * Get the status of an animation task with retry logic
   */
  async getTaskStatus(taskId: string, retries = 3): Promise<AkoolTaskStatus> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/image2Video/resultsByIds`, {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ _ids: taskId }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Akool API error: ${response.status} - ${error}`);
        }

        const result = await response.json();

        if (result.code !== 1000) {
          throw new Error(`Akool API error: ${result.msg || 'Unknown error'}`);
        }

        // API returns data.result array (not data directly)
        const resultArray = result.data?.result || result.data;
        const taskData = Array.isArray(resultArray) ? resultArray[0] : resultArray;

        if (!taskData) {
          throw new Error('No task data returned from Akool API');
        }

        return {
          _id: taskData._id || taskId,
          status: taskData.status,
          video_url: taskData.video_url,
          deduction_credit: taskData.deduction_credit,
          error: taskData.error,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`Status check attempt ${attempt + 1}/${retries} failed: ${lastError.message}`);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }
    }

    throw lastError || new Error('Failed to get task status');
  }

  /**
   * Poll for task completion
   * Returns the video URL when complete, or throws on failure/timeout
   */
  async waitForCompletion(
    taskId: string,
    options: {
      pollIntervalMs?: number;
      maxWaitMs?: number;
    } = {}
  ): Promise<string> {
    const {
      pollIntervalMs = 5000, // 5 seconds
      maxWaitMs = 300000, // 5 minutes
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === AKOOL_STATUS.COMPLETED) {
        if (!status.video_url) {
          throw new Error('Task completed but no video URL returned');
        }
        return status.video_url;
      }

      if (status.status === AKOOL_STATUS.FAILED) {
        throw new Error(`Animation failed: ${status.error || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Animation timed out after ${maxWaitMs}ms`);
  }

  /**
   * Create animation and wait for completion
   * Convenience method that combines createAnimation and waitForCompletion
   */
  async animateImage(
    imageUrl: string,
    prompt: string,
    negativePrompt: string,
    options: {
      resolution?: '720p' | '1080p' | '4k';
      videoLength?: 5 | 10;
      pollIntervalMs?: number;
      maxWaitMs?: number;
    } = {}
  ): Promise<{ videoUrl: string; taskId: string; credits: number }> {
    const task = await this.createAnimation(imageUrl, prompt, negativePrompt, options);

    const videoUrl = await this.waitForCompletion(task._id, {
      pollIntervalMs: options.pollIntervalMs,
      maxWaitMs: options.maxWaitMs,
    });

    return {
      videoUrl,
      taskId: task._id,
      credits: task.deduction_credit || AKOOL_CREDIT_COSTS[`${options.videoLength || 5}s_${options.resolution || '720p'}`],
    };
  }

  /**
   * Estimate credit cost for a batch of animations
   */
  static estimateCreditCost(
    sceneCount: number,
    videoLength: 5 | 10 = 5,
    resolution: '720p' | '1080p' | '4k' = '720p'
  ): number {
    const key = `${videoLength}s_${resolution}` as keyof typeof AKOOL_CREDIT_COSTS;
    return sceneCount * AKOOL_CREDIT_COSTS[key];
  }
}

/**
 * Get a singleton Akool client instance
 */
let clientInstance: AkoolClient | null = null;

export function getAkoolClient(): AkoolClient {
  if (!clientInstance) {
    clientInstance = new AkoolClient();
  }
  return clientInstance;
}

/**
 * Result type for batch animation
 */
export type AnimationResult =
  | { success: true; videoUrl: string; taskId: string; credits: number }
  | { success: false; error: string };

/**
 * Animate multiple images in parallel
 * Returns array of results in same order as input
 */
export async function animateImages(
  images: Array<{
    imageUrl: string;
    prompt: string;
    negativePrompt: string;
    videoLength?: 5 | 10;
    resolution?: '720p' | '1080p' | '4k';
  }>
): Promise<AnimationResult[]> {
  const client = getAkoolClient();

  // Start all animations in parallel
  const tasks = await Promise.all(
    images.map(async (img) => {
      try {
        const task = await client.createAnimation(
          img.imageUrl,
          img.prompt,
          img.negativePrompt,
          {
            videoLength: img.videoLength || 5,
            resolution: img.resolution || '720p',
          }
        );
        return { taskId: task._id, image: img, error: null };
      } catch (error) {
        return { taskId: null, image: img, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })
  );

  // Wait for all completions in parallel
  const results: AnimationResult[] = await Promise.all(
    tasks.map(async (task) => {
      if (task.error || !task.taskId) {
        return { success: false as const, error: task.error || 'Failed to create task' };
      }

      try {
        const videoUrl = await client.waitForCompletion(task.taskId);
        const creditKey = `${task.image.videoLength || 5}s_${task.image.resolution || '720p'}` as keyof typeof AKOOL_CREDIT_COSTS;
        const credits = AKOOL_CREDIT_COSTS[creditKey];
        return { success: true as const, videoUrl, taskId: task.taskId, credits };
      } catch (error) {
        return { success: false as const, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })
  );

  return results;
}
