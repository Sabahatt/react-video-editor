"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Color Palette:
 * --accent-teal: #00d8d6
 * --accent-purple: #8b5cf6
 * --accent-blue: #3b82f6
 * --text-primary: #fafafa
 * --text-muted: white/50
 * --bg-glass: white/[0.03]
 * --border-glass: white/[0.08]
 */

interface Option {
  id: string;
  name: string;
}

interface DropdownConfig {
  id: string;
  label: string;
  options: Option[];
}

const DROPDOWN_OPTIONS: DropdownConfig[] = [
  {
    id: "style",
    label: "Style",
    options: [
      { id: "dynamic", name: "Dynamic" },
      { id: "classic", name: "Classic" },
      { id: "minimal", name: "Minimal" },
      { id: "bold", name: "Bold" },
    ],
  },
  {
    id: "voice",
    label: "Voice",
    options: [
      { id: "male", name: "Male" },
      { id: "female", name: "Female" },
      { id: "neutral", name: "Neutral" },
    ],
  },
  {
    id: "mode",
    label: "Mode",
    options: [
      { id: "professional", name: "Professional" },
      { id: "casual", name: "Casual" },
      { id: "energetic", name: "Energetic" },
      { id: "luxurious", name: "Luxurious" },
    ],
  },
  {
    id: "tone",
    label: "Tone",
    options: [
      { id: "friendly", name: "Friendly" },
      { id: "playful", name: "Playful" },
      { id: "confident", name: "Confident" },
      { id: "warm", name: "Warm" },
    ],
  },
  {
    id: "duration",
    label: "Duration",
    options: [
      { id: "10s", name: "10s" },
      { id: "15s", name: "15s" },
      { id: "30s", name: "30s" },
    ],
  },
  {
    id: "ratio",
    label: "Ratio",
    options: [
      { id: "9:16", name: "9:16" },
      { id: "16:9", name: "16:9" },
      { id: "1:1", name: "1:1" },
    ],
  },
];

interface UrlInputProps {
  onGenerate: (url: string, options: Record<string, string>) => void;
  isGenerating: boolean;
}

function OptionDropdown({
  config,
  value,
  onChange,
  disabled,
}: {
  config: DropdownConfig;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = config.options.find((o) => o.id === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
          "text-xs transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen
            ? "text-[#00d8d6] bg-[#00d8d6]/10"
            : "text-white/50 hover:text-[#00d8d6] hover:bg-[#00d8d6]/5"
        )}
      >
        <span className="text-white/30">{config.label}:</span>
        <span className="whitespace-nowrap">{selectedOption?.name}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30",
              "min-w-[100px] p-1 rounded-xl",
              "bg-[#0a0a0a]/95 backdrop-blur-xl",
              "border border-[#00d8d6]/20",
              "shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(0,216,214,0.1)]"
            )}
          >
            {config.options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-xs rounded-lg",
                  "transition-all duration-150",
                  value === option.id
                    ? "bg-[#00d8d6]/15 text-[#00d8d6]"
                    : "text-white/60 hover:bg-[#00d8d6]/10 hover:text-[#00d8d6]"
                )}
              >
                {option.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function UrlInput({ onGenerate, isGenerating }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    DROPDOWN_OPTIONS.forEach((config) => {
      initial[config.id] = config.options[0].id;
    });
    return initial;
  });

  const handleSubmit = () => {
    if (url.trim() && !isGenerating) {
      onGenerate(url.trim(), options);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const updateOption = (id: string, value: string) => {
    setOptions((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Outer glow container */}
      <div className="relative group">
        {/* Animated glow behind the input - subtle */}
        <motion.div
          className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-lg"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,216,214,0.12), rgba(139,92,246,0.12), rgba(0,216,214,0.12))",
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Main input container - glassmorphism */}
        <div
          className={cn(
            "relative flex flex-col gap-3 p-3 rounded-2xl",
            "bg-white/[0.03] backdrop-blur-xl",
            "border border-white/[0.08]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            "transition-all duration-300",
            isFocused && "border-[#00d8d6]/30 bg-white/[0.05]"
          )}
        >
          {/* Inner highlight line at top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Top row: URL Input + Generate Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center flex-1 gap-3 pl-2">
              <Globe
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors duration-200",
                  isFocused ? "text-[#00d8d6]" : "text-white/40"
                )}
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter website URL..."
                disabled={isGenerating}
                className={cn(
                  "flex-1 bg-transparent text-white placeholder:text-white/30",
                  "text-base outline-none border-none",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={handleSubmit}
              disabled={!url.trim() || isGenerating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "font-medium text-sm text-white",
                "bg-gradient-to-r from-[#00d8d6] to-[#8b5cf6]",
                "shadow-lg shadow-[#8b5cf6]/20",
                "transition-all duration-300",
                "hover:shadow-[0_0_25px_rgba(0,216,214,0.3)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:scale-100"
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="relative">
                {isGenerating ? "Generating..." : "Generate"}
              </span>
            </motion.button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Bottom row: Options */}
          <div className="flex items-center gap-1 flex-wrap">
            {DROPDOWN_OPTIONS.map((config) => (
              <OptionDropdown
                key={config.id}
                config={config}
                value={options[config.id]}
                onChange={(value) => updateOption(config.id, value)}
                disabled={isGenerating}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
