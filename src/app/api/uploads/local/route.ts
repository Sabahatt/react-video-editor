import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import ffmpeg from "fluent-ffmpeg";

// Generate a thumbnail from a video file
async function generateVideoThumbnail(
  videoPath: string,
  outputDir: string,
  thumbnailName: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const thumbnailPath = path.join(outputDir, thumbnailName);

    ffmpeg(videoPath)
      .screenshots({
        timestamps: [1], // Capture at 1 second
        filename: thumbnailName,
        folder: outputDir,
        size: "320x?" // 320px width, maintain aspect ratio
      })
      .on("end", () => {
        resolve(`/uploads/${thumbnailName}`);
      })
      .on("error", (err) => {
        console.error("Thumbnail generation failed:", err.message);
        resolve(null);
      });
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${sanitizedName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL
    const url = `/uploads/${fileName}`;

    // Generate thumbnail for video files
    let thumbnailUrl: string | null = null;
    if (file.type.startsWith("video/")) {
      const thumbnailName = `thumb-${timestamp}-${sanitizedName.replace(/\.[^.]+$/, ".jpg")}`;
      thumbnailUrl = await generateVideoThumbnail(
        filePath,
        uploadsDir,
        thumbnailName
      );
    }

    return NextResponse.json({
      success: true,
      uploads: [
        {
          fileName: file.name,
          filePath: url,
          contentType: file.type,
          url: url,
          folder: null,
          ...(thumbnailUrl && { thumbnailUrl })
        }
      ]
    });
  } catch (error) {
    console.error("Error in local upload route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
