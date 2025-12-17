"use client";

import { create } from "zustand";
import useUploadStore from "@/features/editor/store/use-upload-store";

export interface PipelineStep {
  name: string;
  status: "pending" | "active" | "complete" | "error";
}

interface PipelineState {
  // Pipeline status
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;

  // Steps
  steps: PipelineStep[];

  // Generation params (set from landing page)
  restaurant: string | null;
  template: string | null;
  options: Record<string, string>;
  url: string | null;

  // Design data (loaded during pipeline)
  design: any | null;
  brand: any | null;
  script: string | null;

  // Actions
  startPipeline: (url: string, restaurant: string, template: string, options: Record<string, string>) => void;
  updateStep: (index: number, status: PipelineStep["status"]) => void;
  setDesign: (design: any, brand?: any) => void;
  setScript: (script: string | null) => void;
  setError: (error: string) => void;
  completePipeline: () => void;
  dismissPanel: () => void; // Dismiss UI without clearing data
  resetPipeline: () => void;
}

const INITIAL_STEPS: PipelineStep[] = [
  { name: "Analyzing website...", status: "pending" },
  { name: "Extracting brand data...", status: "pending" },
  { name: "Generating AI script...", status: "pending" },
  { name: "Building video timeline...", status: "pending" },
  { name: "Finalizing your ad...", status: "pending" },
];

export const usePipelineStore = create<PipelineState>((set, get) => ({
  // Initial state
  isGenerating: false,
  isComplete: false,
  error: null,
  steps: INITIAL_STEPS.map(s => ({ ...s })),
  restaurant: null,
  template: null,
  options: {},
  url: null,
  design: null,
  brand: null,
  script: null,

  // Actions
  startPipeline: (url, restaurant, template, options) => {
    // Clear uploads from previous session
    useUploadStore.getState().clearUploads();

    set({
      isGenerating: true,
      isComplete: false,
      error: null,
      url,
      restaurant,
      template,
      options,
      design: null,
      brand: null,
      script: null,
      steps: INITIAL_STEPS.map(s => ({ ...s, status: "pending" as const })),
    });
  },

  updateStep: (index, status) => {
    set(state => ({
      steps: state.steps.map((step, i) =>
        i === index ? { ...step, status } : step
      ),
    }));
  },

  setDesign: (design, brand) => {
    // Extract script from design if available
    const script = design?.script || null;
    set({ design, brand: brand || null, script });
  },

  setScript: (script) => {
    set({ script });
  },

  setError: (error) => {
    const { steps } = get();
    const activeIndex = steps.findIndex(s => s.status === "active");
    set({
      error,
      isGenerating: false,
      steps: steps.map((step, i) =>
        i === activeIndex ? { ...step, status: "error" as const } : step
      ),
    });
  },

  completePipeline: () => {
    set({
      isGenerating: false,
      isComplete: true,
    });
  },

  // Dismiss the panel UI without clearing brand/script data
  // Use this when user closes the panel after completion
  dismissPanel: () => {
    set({
      isGenerating: false,
      isComplete: false,
      error: null,
      steps: INITIAL_STEPS.map(s => ({ ...s })),
      // Keep design, brand, script, restaurant, template, url, options
    });
  },

  resetPipeline: () => {
    set({
      isGenerating: false,
      isComplete: false,
      error: null,
      steps: INITIAL_STEPS.map(s => ({ ...s })),
      restaurant: null,
      template: null,
      options: {},
      url: null,
      design: null,
      brand: null,
      script: null,
    });
  },
}));
