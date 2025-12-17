"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/store/use-pipeline-store";

interface PipelineProgressPanelProps {
  onRetry?: () => void;
}

export function PipelineProgressPanel({ onRetry }: PipelineProgressPanelProps) {
  const { isGenerating, isComplete, error, steps, dismissPanel } = usePipelineStore();

  // Don't render if not generating and not complete (and no error)
  if (!isGenerating && !isComplete && !error) {
    return null;
  }

  const handleClose = () => {
    // Use dismissPanel to hide the panel but keep brand/script data
    // This allows the images/videos search and AI voice to keep working
    dismissPanel();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="fixed right-6 bottom-6 z-[110] w-[320px]"
      >
        {/* Outer glow - balanced teal and purple */}
        <div className="relative">
          <motion.div
            className="absolute -inset-2 rounded-2xl blur-2xl"
            style={{
              background: isComplete
                ? "linear-gradient(135deg, rgba(251,146,60,0.25), rgba(244,114,182,0.2))"
                : error
                ? "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(244,114,182,0.15))"
                : "linear-gradient(135deg, rgba(244,114,182,0.3), rgba(251,146,60,0.2))",
            }}
            animate={{
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main panel - glassmorphism */}
          <div
            className={cn(
              "relative p-5 rounded-2xl",
              "bg-[#0a0a0a]/90 backdrop-blur-2xl",
              "border border-white/[0.08]",
              "shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            )}
          >
            {/* Inner highlight line at top */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f472b6]/30 to-transparent rounded-t-2xl" />

            {/* Close button - only show when complete or error */}
            {(isComplete || error) && (
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/[0.05] hover:bg-[#fb923c]/10 border border-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4 text-white/60 hover:text-[#fb923c]" />
              </button>
            )}

            {/* Content */}
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 pr-8">
                <div className="relative">
                  {isComplete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#f472b6] flex items-center justify-center"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : error ? (
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                  ) : (
                    <motion.div
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#f472b6] flex items-center justify-center"
                      animate={{
                        boxShadow: [
                          "0 0 20px rgba(251, 146, 60, 0.4)",
                          "0 0 25px rgba(244, 114, 182, 0.3)",
                          "0 0 20px rgba(251, 146, 60, 0.4)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">
                    {isComplete
                      ? "Video ready!"
                      : error
                      ? "Generation failed"
                      : "Creating your video"}
                  </h3>
                  <p className="text-xs text-white/40">
                    {isComplete
                      ? "Your editor is unlocked"
                      : error
                      ? "Something went wrong"
                      : "Please wait while we work our magic"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {!isComplete && !error && (
                <div className="relative h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#fb923c] via-[#f97316] to-[#f472b6] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${(steps.filter(s => s.status === "complete").length / steps.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  {/* Animated shimmer */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2.5 pt-1">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="flex items-center gap-3"
                  >
                    {/* Status indicator */}
                    <div className="relative flex-shrink-0">
                      {step.status === "complete" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-[#fb923c]/20 border border-[#fb923c]/40 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-[#fdba74]" />
                        </motion.div>
                      )}
                      {step.status === "active" && (
                        <motion.div
                          animate={{
                            boxShadow: [
                              "0 0 0 0 rgba(251, 146, 60, 0.5)",
                              "0 0 0 6px rgba(251, 146, 60, 0)",
                            ],
                          }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="w-5 h-5 rounded-full bg-gradient-to-r from-[#fb923c] to-[#f472b6] flex items-center justify-center"
                        >
                          <motion.div
                            animate={{ scale: [1, 0.7, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-white"
                          />
                        </motion.div>
                      )}
                      {step.status === "pending" && (
                        <div className="w-5 h-5 rounded-full border border-white/10 bg-white/[0.02]" />
                      )}
                      {step.status === "error" && (
                        <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                          <X className="w-3 h-3 text-red-400" />
                        </div>
                      )}
                    </div>

                    {/* Step name */}
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        step.status === "complete" && "text-[#fdba74]",
                        step.status === "active" && "text-white",
                        step.status === "pending" && "text-white/30",
                        step.status === "error" && "text-red-400"
                      )}
                    >
                      {step.name}
                    </span>

                    {/* Active loader */}
                    {step.status === "active" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="ml-auto"
                      >
                        <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <p className="text-xs text-red-400">{error}</p>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="mt-2 text-xs text-white/50 hover:text-[#fb923c] underline underline-offset-2 transition-colors"
                    >
                      Return to homepage
                    </button>
                  )}
                </motion.div>
              )}

              {/* Success message */}
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-[#fb923c]/10 border border-[#fb923c]/20"
                >
                  <p className="text-xs text-[#fdba74]">
                    Your video is loaded and ready to edit!
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
