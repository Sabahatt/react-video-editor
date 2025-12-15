"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundEffects } from "@/components/landing/background-effects";
import { UrlInput } from "@/components/landing/url-input";
import { GenerationProgress, GenerationStep } from "@/components/landing/generation-progress";

const GENERATION_STEPS: GenerationStep[] = [
  { name: "Analyzing website...", status: "pending" },
  { name: "Extracting brand data...", status: "pending" },
  { name: "Generating AI script...", status: "pending" },
  { name: "Building video timeline...", status: "pending" },
  { name: "Finalizing your ad...", status: "pending" },
];

// URL pattern matching for POC restaurants
const getRestaurantFromUrl = (url: string): string | null => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("joespizza") || lowerUrl.includes("joes-pizza") || lowerUrl.includes("joe")) {
    return "joes-pizza";
  }
  if (lowerUrl.includes("doughnutvault") || lowerUrl.includes("doughnut-vault") || lowerUrl.includes("doughnut")) {
    return "doughnut-vault";
  }
  if (lowerUrl.includes("sweetgreen") || lowerUrl.includes("sweet")) {
    return "sweetgreen";
  }
  return null;
};

const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [error, setError] = useState<string>("");

  const updateStep = (index: number, status: GenerationStep["status"]) => {
    setSteps(prev =>
      prev.map((step, i) => (i === index ? { ...step, status } : step))
    );
  };

  const handleGenerate = async (url: string, options: Record<string, string>) => {
    const restaurant = getRestaurantFromUrl(url);

    if (!restaurant) {
      setError("Please enter a URL from one of our supported restaurants: Joe's Pizza, The Doughnut Vault, or Sweetgreen");
      return;
    }

    // Map style option to template
    const template = options.style === "classic" ? "template-2" : "template-1";

    setIsGenerating(true);
    setError("");
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: "pending" as const })));

    // Log selected options (for future use)
    console.log("[Generation] Options:", options);

    try {
      // Step 1: Analyzing website
      updateStep(0, "active");
      await simulateDelay(800);
      updateStep(0, "complete");

      // Step 2: Extracting brand data
      updateStep(1, "active");
      await simulateDelay(1200);
      updateStep(1, "complete");

      // Step 3: Generating AI script
      updateStep(2, "active");
      await simulateDelay(1500);
      updateStep(2, "complete");

      // Step 4: Building timeline (fetch the pre-made ad)
      updateStep(3, "active");
      await simulateDelay(800);

      const adRes = await fetch(`/api/poc-data/ads?restaurant=${restaurant}&template=${template}`);
      const adResult = await adRes.json();

      if (!adResult.success) {
        throw new Error(adResult.error || "Failed to load ad template");
      }

      updateStep(3, "complete");

      // Step 5: Finalizing
      updateStep(4, "active");
      await simulateDelay(500);
      updateStep(4, "complete");

      // Store the design in sessionStorage
      sessionStorage.setItem("generatedDesign", JSON.stringify(adResult.design));
      if (adResult.brand) {
        sessionStorage.setItem("generatedBrand", JSON.stringify(adResult.brand));
      }

      // Small delay before navigation for visual feedback
      await simulateDelay(300);
      router.push("/edit");
    } catch (err) {
      console.error("[Generation] Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setSteps(currentSteps => {
        const activeIndex = currentSteps.findIndex(s => s.status === "active");
        if (activeIndex >= 0) {
          return currentSteps.map((step, i) =>
            i === activeIndex ? { ...step, status: "error" as const } : step
          );
        }
        return currentSteps;
      });
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setIsGenerating(false);
    setError("");
    setSteps(GENERATION_STEPS.map(s => ({ ...s, status: "pending" as const })));
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <BackgroundEffects />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-7xl font-bold tracking-tight uppercase">
              <span className="bg-gradient-to-r from-[#00d8d6] to-[#8b5cf6] bg-clip-text text-transparent">
                Adify
              </span>
            </h1>
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#fafafa] mb-4 leading-tight"
          >
            Turn any website into a
            <br />
            <span className="bg-gradient-to-r from-[#00d8d6] via-[#8b5cf6] to-[#00d8d6] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              stunning video ad
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-[#71717a] max-w-xl mx-auto"
          >
            AI-powered video generation at your fingertips.
          </motion.p>
        </motion.div>

        {/* Main Input / Progress Area */}
        <AnimatePresence mode="wait">
          {!isGenerating ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <UrlInput
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />

              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center"
                >
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={handleReset}
                    className="mt-2 text-sm text-white/50 hover:text-[#00d8d6] underline underline-offset-4 transition-colors"
                  >
                    Try again
                  </button>
                </motion.div>
              )}

              {/* Hint text */}
              {/* <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-sm text-[#52525b] mt-6"
              >
                Try: joespizza.com, doughnutvault.com, or sweetgreen.com
              </motion.p> */}
            </motion.div>
          ) : (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GenerationProgress steps={steps} error={error} />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-center"
                >
                  <button
                    onClick={handleReset}
                    className="text-sm text-white/50 hover:text-[#00d8d6] underline underline-offset-4 transition-colors"
                  >
                    Try again
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
