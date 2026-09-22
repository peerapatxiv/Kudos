"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "./theme-toggle";
import { ConnectionStatus } from "./connection-status";

export function MobileHeader({ title }: { title: string }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Hide header when scrolling down, show when scrolling up
          if (currentScrollY > lastScrollY && currentScrollY > 50) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`sticky top-0 z-30 mx-2 mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF7F56] to-[#FF6B35] text-lg font-bold text-white shadow-md shadow-[#FF7F56]/30">
          C
        </div>
        <span className="text-base font-bold tracking-tight text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}
