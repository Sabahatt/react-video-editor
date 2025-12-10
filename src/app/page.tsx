"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POC_RESTAURANTS = [
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    description: "NYC's iconic pizza since 1975",
    cuisine: "Italian",
    url: "https://www.joespizza.com/menu-joes-pizza-santa-monica-venice",
    tone: "playful",
  },
  {
    id: "doughnut-vault",
    name: "The Doughnut Vault",
    description: "Chicago's artisan donuts",
    cuisine: "Bakery",
    url: "https://www.doughnutvault.com/",
    tone: "friendly",
  },
  {
    id: "sweetgreen",
    name: "Sweetgreen",
    description: "Healthy salads & bowls",
    cuisine: "Healthy",
    url: "https://www.sweetgreen.com/",
    tone: "professional",
  },
];

type GenerationStatus = "idle" | "generating" | "complete" | "error";

interface GenerationStep {
  name: string;
  status: "pending" | "active" | "complete" | "error";
}

// Simulated delay for UX (makes the demo feel more realistic)
const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const router = useRouter();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string>("");
  const [enableAkool, setEnableAkool] = useState<boolean>(false); // Akool animation toggle
  // Steps are dynamic based on whether Akool is enabled
  const getInitialSteps = (akoolEnabled: boolean): GenerationStep[] => [
    { name: "Loading brand data", status: "pending" },
    { name: "Generating script & scenes", status: "pending" },
    ...(akoolEnabled ? [{ name: "Animating images (Akool)", status: "pending" as const }] : []),
    { name: "Building timeline", status: "pending" },
  ];

  const [steps, setSteps] = useState<GenerationStep[]>(getInitialSteps(false));

  const updateStep = (index: number, stepStatus: GenerationStep["status"]) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, status: stepStatus } : step))
    );
  };

  const handleGenerate = async () => {
    if (!selectedRestaurant) return;

    const restaurantConfig = POC_RESTAURANTS.find((r) => r.id === selectedRestaurant);
    if (!restaurantConfig) return;

    // Prevent double invocation
    if (status === "generating") {
      console.log("[Generation] Already generating, ignoring...");
      return;
    }

    console.log("[Generation] Starting POC demo for:", restaurantConfig.name, "Akool:", enableAkool);
    setStatus("generating");
    setError("");
    // Reset steps based on whether Akool is enabled
    setSteps(getInitialSteps(enableAkool));

    try {
      // Step 1: Load Brand Data (pre-scraped for POC)
      console.log("[Generation] Step 1: Loading brand data...");
      updateStep(0, "active");
      await simulateDelay(600); // Brief delay for UX
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: restaurantConfig.url }),
      });
      const scrapeResult = await scrapeRes.json();
      console.log("[Generation] Step 1: Brand data loaded, success:", scrapeResult.success);
      console.log("[Generation] Scrape result data:", {
        hasBrand: !!scrapeResult.data?.brand,
        brandName: scrapeResult.data?.brand?.name,
        imageCount: scrapeResult.data?.images?.length || 0,
        isPOC: scrapeResult.data?.isPOC,
      });
      if (!scrapeResult.success) {
        throw new Error(`Failed to load brand data: ${scrapeResult.error}`);
      }
      updateStep(0, "complete");

      // Step 2: Generate Script (v3 - includes scene planning, image selection, akool prompts)
      console.log("[Generation] Step 2: Generating script with scenes...");
      updateStep(1, "active");

      // Log images being passed to script generator
      const imagesToPass = scrapeResult.data?.images || [];
      console.log("[Generation] Images to pass:", imagesToPass.length, "images");
      if (imagesToPass.length > 0) {
        console.log("[Generation] First image sample:", imagesToPass[0]);
      } else {
        console.warn("[Generation] WARNING: No images to pass to script generator!");
      }

      const scriptRes = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: scrapeResult.data?.brand?.name || restaurantConfig.name,
          tagline: scrapeResult.data?.brand?.tagline,
          description: scrapeResult.data?.brand?.description,
          cuisine: scrapeResult.data?.brand?.cuisine,
          tone: restaurantConfig.tone,
          duration: 20,
          url: restaurantConfig.url,
          images: imagesToPass,
          contact: scrapeResult.data?.contact, // Pass contact info for CTA
          animateImages: enableAkool, // Enable Akool animation
        }),
      });
      const scriptResult = await scriptRes.json();
      console.log("[Generation] Step 2: Script generated, success:", scriptResult.success);
      console.log("[Generation] Scene plan:", scriptResult.scenePlan);
      if (!scriptResult.success) {
        throw new Error(`Script generation failed: ${scriptResult.error}`);
      }
      updateStep(1, "complete");

      // Log the full script result for debugging
      console.log("[Generation] Full Script Result:", JSON.stringify(scriptResult, null, 2));

      // Check if we got v3 format (scenes at top level) or legacy format (script.scenes)
      const isV3Format = Array.isArray(scriptResult.scenes);
      console.log("[Generation] Script format:", isV3Format ? "v3" : "legacy");

      if (!isV3Format) {
        // Legacy format - script generation didn't receive images properly
        console.error("[Generation] Got legacy format - images may not have been passed correctly");
        console.log("[Generation] scriptResult.script:", scriptResult.script);
      }

      // Get scenes from the appropriate location
      let rawScenes = isV3Format ? scriptResult.scenes : scriptResult.script?.scenes;
      if (!rawScenes || !Array.isArray(rawScenes)) {
        throw new Error("No scenes found in script result");
      }

      // Step index for timeline (depends on whether Akool step is present)
      let timelineStepIndex = 2;

      // Step 3 (optional): Animate images with Akool
      if (enableAkool) {
        console.log("[Generation] Step 3: Animating images with Akool...");
        updateStep(2, "active");

        // Log the full script before Akool so we can see what was generated
        console.log("[Generation] === SCRIPT BEFORE AKOOL ===");
        console.log("[Generation] Full narration:", scriptResult.fullScript);
        console.log("[Generation] Scenes to animate:");
        rawScenes.forEach((s: { sceneId?: string; visualMode?: string; selectedImage?: { alt?: string } | null; akoolConfig?: { prompt?: string } | null }) => {
          if (s.visualMode === 'animated') {
            console.log(`  - ${s.sceneId}: ${s.selectedImage?.alt}`);
            console.log(`    Prompt: ${s.akoolConfig?.prompt?.substring(0, 100)}...`);
          }
        });

        // Find scenes that need animation (visualMode === 'animated')
        const scenesToAnimate = rawScenes
          .filter((s: { visualMode?: string; selectedImage?: { url: string } | null; akoolConfig?: { prompt: string; negativePrompt?: string } | null }) =>
            s.visualMode === 'animated' && s.selectedImage?.url && s.akoolConfig?.prompt
          )
          .map((s: { sceneId?: string; id?: string; selectedImage: { url: string }; akoolConfig: { prompt: string; negativePrompt?: string } }) => ({
            sceneId: s.sceneId || s.id,
            imageUrl: s.selectedImage.url,
            prompt: s.akoolConfig.prompt,
            negativePrompt: s.akoolConfig.negativePrompt || 'blurry, distorted, oversaturated, unnatural motion',
            videoLength: 5 as const,
            resolution: '720p' as const,
          }));

        console.log(`[Generation] Found ${scenesToAnimate.length} scenes to animate`);

        if (scenesToAnimate.length > 0) {
          // Call animate-images API
          const animateRes = await fetch("/api/animate-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenes: scenesToAnimate }),
          });
          const animateResult = await animateRes.json();
          console.log("[Generation] Akool animation started:", animateResult);

          if (animateResult.success && animateResult.results) {
            // Build a map of sceneId -> taskId for easy lookup
            const sceneToTaskMap = new Map<string, string>();
            for (const result of animateResult.results) {
              if (result.sceneId && result.taskId) {
                sceneToTaskMap.set(result.sceneId, result.taskId);
              }
            }

            const taskIds = Array.from(sceneToTaskMap.values());

            if (taskIds.length > 0) {
              console.log("[Generation] Waiting for Akool animations to complete...");
              console.log("[Generation] Task IDs:", taskIds);
              console.log("[Generation] Scene to Task mapping:", Object.fromEntries(sceneToTaskMap));

              const maxAttempts = 120; // 10 minutes max (5s intervals)
              let attempts = 0;
              let allComplete = false;

              while (!allComplete && attempts < maxAttempts) {
                await simulateDelay(5000); // Wait 5 seconds between polls
                attempts++;

                const statusRes = await fetch(`/api/animate-images?taskIds=${taskIds.join(',')}`);
                const statusResult = await statusRes.json();

                // Count completed vs pending
                const completed = statusResult.statuses?.filter((s: { status: number }) => s.status === 3).length || 0;
                const failed = statusResult.statuses?.filter((s: { status: number }) => s.status === 4).length || 0;
                const pending = taskIds.length - completed - failed;

                console.log(`[Generation] Animation progress: ${completed}/${taskIds.length} complete, ${failed} failed, ${pending} pending (attempt ${attempts})`);

                if (statusResult.allComplete) {
                  allComplete = true;
                  console.log("[Generation] All animations complete! Downloading videos...");

                  // Build taskId -> videoUrl map from statuses
                  const taskToVideoMap = new Map<string, string>();
                  for (const status of statusResult.statuses || []) {
                    if (status.taskId && status.videoUrl) {
                      taskToVideoMap.set(status.taskId, status.videoUrl);
                    }
                  }

                  // Collect all video URLs to download
                  const videosToDownload: { sceneId: string; videoUrl: string }[] = [];
                  for (const [sceneId, taskId] of sceneToTaskMap.entries()) {
                    const videoUrl = taskToVideoMap.get(taskId);
                    if (videoUrl) {
                      videosToDownload.push({ sceneId, videoUrl });
                    }
                  }

                  const sceneToLocalUrl = new Map<string, string>();

                  if (videosToDownload.length > 0) {
                    console.log(`[Generation] Downloading ${videosToDownload.length} videos...`);

                    // Upload all videos via our upload API
                    const uploadRes = await fetch("/api/uploads/url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: "poc-demo",
                        urls: videosToDownload.map(v => v.videoUrl),
                      }),
                    });
                    const uploadResult = await uploadRes.json();

                    if (uploadResult.success && uploadResult.uploads) {
                      // Match uploaded URLs back to scenes
                      for (let i = 0; i < videosToDownload.length; i++) {
                        const upload = uploadResult.uploads[i];
                        if (upload?.url) {
                          const sceneId = videosToDownload[i].sceneId;
                          sceneToLocalUrl.set(sceneId, upload.url);
                          console.log(`[Generation] Scene ${sceneId}: video saved to ${upload.url}`);
                        }
                      }
                    } else {
                      console.error("[Generation] Failed to upload videos:", uploadResult.error);
                    }
                  }

                  // Update scene URLs with local video URLs
                  rawScenes = rawScenes.map((scene: { sceneId?: string; id?: string; visualMode?: string; selectedImage?: { url: string; alt?: string } | null }) => {
                    const sceneId = scene.sceneId || scene.id;
                    if (!sceneId || scene.visualMode !== 'animated') return scene;

                    const localUrl = sceneToLocalUrl.get(sceneId);
                    if (localUrl) {
                      return {
                        ...scene,
                        selectedImage: { ...scene.selectedImage, url: localUrl },
                        isAnimatedVideo: true,
                      };
                    }
                    return scene;
                  });

                  console.log(`[Generation] Downloaded ${sceneToLocalUrl.size} videos`);
                }
              }

              if (!allComplete) {
                console.warn("[Generation] Animation timed out after 10 minutes - proceeding with available results");
              }
            }
          } else if (animateResult.error) {
            console.error("[Generation] Akool animation failed:", animateResult.error);
          }
        }

        updateStep(2, "complete");
        timelineStepIndex = 3;
      }

      // Step 3/4: Build Timeline
      console.log(`[Generation] Step ${timelineStepIndex + 1}: Building timeline...`);
      updateStep(timelineStepIndex, "active");
      const { buildTimelineDesign } = await import("@/lib/timeline-builder");

      // Transform script result to format expected by timeline builder
      // Handle both v3 format (sceneId, selectedImage) and legacy format (id, no images)
      const enrichedScript = {
        fullScript: scriptResult.fullScript || scriptResult.script?.fullScript || "",
        scenes: rawScenes.map((scene: {
          // v3 format fields
          sceneId?: string;
          selectedImage?: { url: string; alt: string; foodType?: string } | null;
          akoolConfig?: { prompt: string } | null;
          contactOverlay?: { website?: string; phone?: string; address?: string; hours?: string; email?: string };
          isAnimatedVideo?: boolean; // Set after Akool animation completes
          // Legacy format fields
          id?: string;
          visualType?: string;
          // Common fields
          voiceoverText: string;
          displayText: string;
          duration: number;
          visualMode?: string;
          kenBurnsDirection?: string;
        }) => {
          const sceneId = scene.sceneId || scene.id || 'unknown';
          const visualMode = scene.visualMode || 'static';
          const hasImage = scene.selectedImage && scene.selectedImage.url;
          const isAnimatedVideo = scene.isAnimatedVideo === true;

          // Determine visual type based on whether Akool animation was applied
          let visualType: 'animated_image' | 'static_image' | 'stock_video' | 'logo_brand';
          if (isAnimatedVideo) {
            visualType = 'stock_video'; // Akool-animated videos use video rendering
          } else if (visualMode === 'animated') {
            visualType = 'animated_image'; // Marked for animation but not yet processed
          } else {
            visualType = 'static_image';
          }

          return {
            id: sceneId,
            voiceoverText: scene.voiceoverText,
            displayText: scene.displayText,
            duration: scene.duration,
            visualMode: visualMode as 'animated' | 'static',
            kenBurnsDirection: scene.kenBurnsDirection as 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | undefined,
            visual: hasImage ? {
              type: visualType,
              url: scene.selectedImage!.url,
              alt: scene.selectedImage!.alt,
              prompt: scene.akoolConfig?.prompt,
            } : {
              type: 'logo_brand' as const,
              url: scrapeResult.data?.brand?.logo || null,
              alt: restaurantConfig.name,
            },
            foodType: scene.selectedImage?.foodType,
            contactOverlay: scene.contactOverlay, // Pass contact info for CTA
          };
        }),
        tone: scriptResult.tone || scriptResult.script?.tone || "friendly",
        totalDuration: scriptResult.totalDuration || scriptResult.script?.totalDuration || 20,
      };

      const brand = {
        name: restaurantConfig.name,
        colors: scrapeResult.data?.brand?.colors,
        logo: scrapeResult.data?.brand?.logo,
        cuisine: scrapeResult.data?.brand?.cuisine,
      };

      const design = buildTimelineDesign(enrichedScript, brand);
      console.log(`[Generation] Step ${timelineStepIndex + 1}: Timeline built, tracks:`, design.tracks?.length);
      updateStep(timelineStepIndex, "complete");

      setStatus("complete");
      console.log("[Generation] All steps complete, navigating to editor...");

      // Log the enriched script and design for debugging
      console.log("[Generation] Enriched Script:", JSON.stringify(enrichedScript, null, 2));
      console.log("[Generation] Timeline Design:", JSON.stringify(design, null, 2));

      // Save to debug file on server (for easier inspection)
      try {
        await fetch("/api/debug-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant: selectedRestaurant,
            scriptResult,
            enrichedScript,
            brand,
            design,
            timestamp: new Date().toISOString(),
          }),
        });
        console.log("[Generation] Debug data saved to file");
      } catch (debugErr) {
        console.warn("[Generation] Failed to save debug data:", debugErr);
      }

      // Store the generated design and media in sessionStorage
      sessionStorage.setItem("generatedDesign", JSON.stringify(design));
      sessionStorage.setItem("generatedBrand", JSON.stringify(brand));
      sessionStorage.setItem("generatedScript", JSON.stringify(enrichedScript));

      // Navigate to editor
      router.push("/edit");
    } catch (err) {
      console.error("[Generation] Error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "An error occurred");
      // Use callback form to get current steps
      setSteps((currentSteps) => {
        const activeIndex = currentSteps.findIndex((s) => s.status === "active");
        if (activeIndex >= 0) {
          return currentSteps.map((step, i) =>
            i === activeIndex ? { ...step, status: "error" as const } : step
          );
        }
        return currentSteps;
      });
    }
  };

  const selectedInfo = POC_RESTAURANTS.find((r) => r.id === selectedRestaurant);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Restaurant Ad Generator
          </h1>
          <p className="text-muted-foreground">
            Generate a video ad from any restaurant website
          </p>
        </div>

        {/* Restaurant Selector */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">
            Select a restaurant (POC)
          </label>
          <Select
            value={selectedRestaurant}
            onValueChange={setSelectedRestaurant}
            disabled={status === "generating"}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a restaurant..." />
            </SelectTrigger>
            <SelectContent>
              {POC_RESTAURANTS.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id}>
                  <div className="flex items-center gap-2">
                    <span>{restaurant.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({restaurant.cuisine})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selected Restaurant Info */}
          {selectedInfo && status === "idle" && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="font-medium">{selectedInfo.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedInfo.description}
              </p>
            </div>
          )}

          {/* Akool Animation Toggle - DISABLED to prevent accidental credit usage */}
          {status === "idle" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border opacity-50">
              <input
                type="checkbox"
                id="enableAkool"
                checked={false}
                disabled={true}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="enableAkool" className="flex-1">
                <span className="text-sm font-medium">Enable AI Animation (Disabled)</span>
                <p className="text-xs text-muted-foreground">
                  Akool API temporarily disabled to preserve credits
                </p>
              </label>
            </div>
          )}
        </div>

        {/* Generation Progress */}
        {status === "generating" && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium">Generating your ad...</p>
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    step.status === "complete"
                      ? "bg-green-500"
                      : step.status === "active"
                      ? "bg-blue-500 animate-pulse"
                      : step.status === "error"
                      ? "bg-red-500"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <span
                  className={`text-sm ${
                    step.status === "active"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {status === "error" && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerate}
          disabled={!selectedRestaurant || status === "generating"}
        >
          {status === "generating" ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            "Generate Ad"
          )}
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          POC Demo: Brand Data → Script + Scenes → Timeline → Editor
        </p>
      </div>
    </div>
  );
}
