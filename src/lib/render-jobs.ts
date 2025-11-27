/**
 * Shared render job state storage.
 *
 * Note: This uses a global Map which works for development.
 * For production with multiple serverless instances, use Redis or a database.
 */

export interface RenderJob {
  status: "pending" | "bundling" | "rendering" | "completed" | "error";
  progress: number;
  outputPath?: string;
  error?: string;
}

// Use globalThis to persist across hot reloads in development
const globalForRenderJobs = globalThis as unknown as {
  renderJobs: Map<string, RenderJob> | undefined;
};

export const renderJobs = globalForRenderJobs.renderJobs ?? new Map<string, RenderJob>();

if (process.env.NODE_ENV !== "production") {
  globalForRenderJobs.renderJobs = renderJobs;
}

export function setRenderJob(jobId: string, job: RenderJob) {
  renderJobs.set(jobId, job);
}

export function getRenderJob(jobId: string): RenderJob | undefined {
  return renderJobs.get(jobId);
}

export function updateRenderJob(jobId: string, updates: Partial<RenderJob>) {
  const current = renderJobs.get(jobId);
  if (current) {
    renderJobs.set(jobId, { ...current, ...updates });
  }
}
