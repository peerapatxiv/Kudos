"use client";

import { useState, useEffect } from "react";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for minimum 800ms
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7F56] to-[#FF6B35] shadow-lg animate-bounce">
          <span className="text-2xl font-bold text-white">C</span>
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-foreground">Cockpit</p>
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-a-race/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-a-race/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-a-race/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
