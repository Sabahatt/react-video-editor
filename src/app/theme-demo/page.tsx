"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Scissors,
  Type,
  Image,
  Layers,
  Sparkles,
  Settings,
  Download,
  Share2,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Eye,
  Zap,
  Film,
  Music,
  Wand2,
  Check
} from "lucide-react";

// Theme definitions with distinctive aesthetics
const themes = {
  // Current theme (for reference)
  current: {
    name: "Current (Teal Glow)",
    description: "Your existing teal & purple glassmorphism theme",
    aesthetic: "Glassmorphism / Tech",
    vars: {
      "--background": "#030303",
      "--foreground": "#fafafa",
      "--card": "#0a0a0a",
      "--card-foreground": "#fafafa",
      "--primary": "#00d8d6",
      "--primary-foreground": "#030303",
      "--secondary": "#18181b",
      "--secondary-foreground": "#fafafa",
      "--muted": "#0a0a0a",
      "--muted-foreground": "#71717a",
      "--accent": "#8b5cf6",
      "--accent-foreground": "#fafafa",
      "--border": "#27272a",
      "--ring": "#00d8d6",
    },
    gradient: "linear-gradient(135deg, #00d8d6 0%, #8b5cf6 100%)",
    glowColor: "rgba(0, 216, 214, 0.3)",
  },

  // Theme 1: Midnight Amber - Editorial luxury
  midnightAmber: {
    name: "Midnight Amber",
    description: "Warm amber accents on deep charcoal. Editorial, luxurious, timeless.",
    aesthetic: "Editorial / Luxury",
    vars: {
      "--background": "#0c0a09",
      "--foreground": "#faf7f5",
      "--card": "#1c1917",
      "--card-foreground": "#faf7f5",
      "--primary": "#f59e0b",
      "--primary-foreground": "#0c0a09",
      "--secondary": "#292524",
      "--secondary-foreground": "#faf7f5",
      "--muted": "#1c1917",
      "--muted-foreground": "#a8a29e",
      "--accent": "#dc2626",
      "--accent-foreground": "#faf7f5",
      "--border": "#44403c",
      "--ring": "#f59e0b",
    },
    gradient: "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)",
    glowColor: "rgba(245, 158, 11, 0.25)",
  },

  // Theme 2: Neon Brutalist - Bold and edgy
  neonBrutalist: {
    name: "Neon Brutalist",
    description: "Electric lime on pure black. Bold, edgy, unapologetic.",
    aesthetic: "Brutalist / Cyberpunk",
    vars: {
      "--background": "#000000",
      "--foreground": "#ffffff",
      "--card": "#0a0a0a",
      "--card-foreground": "#ffffff",
      "--primary": "#a3e635",
      "--primary-foreground": "#000000",
      "--secondary": "#171717",
      "--secondary-foreground": "#ffffff",
      "--muted": "#0a0a0a",
      "--muted-foreground": "#737373",
      "--accent": "#f472b6",
      "--accent-foreground": "#000000",
      "--border": "#262626",
      "--ring": "#a3e635",
    },
    gradient: "linear-gradient(135deg, #a3e635 0%, #f472b6 100%)",
    glowColor: "rgba(163, 230, 53, 0.3)",
  },

  // Theme 3: Sunset Studio - Creative warmth
  sunsetStudio: {
    name: "Sunset Studio",
    description: "Coral and peach tones on warm dark. Creative, inviting, artistic.",
    aesthetic: "Creative / Artistic",
    vars: {
      "--background": "#18120f",
      "--foreground": "#fff7ed",
      "--card": "#271e19",
      "--card-foreground": "#fff7ed",
      "--primary": "#fb923c",
      "--primary-foreground": "#18120f",
      "--secondary": "#3d2f26",
      "--secondary-foreground": "#fff7ed",
      "--muted": "#271e19",
      "--muted-foreground": "#d6d3d1",
      "--accent": "#f472b6",
      "--accent-foreground": "#18120f",
      "--border": "#5c4a3d",
      "--ring": "#fb923c",
    },
    gradient: "linear-gradient(135deg, #fb923c 0%, #f472b6 100%)",
    glowColor: "rgba(251, 146, 60, 0.25)",
  },

  // Theme 4: Obsidian Rose - Elegant dark
  obsidianRose: {
    name: "Obsidian Rose",
    description: "Dusty rose accents on obsidian. Elegant, modern, refined.",
    aesthetic: "Elegant / Modern",
    vars: {
      "--background": "#09090b",
      "--foreground": "#fafafa",
      "--card": "#18181b",
      "--card-foreground": "#fafafa",
      "--primary": "#f43f5e",
      "--primary-foreground": "#fafafa",
      "--secondary": "#27272a",
      "--secondary-foreground": "#fafafa",
      "--muted": "#18181b",
      "--muted-foreground": "#a1a1aa",
      "--accent": "#fda4af",
      "--accent-foreground": "#09090b",
      "--border": "#3f3f46",
      "--ring": "#f43f5e",
    },
    gradient: "linear-gradient(135deg, #f43f5e 0%, #fda4af 100%)",
    glowColor: "rgba(244, 63, 94, 0.2)",
  },

  // NEW THEMES - More distinctive options

  // Theme 5: Void Chrome - Futuristic metallic
  voidChrome: {
    name: "Void Chrome",
    description: "Chrome silver on absolute black. Futuristic, premium, high-tech.",
    aesthetic: "Futuristic / Metallic",
    vars: {
      "--background": "#000000",
      "--foreground": "#e4e4e7",
      "--card": "#09090b",
      "--card-foreground": "#fafafa",
      "--primary": "#d4d4d8",
      "--primary-foreground": "#000000",
      "--secondary": "#18181b",
      "--secondary-foreground": "#e4e4e7",
      "--muted": "#0a0a0a",
      "--muted-foreground": "#71717a",
      "--accent": "#22d3ee",
      "--accent-foreground": "#000000",
      "--border": "#3f3f46",
      "--ring": "#d4d4d8",
    },
    gradient: "linear-gradient(135deg, #d4d4d8 0%, #22d3ee 100%)",
    glowColor: "rgba(212, 212, 216, 0.15)",
  },

  // Theme 6: Electric Indigo - Deep and vibrant
  electricIndigo: {
    name: "Electric Indigo",
    description: "Vibrant indigo with electric accents. Bold, modern, memorable.",
    aesthetic: "Modern / Vibrant",
    vars: {
      "--background": "#0a0014",
      "--foreground": "#f5f3ff",
      "--card": "#120026",
      "--card-foreground": "#f5f3ff",
      "--primary": "#818cf8",
      "--primary-foreground": "#0a0014",
      "--secondary": "#1e1038",
      "--secondary-foreground": "#f5f3ff",
      "--muted": "#120026",
      "--muted-foreground": "#a5b4fc",
      "--accent": "#e879f9",
      "--accent-foreground": "#0a0014",
      "--border": "#3730a3",
      "--ring": "#818cf8",
    },
    gradient: "linear-gradient(135deg, #818cf8 0%, #e879f9 100%)",
    glowColor: "rgba(129, 140, 248, 0.3)",
  },

  // Theme 7: Carbon Flame - Powerful and energetic
  carbonFlame: {
    name: "Carbon Flame",
    description: "Fiery orange on carbon black. Powerful, energetic, professional.",
    aesthetic: "Energetic / Pro",
    vars: {
      "--background": "#0a0a0a",
      "--foreground": "#fafafa",
      "--card": "#141414",
      "--card-foreground": "#fafafa",
      "--primary": "#f97316",
      "--primary-foreground": "#000000",
      "--secondary": "#1f1f1f",
      "--secondary-foreground": "#fafafa",
      "--muted": "#141414",
      "--muted-foreground": "#737373",
      "--accent": "#ef4444",
      "--accent-foreground": "#fafafa",
      "--border": "#2a2a2a",
      "--ring": "#f97316",
    },
    gradient: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
    glowColor: "rgba(249, 115, 22, 0.3)",
  },

  // Theme 8: Phantom Violet - Luxurious purple
  phantomViolet: {
    name: "Phantom Violet",
    description: "Deep violet monochrome. Luxurious, creative, distinctive.",
    aesthetic: "Luxury / Creative",
    vars: {
      "--background": "#0d0015",
      "--foreground": "#faf5ff",
      "--card": "#1a0a2e",
      "--card-foreground": "#faf5ff",
      "--primary": "#a855f7",
      "--primary-foreground": "#0d0015",
      "--secondary": "#2e1a47",
      "--secondary-foreground": "#faf5ff",
      "--muted": "#1a0a2e",
      "--muted-foreground": "#c4b5fd",
      "--accent": "#f0abfc",
      "--accent-foreground": "#0d0015",
      "--border": "#581c87",
      "--ring": "#a855f7",
    },
    gradient: "linear-gradient(135deg, #a855f7 0%, #f0abfc 100%)",
    glowColor: "rgba(168, 85, 247, 0.3)",
  },

  // Theme 9: Onyx Gold - Premium exclusive
  onyxGold: {
    name: "Onyx Gold",
    description: "Rich gold on deep black. Premium, exclusive, sophisticated.",
    aesthetic: "Premium / Exclusive",
    vars: {
      "--background": "#050505",
      "--foreground": "#fefce8",
      "--card": "#0f0f0f",
      "--card-foreground": "#fefce8",
      "--primary": "#eab308",
      "--primary-foreground": "#050505",
      "--secondary": "#1a1a1a",
      "--secondary-foreground": "#fefce8",
      "--muted": "#0f0f0f",
      "--muted-foreground": "#a3a3a3",
      "--accent": "#fde047",
      "--accent-foreground": "#050505",
      "--border": "#2a2a1a",
      "--ring": "#eab308",
    },
    gradient: "linear-gradient(135deg, #eab308 0%, #fde047 100%)",
    glowColor: "rgba(234, 179, 8, 0.25)",
  },

  // Theme 10: Digital Coral - Fresh and trendy
  digitalCoral: {
    name: "Digital Coral",
    description: "Vibrant coral on dark. Fresh, trendy, eye-catching.",
    aesthetic: "Trendy / Fresh",
    vars: {
      "--background": "#0c0a0a",
      "--foreground": "#fff1f2",
      "--card": "#1a1415",
      "--card-foreground": "#fff1f2",
      "--primary": "#fb7185",
      "--primary-foreground": "#0c0a0a",
      "--secondary": "#2d2224",
      "--secondary-foreground": "#fff1f2",
      "--muted": "#1a1415",
      "--muted-foreground": "#fda4af",
      "--accent": "#38bdf8",
      "--accent-foreground": "#0c0a0a",
      "--border": "#4a3638",
      "--ring": "#fb7185",
    },
    gradient: "linear-gradient(135deg, #fb7185 0%, #38bdf8 100%)",
    glowColor: "rgba(251, 113, 133, 0.25)",
  },

  // Theme 11: Slate Crimson - Bold professional
  slateCrimson: {
    name: "Slate Crimson",
    description: "Deep crimson on slate. Bold, professional, commanding.",
    aesthetic: "Bold / Professional",
    vars: {
      "--background": "#0f0f11",
      "--foreground": "#fafafa",
      "--card": "#18181c",
      "--card-foreground": "#fafafa",
      "--primary": "#dc2626",
      "--primary-foreground": "#fafafa",
      "--secondary": "#26262c",
      "--secondary-foreground": "#fafafa",
      "--muted": "#18181c",
      "--muted-foreground": "#9ca3af",
      "--accent": "#f87171",
      "--accent-foreground": "#0f0f11",
      "--border": "#374151",
      "--ring": "#dc2626",
    },
    gradient: "linear-gradient(135deg, #dc2626 0%, #f87171 100%)",
    glowColor: "rgba(220, 38, 38, 0.25)",
  },

  // Theme 12: Noir Cyan - Refined cyberpunk
  noirCyan: {
    name: "Noir Cyan",
    description: "Electric cyan on true black. Cyberpunk refined, striking.",
    aesthetic: "Cyberpunk / Refined",
    vars: {
      "--background": "#000000",
      "--foreground": "#ecfeff",
      "--card": "#0a0a0a",
      "--card-foreground": "#ecfeff",
      "--primary": "#06b6d4",
      "--primary-foreground": "#000000",
      "--secondary": "#151515",
      "--secondary-foreground": "#ecfeff",
      "--muted": "#0a0a0a",
      "--muted-foreground": "#67e8f9",
      "--accent": "#f472b6",
      "--accent-foreground": "#000000",
      "--border": "#1e3a3f",
      "--ring": "#06b6d4",
    },
    gradient: "linear-gradient(135deg, #06b6d4 0%, #f472b6 100%)",
    glowColor: "rgba(6, 182, 212, 0.3)",
  },

  // Theme 13: Midnight Matrix - Hacker aesthetic
  midnightMatrix: {
    name: "Midnight Matrix",
    description: "Matrix green on void. Techy, hacker aesthetic, memorable.",
    aesthetic: "Hacker / Tech",
    vars: {
      "--background": "#000a00",
      "--foreground": "#d1fae5",
      "--card": "#001500",
      "--card-foreground": "#d1fae5",
      "--primary": "#22c55e",
      "--primary-foreground": "#000a00",
      "--secondary": "#0a1f0a",
      "--secondary-foreground": "#d1fae5",
      "--muted": "#001500",
      "--muted-foreground": "#4ade80",
      "--accent": "#a3e635",
      "--accent-foreground": "#000a00",
      "--border": "#166534",
      "--ring": "#22c55e",
    },
    gradient: "linear-gradient(135deg, #22c55e 0%, #a3e635 100%)",
    glowColor: "rgba(34, 197, 94, 0.3)",
  },

  // Theme 14: Aurora Borealis - Magical gradient
  auroraBorealis: {
    name: "Aurora Borealis",
    description: "Multi-color aurora effect. Magical, unique, captivating.",
    aesthetic: "Magical / Unique",
    vars: {
      "--background": "#030712",
      "--foreground": "#f0fdf4",
      "--card": "#0c1222",
      "--card-foreground": "#f0fdf4",
      "--primary": "#2dd4bf",
      "--primary-foreground": "#030712",
      "--secondary": "#1e293b",
      "--secondary-foreground": "#f0fdf4",
      "--muted": "#0c1222",
      "--muted-foreground": "#94a3b8",
      "--accent": "#c084fc",
      "--accent-foreground": "#030712",
      "--border": "#1e3a5f",
      "--ring": "#2dd4bf",
    },
    gradient: "linear-gradient(135deg, #2dd4bf 0%, #818cf8 50%, #c084fc 100%)",
    glowColor: "rgba(45, 212, 191, 0.25)",
  },
};

