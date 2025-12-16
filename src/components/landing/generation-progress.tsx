"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GenerationStep {
  name: string;
  status: "pending" | "active" | "complete" | "error";
}

interface GenerationProgressProps {
  steps: GenerationStep[];
  error?: string;
}

export function GenerationProgress({ steps, error }: GenerationProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Outer glow */}
      <div className="relative">
        <motion.div
          className="absolute -inset-1 rounded-2xl blur-xl"
          style={{
            background: "linear-gradient(90deg, rgba(251,146,60,0.2), rgba(244,114,182,0.2))",
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main container - glassmorphism */}
        <div
          className={cn(
            "relative p-6 rounded-2xl",
            "bg-white/[0.03] backdrop-blur-xl",
            "border border-white/[0.08]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          )}
        >
          {/* Inner highlight line at top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <motion.div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#f472b6] flex items-center justify-center"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(251, 146, 60, 0.3)",
                      "0 0 40px rgba(244, 114, 182, 0.4)",
                      "0 0 20px rgba(251, 146, 60, 0.3)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Creating your video ad
                </h3>
                <p className="text-sm text-white/40">
                  This usually takes a few seconds
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    {/* Status indicator */}
                    <div className="relative flex-shrink-0">
                      {step.status === "complete" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-7 h-7 rounded-full bg-[#fb923c]/20 border border-[#fb923c]/30 flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-[#fb923c]" />
                        </motion.div>
                      )}
                      {step.status === "active" && (
                        <motion.div
                          animate={{
                            boxShadow: [
                              "0 0 0 0 rgba(244, 114, 182, 0.4)",
                              "0 0 0 10px rgba(244, 114, 182, 0)",
                            ],
                          }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="w-7 h-7 rounded-full bg-gradient-to-r from-[#fb923c] to-[#f472b6] flex items-center justify-center"
                        >
                          <motion.div
                            animate={{ scale: [1, 0.8, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-white"
                          />
                        </motion.div>
                      )}
                      {step.status === "pending" && (
                        <div className="w-7 h-7 rounded-full border border-white/10 bg-white/[0.02]" />
                      )}
                      {step.status === "error" && (
                        <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                      )}
                    </div>

                    {/* Step name */}
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        step.status === "complete" && "text-[#fb923c]",
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
                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
