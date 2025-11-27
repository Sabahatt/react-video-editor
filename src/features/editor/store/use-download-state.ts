import { IDesign } from "@designcombo/types";
import { create } from "zustand";
interface Output {
  url: string;
  type: string;
}

type RenderMode = "local" | "cloud";

interface DownloadState {
  projectId: string;
  exporting: boolean;
  exportType: "json" | "mp4";
  progress: number;
  output?: Output;
  payload?: IDesign;
  displayProgressModal: boolean;
  renderMode: RenderMode;
  error?: string;
  actions: {
    setProjectId: (projectId: string) => void;
    setExporting: (exporting: boolean) => void;
    setExportType: (exportType: "json" | "mp4") => void;
    setProgress: (progress: number) => void;
    setState: (state: Partial<DownloadState>) => void;
    setOutput: (output: Output) => void;
    setRenderMode: (mode: RenderMode) => void;
    startExport: () => void;
    startLocalExport: () => void;
    setDisplayProgressModal: (displayProgressModal: boolean) => void;
  };
}

//const baseUrl = "https://api.combo.sh/v1";

export const useDownloadState = create<DownloadState>((set, get) => ({
  projectId: "",
  exporting: false,
  exportType: "mp4",
  progress: 0,
  displayProgressModal: false,
  renderMode: "local", // Default to local rendering
  error: undefined,
  actions: {
    setProjectId: (projectId) => set({ projectId }),
    setExporting: (exporting) => set({ exporting }),
    setExportType: (exportType) => set({ exportType }),
    setProgress: (progress) => set({ progress }),
    setState: (state) => set({ ...state }),
    setOutput: (output) => set({ output }),
    setRenderMode: (mode) => set({ renderMode: mode }),
    setDisplayProgressModal: (displayProgressModal) =>
      set({ displayProgressModal }),

    // Local rendering using Remotion
    startLocalExport: async () => {
      try {
        set({ exporting: true, displayProgressModal: true, progress: 0, error: undefined });

        const { payload } = get();
        if (!payload) throw new Error("Payload is not defined");

        // POST request to start local rendering
        const response = await fetch(`/api/render-local`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            design: payload,
            options: {
              fps: payload.fps || 30,
              size: payload.size,
              format: "mp4"
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to submit local export request.");
        }

        const jobInfo = await response.json();
        const jobId = jobInfo.render.id;

        // Polling for status updates
        const checkStatus = async () => {
          try {
            const statusResponse = await fetch(`/api/render-local/${jobId}`, {
              headers: {
                "Content-Type": "application/json"
              }
            });

            if (!statusResponse.ok) {
              throw new Error("Failed to fetch export status.");
            }

            const statusInfo = await statusResponse.json();
            const { status, progress, presigned_url: url, error } = statusInfo.render;

            set({ progress: Math.round(progress) });

            if (status === "COMPLETED") {
              set({ exporting: false, output: { url, type: get().exportType } });
            } else if (status === "ERROR") {
              set({ exporting: false, error: error || "Render failed" });
            } else if (status === "PROCESSING" || status === "bundling" || status === "rendering" || status === "pending") {
              setTimeout(checkStatus, 1000);
            }
          } catch (err) {
            console.error("Status check error:", err);
            set({ exporting: false, error: "Failed to check render status" });
          }
        };

        checkStatus();
      } catch (error: any) {
        console.error("Local export error:", error);
        set({ exporting: false, error: error.message });
      }
    },

    // Cloud rendering using DesignCombo API (original implementation)
    startExport: async () => {
      const { renderMode } = get();

      // If local mode, use local export
      if (renderMode === "local") {
        return get().actions.startLocalExport();
      }

      // Cloud export (original code)
      try {
        set({ exporting: true, displayProgressModal: true, progress: 0, error: undefined });

        const { payload } = get();
        if (!payload) throw new Error("Payload is not defined");

        const response = await fetch(`/api/render`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            design: payload,
            options: {
              fps: 30,
              size: payload.size,
              format: "mp4"
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to submit export request.");
        }

        const jobInfo = await response.json();
        const jobId = jobInfo.render.id;

        const checkStatus = async () => {
          const statusResponse = await fetch(`/api/render/${jobId}`, {
            headers: {
              "Content-Type": "application/json"
            }
          });

          if (!statusResponse.ok)
            throw new Error("Failed to fetch export status.");

          const statusInfo = await statusResponse.json();
          const { status, progress, presigned_url: url } = statusInfo.render;

          set({ progress });

          if (status === "COMPLETED") {
            set({ exporting: false, output: { url, type: get().exportType } });
          } else if (status === "PROCESSING" || status === "PENDING") {
            setTimeout(checkStatus, 2500);
          }
        };

        checkStatus();
      } catch (error: any) {
        console.error("Cloud export error:", error);
        set({ exporting: false, error: error.message });
      }
    }
  }
}));
