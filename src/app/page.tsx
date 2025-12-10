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
  const [steps, setSteps] = useState<GenerationStep[]>([
    { name: "Loading brand data", status: "pending" },
    { name: "Generating script & scenes", status: "pending" },
    { name: "Building timeline", status: "pending" },
  ]);

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

    console.log("[Generation] Starting POC demo for:", restaurantConfig.name);
    setStatus("generating");
    setError("");
    setSteps((prev) => prev.map((step) => ({ ...step, status: "pending" })));

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
      if (!scrapeResult.success) {
        throw new Error(`Failed to load brand data: ${scrapeResult.error}`);
      }
      updateStep(0, "complete");

      // Step 2: Generate Script (v3 - includes scene planning, image selection, akool prompts)
      console.log("[Generation] Step 2: Generating script with scenes...");
      updateStep(1, "active");
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
          images: scrapeResult.data?.images || [],
        }),
      });
      const scriptResult = await scriptRes.json();
      console.log("[Generation] Step 2: Script generated, success:", scriptResult.success);
      console.log("[Generation] Scene plan:", scriptResult.scenePlan);
      if (!scriptResult.success) {
        throw new Error(`Script generation failed: ${scriptResult.error}`);
      }
      updateStep(1, "complete");

      // Step 3: Build Timeline
      console.log("[Generation] Step 3: Building timeline...");
      updateStep(2, "active");
      const { buildTimelineDesign } = await import("@/lib/timeline-builder");

      // Transform script result to format expected by timeline builder
      const enrichedScript = {
        fullScript: scriptResult.fullScript,
        scenes: scriptResult.scenes.map((scene: {
          sceneId: string;
          voiceoverText: string;
          displayText: string;
          duration: number;
          visualMode: string;
          kenBurnsDirection?: string;
          selectedImage: { url: string; alt: string; foodType?: string } | null;
          akoolConfig?: { prompt: string } | null;
        }) => ({
          id: scene.sceneId,
          voiceoverText: scene.voiceoverText,
          displayText: scene.displayText,
          duration: scene.duration,
          visualMode: scene.visualMode,
          kenBurnsDirection: scene.kenBurnsDirection,
          visual: scene.selectedImage ? {
            type: scene.visualMode === 'animated' ? 'animated_image' : 'static_image',
            url: scene.selectedImage.url,
            alt: scene.selectedImage.alt,
            prompt: scene.akoolConfig?.prompt,
          } : {
            type: 'logo_brand',
            url: scrapeResult.data?.brand?.logo || null,
            alt: restaurantConfig.name,
          },
          foodType: scene.selectedImage?.foodType,
        })),
        tone: scriptResult.tone,
        totalDuration: scriptResult.totalDuration,
      };

      const brand = {
        name: restaurantConfig.name,
        colors: scrapeResult.data?.brand?.colors,
        logo: scrapeResult.data?.brand?.logo,
        cuisine: scrapeResult.data?.brand?.cuisine,
      };

      const design = buildTimelineDesign(enrichedScript, brand);
      console.log("[Generation] Step 3: Timeline built, tracks:", design.tracks?.length);
      updateStep(2, "complete");

      setStatus("complete");
      console.log("[Generation] All steps complete, navigating to editor...");

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
