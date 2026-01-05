/**
 * BLIP Image Captioning Utility
 *
 * Calls a local Python BLIP service for image captioning.
 * Completely free - runs on your machine.
 *
 * Setup:
 *   cd blip-service
 *   pip install -r requirements.txt
 *   python main.py
 *
 * The service runs at http://localhost:8100
 */

// Local BLIP service endpoint
const BLIP_SERVICE_URL = process.env.BLIP_SERVICE_URL || "http://localhost:8100";

export interface ImageWithCaption {
  url: string;
  productName: string;
  caption: string;
  productDescription?: string;
  foodType?: string;
  dimensions?: { width: number; height: number };
  [key: string]: unknown;
}

export interface ImageInput {
  url: string;
  productName: string;
  productDescription?: string;
  foodType?: string;
  dimensions?: { width: number; height: number };
  [key: string]: unknown;
}

export interface BLIPOptions {
  /** Base URL for the BLIP service */
  serviceUrl?: string;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number, productName: string) => void;
}

/**
 * Check if the local BLIP service is running
 */
export async function checkBLIPService(serviceUrl?: string): Promise<boolean> {
  const url = serviceUrl || BLIP_SERVICE_URL;

  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    console.log(`[BLIP] Service running on ${data.device}`);
    console.log(`[BLIP] Model: ${data.model}`);
    return true;
  } catch (error) {
    console.error("[BLIP] Service not available:", error);
    return false;
  }
}

/**
 * Generate a caption for a single image
 */
export async function generateCaption(
  imageUrl: string,
  serviceUrl?: string
): Promise<string> {
  const url = serviceUrl || BLIP_SERVICE_URL;

  const response = await fetch(`${url}/caption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: imageUrl }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BLIP service error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.caption;
}

/**
 * Generate captions for multiple images (batch)
 */
export async function generateCaptions(
  images: ImageInput[],
  options: BLIPOptions = {}
): Promise<ImageWithCaption[]> {
  const { serviceUrl, onProgress } = options;
  const url = serviceUrl || BLIP_SERVICE_URL;

  console.log(`[BLIP] Generating captions for ${images.length} images...`);
  console.log(`[BLIP] This may take a while on CPU (~5-10s per image)...`);

  // Create AbortController with longer timeout for batch processing
  // ~15 seconds per image + 60s buffer
  const timeoutMs = Math.max(images.length * 15000, 60000) + 60000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/caption-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`BLIP service error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    console.log(`[BLIP] Completed in ${data.total_time_ms}ms`);
    console.log(`[BLIP] Average: ${Math.round(data.total_time_ms / images.length)}ms per image`);

    // Log results
    data.images.forEach((img: ImageWithCaption, i: number) => {
      console.log(`[BLIP] [${i + 1}/${images.length}] ${img.productName}`);
      console.log(`       Caption: "${img.caption}"`);
      onProgress?.(i + 1, images.length, img.productName);
    });

    return data.images;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate captions one by one (for progress tracking)
 */
export async function generateCaptionsSequential(
  images: ImageInput[],
  options: BLIPOptions = {}
): Promise<ImageWithCaption[]> {
  const { serviceUrl, onProgress } = options;
  const results: ImageWithCaption[] = [];

  console.log(`[BLIP] Generating captions for ${images.length} images sequentially...`);

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    try {
      const caption = await generateCaption(img.url, serviceUrl);

      results.push({
        ...img,
        caption,
      });

      console.log(`[BLIP] [${i + 1}/${images.length}] ${img.productName}`);
      console.log(`       Caption: "${caption}"`);

      onProgress?.(i + 1, images.length, img.productName);
    } catch (error) {
      console.error(`[BLIP] Failed to caption ${img.productName}:`, error);

      results.push({
        ...img,
        caption: img.productDescription || img.productName || "unknown",
      });

      onProgress?.(i + 1, images.length, img.productName);
    }
  }

  return results;
}

/**
 * Test the BLIP connection with a sample image
 */
export async function testBLIPConnection(
  testImageUrl?: string,
  serviceUrl?: string
): Promise<boolean> {
  // First check if service is running
  const isRunning = await checkBLIPService(serviceUrl);
  if (!isRunning) {
    console.error("[BLIP] Service is not running. Start it with:");
    console.error("  cd blip-service && python main.py");
    return false;
  }

  // Test with actual image if provided
  if (testImageUrl) {
    try {
      const caption = await generateCaption(testImageUrl, serviceUrl);
      console.log(`[BLIP] Test caption: "${caption}"`);
      return true;
    } catch (error) {
      console.error("[BLIP] Test failed:", error);
      return false;
    }
  }

  return true;
}
