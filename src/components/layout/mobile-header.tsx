"use client";

import { ThemeToggle } from "./theme-toggle";
import { ConnectionStatus } from "./connection-status";

export function MobileHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-gradient-to-b from-surface to-surface/80 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md md:hidden shadow-sm">
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
