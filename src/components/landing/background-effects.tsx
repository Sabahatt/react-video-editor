"use client";

import { motion } from "framer-motion";

export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base warm dark gradient */}
      <div className="absolute inset-0 bg-[#0d0907]" />

      {/* Radial gradient overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(39, 30, 25, 1) 0%, rgba(24, 18, 15, 1) 70%)",
        }}
      />

      {/* Large ambient orbs - using CSS for performance */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full animate-float-slow"
        style={{
          top: "-20%",
          left: "-10%",
          background: "radial-gradient(circle, rgba(251, 146, 60, 0.25) 0%, rgba(251, 146, 60, 0.1) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div
        className="absolute w-[900px] h-[900px] rounded-full animate-float-slower"
        style={{
          top: "30%",
          right: "-20%",
          background: "radial-gradient(circle, rgba(244, 114, 182, 0.3) 0%, rgba(244, 114, 182, 0.13) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-float-medium"
        style={{
          bottom: "-10%",
          left: "20%",
          background: "radial-gradient(circle, rgba(251, 146, 60, 0.12) 0%, rgba(251, 146, 60, 0.04) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Sweeping light beams */}
      <motion.div
        className="absolute w-[2px] h-[200%] origin-top"
        style={{
          top: "-50%",
          left: "30%",
          background: "linear-gradient(to bottom, transparent, rgba(251,146,60,0.3), rgba(244,114,182,0.3), transparent)",
          filter: "blur(4px)",
        }}
        animate={{
          rotate: [0, 15, -15, 0],
          x: [0, 100, -100, 0],
          opacity: [0.3, 0.6, 0.4, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-[3px] h-[200%] origin-top"
        style={{
          top: "-50%",
          right: "25%",
          background: "linear-gradient(to bottom, transparent, rgba(244,114,182,0.25), rgba(251,146,60,0.25), transparent)",
          filter: "blur(6px)",
        }}
        animate={{
          rotate: [0, -20, 20, 0],
          x: [0, -80, 80, 0],
          opacity: [0.2, 0.5, 0.3, 0.2],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Central glow pulse */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full animate-pulse-slow"
        style={{
          background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      {/* Floating particles - reduced count for performance */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
          }}
          animate={{
            opacity: [0.6, 0.4, 0.2],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Animated gradient line at the bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(251,146,60,0.5), rgba(244,114,182,0.5), transparent)",
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
