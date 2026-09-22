"use client";

import { useState, useEffect } from "react";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show splash screen for minimum 1000ms
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-surface via-surface to-surface-2 transition-opacity duration-300 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo Container */}
        <div className="relative">
          {/* Outer glow - larger and more prominent */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#FF7F56]/50 to-[#FF6B35]/30 blur-3xl scale-150" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#FF7F56]/20 to-[#FF6B35]/10 blur-xl scale-125 animate-pulse" style={{ animationDuration: "3s" }} />

          {/* Logo */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F56] to-[#FF6B35] shadow-2xl shadow-[#FF7F56]/50">
            <span className="text-4xl font-bold text-white">C</span>
          </div>
        </div>

        {/* Loading Indicator - refined */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <div
              className="h-2 w-2 rounded-full bg-a-race/80"
              style={{
                animation: "bounce 1.4s infinite",
                animationDelay: "0ms",
              }}
            />
            <div
              className="h-2 w-2 rounded-full bg-a-race/60"
              style={{
                animation: "bounce 1.4s infinite",
                animationDelay: "200ms",
              }}
            />
            <div
              className="h-2 w-2 rounded-full bg-a-race/40"
              style={{
                animation: "bounce 1.4s infinite",
                animationDelay: "400ms",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
