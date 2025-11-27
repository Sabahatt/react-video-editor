import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { setRenderJob, getRenderJob, updateRenderJob } from "@/lib/render-jobs";

// Force this route to use Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { design, options } = body;

    // Get the host from request headers to construct absolute URLs
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Generate a unique job ID
    const jobId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job status
    setRenderJob(jobId, {
      status: "pending",
      progress: 0
    });

    // Start rendering in background
    startRender(jobId, design, options, baseUrl).catch((error) => {
      console.error("Render error:", error);
      console.error("Error stack:", error.stack);
      setRenderJob(jobId, {
        status: "error",
        progress: 0,
        error: error.message || String(error)
      });
    });

    return NextResponse.json(
      {
        render: {
          id: jobId,
          status: "pending"
        }
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to start render";
    console.error("Render request error:", error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Convert relative URLs to absolute file paths for local files
 * This is needed because Remotion's bundler can't access relative URLs
 */
function convertToAbsoluteUrls(
  trackItemsMap: Record<string, unknown>,
  baseUrl: string
): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(trackItemsMap)) {
    if (item && typeof item === "object") {
      const trackItem = item as Record<string, unknown>;
      const details = trackItem.details as Record<string, unknown> | undefined;

      if (details?.src && typeof details.src === "string") {
        // Convert relative /uploads/ paths to absolute URLs
        if (details.src.startsWith("/uploads/") || details.src.startsWith("/renders/")) {
          converted[key] = {
            ...trackItem,
            details: {
              ...details,
              src: `${baseUrl}${details.src}`
            }
          };
          continue;
        }
      }
      converted[key] = trackItem;
    } else {
      converted[key] = item;
    }
  }

  return converted;
}

async function startRender(
  jobId: string,
  design: {
    fps?: number;
    size?: { width: number; height: number };
    trackItemIds?: string[];
    trackItemsMap?: Record<string, unknown>;
    transitionIds?: string[];
    transitionsMap?: Record<string, unknown>;
    background?: { type: "color" | "image"; value: string };
  },
  options: { fps?: number; size?: { width: number; height: number }; format?: string },
  baseUrl: string
) {
  // Dynamic imports for Remotion packages (Node.js only)
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition, ensureBrowser } = await import("@remotion/renderer");

  const outputDir = path.join(process.cwd(), "public", "renders");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${jobId}.mp4`);

  // Ensure browser is available (this caches it for future renders)
  console.log("Ensuring browser is available...");
  await ensureBrowser();
  console.log("Browser ready");

  // Update status to bundling
  setRenderJob(jobId, {
    status: "bundling",
    progress: 0
  });

  // Bundle the Remotion project
  console.log("Starting bundle...");
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "src", "remotion", "root.tsx"),
    onProgress: (progress: number) => {
      const bundleProgress = Math.min(Math.round(progress * 10), 10); // Cap at 10%
      updateRenderJob(jobId, {
        progress: bundleProgress
      });
    }
  });
  console.log("Bundle complete:", bundleLocation);

  // Convert relative URLs to absolute URLs for local files
  // Use the baseUrl from the request so Remotion can fetch from the running Next.js server
  console.log("Using base URL for assets:", baseUrl);
  const convertedTrackItemsMap = convertToAbsoluteUrls(
    (design.trackItemsMap || {}) as Record<string, unknown>,
    baseUrl
  );

  // Prepare composition props
  const inputProps = {
    fps: options.fps || design.fps || 30,
    width: options.size?.width || design.size?.width || 1080,
    height: options.size?.height || design.size?.height || 1920,
    trackItemIds: design.trackItemIds || [],
    trackItemsMap: convertedTrackItemsMap,
    transitionIds: design.transitionIds || [],
    transitionsMap: design.transitionsMap || {},
    background: design.background
  };

  console.log("Selecting composition...");
  // Get composition with calculated metadata
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoEditor",
    inputProps
  });
  console.log("Composition selected, duration:", composition.durationInFrames, "frames");

  // Update status to rendering
  setRenderJob(jobId, {
    status: "rendering",
    progress: 10
  });

  console.log("Starting render...");
  // Render the video
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }: { progress: number }) => {
      // progress is 0-1, map to 10-100%
      const renderProgress = Math.min(Math.round(10 + progress * 90), 100);
      updateRenderJob(jobId, {
        status: "rendering",
        progress: renderProgress
      });
    }
  });

  console.log("Render complete:", outputPath);

  // Update status to completed
  setRenderJob(jobId, {
    status: "completed",
    progress: 100,
    outputPath: `/renders/${jobId}.mp4`
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    return NextResponse.json(
      { message: "Job ID is required" },
      { status: 400 }
    );
  }

  const job = getRenderJob(jobId);

  if (!job) {
    return NextResponse.json({ message: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      render: {
        id: jobId,
        status: job.status === "completed" ? "COMPLETED" : job.status === "error" ? "ERROR" : "PROCESSING",
        progress: job.progress,
        presigned_url: job.outputPath,
        error: job.error
      }
    },
    { status: 200 }
  );
}
