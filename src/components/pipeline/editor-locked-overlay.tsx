"use client";

import { usePipelineStore } from "@/store/use-pipeline-store";

export function EditorLockedOverlay() {
  const { isGenerating, isComplete, error } = usePipelineStore();

  // Only show when generating (not when complete or error)
  const showOverlay = isGenerating && !isComplete && !error;

  if (!showOverlay) return null;

  // Invisible overlay that blocks pointer events with disabled cursor
  return (
    <div
      className="absolute inset-0 z-[100] cursor-not-allowed"
      style={{ pointerEvents: "all" }}
    />
  );
}
