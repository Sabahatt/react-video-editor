import { NextResponse } from "next/server";
import { getRenderJob } from "@/lib/render-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

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