type ThemeKey = keyof typeof themes;

// Mock timeline data
const timelineTracks = [
  { id: 1, name: "Video", type: "video", clips: [{ start: 0, width: 60 }, { start: 65, width: 35 }] },
  { id: 2, name: "Audio", type: "audio", clips: [{ start: 10, width: 80 }] },
  { id: 3, name: "Text", type: "text", clips: [{ start: 20, width: 25 }, { start: 50, width: 20 }] },
];

export default function ThemeDemo() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("current");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(35);

  const theme = themes[activeTheme];

  // Apply theme CSS variables
  const themeStyle = {
    ...theme.vars,
    "--gradient": theme.gradient,
    "--glow-color": theme.glowColor,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        ...themeStyle,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Header */}
      <header
        className="border-b px-6 py-4 backdrop-blur-xl transition-colors duration-500"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "color-mix(in srgb, var(--card) 80%, transparent)",
        }}
      >
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background: "var(--gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ADIFY
            </h1>
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Theme Preview
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
              }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{
                background: "var(--gradient)",
                color: "var(--primary-foreground)",
                boxShadow: `0 0 20px var(--glow-color)`,
              }}
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Theme Selector Sidebar */}
        <aside
          className="w-80 border-r p-6 min-h-[calc(100vh-73px)] overflow-y-auto transition-colors duration-500"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          <h2 className="text-lg font-semibold mb-2">Color Themes</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            Click a theme to preview it across the editor UI
          </p>

          <div className="space-y-3">
            {(Object.keys(themes) as ThemeKey[]).map((key) => {
              const t = themes[key];
              const isActive = key === activeTheme;
              return (
                <motion.button
                  key={key}
                  onClick={() => setActiveTheme(key)}
                  className="w-full text-left p-4 rounded-xl transition-all relative overflow-hidden"
                  style={{
                    backgroundColor: isActive ? "var(--secondary)" : "var(--muted)",
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: isActive ? "var(--primary)" : "var(--border)",
                    boxShadow: isActive ? `0 0 30px var(--glow-color)` : "none",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Color preview strip */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: t.gradient }}
                  />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold mb-1">{t.name}</div>
                      <div className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                        {t.aesthetic}
                      </div>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {t.description}
                      </p>
                    </div>
                    {isActive && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        <Check className="w-4 h-4" style={{ color: "var(--primary-foreground)" }} />
                      </div>
                    )}
                  </div>

                  {/* Color swatches */}
                  <div className="flex gap-1.5 mt-3">
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: t.vars["--primary"], borderColor: "var(--border)" }}
                      title="Primary"
                    />
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: t.vars["--accent"], borderColor: "var(--border)" }}
                      title="Accent"
                    />
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: t.vars["--background"], borderColor: "var(--border)" }}
                      title="Background"
                    />
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: t.vars["--card"], borderColor: "var(--border)" }}
                      title="Card"
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* Main Preview Area */}
        <main className="flex-1 p-6">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Editor Preview */}
            <div className="grid grid-cols-12 gap-4">
              {/* Left Tools Panel */}
              <div
                className="col-span-1 rounded-xl p-3 space-y-2 transition-colors duration-500"
                style={{
                  backgroundColor: "var(--card)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                }}
              >
                {[
                  { icon: Film, label: "Media" },
                  { icon: Type, label: "Text" },
                  { icon: Image, label: "Images" },
                  { icon: Music, label: "Audio" },
                  { icon: Layers, label: "Layers" },
                  { icon: Sparkles, label: "Effects" },
                  { icon: Wand2, label: "AI" },
                ].map((tool, i) => (
                  <motion.button
                    key={tool.label}
                    className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
                    style={{
                      backgroundColor: i === 0 ? "var(--primary)" : "transparent",
                      color: i === 0 ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}
                    whileHover={{
                      backgroundColor: i === 0 ? undefined : "var(--secondary)",
                      scale: 1.05,
                    }}
                  >
                    <tool.icon className="w-5 h-5" />
                    <span className="text-[10px]">{tool.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Video Preview Area */}
              <div
                className="col-span-8 rounded-xl overflow-hidden transition-colors duration-500"
                style={{
                  backgroundColor: "var(--card)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                }}
              >
                {/* Preview Canvas */}
                <div
                  className="aspect-video relative flex items-center justify-center"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  {/* Grid pattern background */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px),
                        linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* Sample content in preview */}
                  <div className="relative z-10 text-center">
                    <motion.div
                      className="text-4xl font-bold mb-2"
                      style={{
                        background: "var(--gradient)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Your Video Preview
                    </motion.div>
                    <div style={{ color: "var(--muted-foreground)" }}>
                      1920 x 1080 @ 30fps
                    </div>
                  </div>

                  {/* Floating element selection */}
                  <div
                    className="absolute top-8 left-8 px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: "var(--secondary)",
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderColor: "var(--primary)",
                      boxShadow: `0 0 15px var(--glow-color)`,
                    }}
                  >
                    <span className="text-sm font-medium">Text Layer</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div
                  className="p-4 border-t transition-colors duration-500"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <motion.button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-3 rounded-full transition-all"
                        style={{
                          background: "var(--gradient)",
                          color: "var(--primary-foreground)",
                          boxShadow: `0 0 20px var(--glow-color)`,
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </motion.button>
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--secondary)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: "var(--gradient)",
                          width: `${currentTime}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      <span>00:35</span>
                      <span>/</span>
                      <span>01:40</span>
                      <button className="p-2 rounded-lg hover:bg-[var(--secondary)] transition-colors">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Properties Panel */}
              <div
                className="col-span-3 rounded-xl p-4 space-y-4 transition-colors duration-500"
                style={{
                  backgroundColor: "var(--card)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Properties</h3>
                  <Settings className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                </div>

                {/* Property groups */}
                {["Transform", "Style", "Animation"].map((group, i) => (
                  <div
                    key={group}
                    className="rounded-lg overflow-hidden transition-colors duration-500"
                    style={{ backgroundColor: "var(--muted)" }}
                  >
                    <button
                      className="w-full px-3 py-2.5 flex items-center justify-between text-sm font-medium"
                      style={{
                        color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      {group}
                      <ChevronDown className={`w-4 h-4 transition-transform ${i === 0 ? "rotate-180" : ""}`} />
                    </button>

                    {i === 0 && (
                      <div className="px-3 pb-3 space-y-3">
                        {[
                          { label: "Position X", value: "960" },
                          { label: "Position Y", value: "540" },
                          { label: "Scale", value: "100%" },
                          { label: "Rotation", value: "0°" },
                        ].map((prop) => (
                          <div key={prop.label} className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                              {prop.label}
                            </span>
                            <input
                              type="text"
                              value={prop.value}
                              readOnly
                              className="w-20 px-2 py-1 rounded text-xs text-right transition-colors duration-500"
                              style={{
                                backgroundColor: "var(--secondary)",
                                color: "var(--foreground)",
                                borderWidth: 1,
                                borderStyle: "solid",
                                borderColor: "var(--border)",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Quick actions */}
                <div className="pt-2">
                  <div className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Quick Actions
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Copy, label: "Copy" },
                      { icon: Trash2, label: "Delete" },
                      { icon: Eye, label: "Hide" },
                    ].map((action) => (
                      <button
                        key={action.label}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all hover:scale-105"
                        style={{
                          backgroundColor: "var(--secondary)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div
              className="rounded-xl overflow-hidden transition-colors duration-500"
              style={{
                backgroundColor: "var(--card)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--border)",
              }}
            >
              {/* Timeline header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between transition-colors duration-500"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold">Timeline</h3>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded transition-colors"
                      style={{ backgroundColor: "var(--secondary)" }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 rounded transition-colors"
                      style={{ backgroundColor: "var(--secondary)" }}
                    >
                      <Scissors className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  <Zap className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span>AI Assist</span>
                </div>
              </div>

              {/* Timeline tracks */}
              <div className="p-4 space-y-2">
                {timelineTracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-3">
                    {/* Track label */}
                    <div
                      className="w-20 px-2 py-2 rounded text-xs font-medium text-center transition-colors duration-500"
                      style={{
                        backgroundColor: "var(--secondary)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {track.name}
                    </div>

                    {/* Track content */}
                    <div
                      className="flex-1 h-12 rounded-lg relative overflow-hidden transition-colors duration-500"
                      style={{ backgroundColor: "var(--muted)" }}
                    >
                      {/* Time markers */}
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-l transition-colors duration-500"
                            style={{ borderColor: "var(--border)" }}
                          />
                        ))}
                      </div>

                      {/* Clips */}
                      {track.clips.map((clip, i) => (
                        <motion.div
                          key={i}
                          className="absolute top-1 bottom-1 rounded-md transition-colors duration-500"
                          style={{
                            left: `${clip.start}%`,
                            width: `${clip.width}%`,
                            background: "var(--gradient)",
                            opacity: 0.9,
                          }}
                          whileHover={{ opacity: 1, scale: 1.02 }}
                        />
                      ))}

                      {/* Playhead */}
                      <motion.div
                        className="absolute top-0 bottom-0 w-0.5"
                        style={{
                          left: `${currentTime}%`,
                          backgroundColor: "var(--primary)",
                          boxShadow: `0 0 8px var(--glow-color)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UI Components Showcase */}
            <div
              className="rounded-xl p-6 transition-colors duration-500"
              style={{
                backgroundColor: "var(--card)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--border)",
              }}
            >
              <h3 className="font-semibold mb-4">UI Components</h3>

              <div className="grid grid-cols-4 gap-6">
                {/* Buttons */}
                <div className="space-y-3">
                  <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Buttons
                  </div>
                  <button
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                    style={{
                      background: "var(--gradient)",
                      color: "var(--primary-foreground)",
                      boxShadow: `0 0 15px var(--glow-color)`,
                    }}
                  >
                    Primary Action
                  </button>
                  <button
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: "var(--secondary)",
                      color: "var(--secondary-foreground)",
                    }}
                  >
                    Secondary
                  </button>
                  <button
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--primary)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--primary)",
                    }}
                  >
                    Outline
                  </button>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Inputs
                  </div>
                  <input
                    type="text"
                    placeholder="Text input..."
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors duration-500"
                    style={{
                      backgroundColor: "var(--secondary)",
                      color: "var(--foreground)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--border)",
                    }}
                  />
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-500"
                    style={{
                      backgroundColor: "var(--secondary)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--primary)",
                      boxShadow: `0 0 10px var(--glow-color)`,
                    }}
                  >
                    <span className="text-sm">Focused state</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="space-y-3">
                  <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Badges & Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Primary
                    </span>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground)",
                      }}
                    >
                      Accent
                    </span>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: "var(--secondary)",
                        color: "var(--secondary-foreground)",
                      }}
                    >
                      Neutral
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Progress
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "var(--gradient)" }}
                      animate={{ width: ["0%", "75%"] }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                      animate={{ width: ["0%", "45%"] }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
