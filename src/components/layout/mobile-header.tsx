"use client";

import { ThemeToggle } from "./theme-toggle";
import { ConnectionStatus } from "./connection-status";

export function MobileHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-a-race text-[11px] font-bold text-a-race-foreground">
          C
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}
