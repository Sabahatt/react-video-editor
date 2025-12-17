"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BackgroundEffects } from "@/components/landing/background-effects";
import { UrlInput } from "@/components/landing/url-input";
import { usePipelineStore } from "@/store/use-pipeline-store";

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

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { startPipeline, resetPipeline } = usePipelineStore();

  const handleGenerate = async (url: string, options: Record<string, string>) => {
    const restaurant = getRestaurantFromUrl(url);

    if (!restaurant) {
      setError("Please enter a URL from one of our supported restaurants: Joe's Pizza, The Doughnut Vault, or Sweetgreen");
      return;
    }

    setIsLoading(true);

    // Map style option to template
    const template = options.style === "classic" ? "template-2" : "template-1";

    // Log selected options (for future use)

    // Start the pipeline in the store (this will be picked up by the editor)
    startPipeline(url, restaurant, template, options);

    // Navigate to editor immediately - pipeline runs there
    router.push("/edit");
  };

  const handleReset = () => {
    setError("");
    setIsLoading(false);
    resetPipeline();
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
              <span className="bg-gradient-to-r from-[#fb923c] to-[#f472b6] bg-clip-text text-transparent">
                Adify
              </span>
            </h1>
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#fff7ed] mb-4 leading-tight"
          >
            Turn any website into a
            <br />
            <span className="bg-gradient-to-r from-[#fb923c] via-[#f472b6] to-[#fb923c] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              stunning video ad
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-[#fb923c] max-w-xl mx-auto"
          >
            AI-powered video generation at your fingertips.
          </motion.p>
        </motion.div>

        {/* Main Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <UrlInput
            onGenerate={handleGenerate}
            isGenerating={isLoading}
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
                className="mt-2 text-sm text-white/50 hover:text-[#fb923c] underline underline-offset-4 transition-colors"
              >
                Try again
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
