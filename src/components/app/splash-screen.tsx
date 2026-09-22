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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-surface via-surface to-surface/95 transition-opacity duration-300 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo Container */}
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF7F56]/40 to-[#FF6B35]/40 blur-2xl" />

          {/* Logo */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F56] to-[#FF6B35] shadow-2xl shadow-[#FF7F56]/40 animate-pulse">
            <span className="text-4xl font-bold text-white">C</span>
          </div>
        </div>

        {/* Text Section */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cockpit</h1>
          <p className="text-xs font-medium text-muted-foreground">Training & Performance</p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full bg-a-race/80 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-a-race/60 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-a-race/40 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
