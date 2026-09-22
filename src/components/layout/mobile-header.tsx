"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { ConnectionStatus } from "./connection-status";
import { Button } from "@/components/ui/button";

export function MobileHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF7F56] text-base font-bold text-[#0c0f13] shadow-md">
          C
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <ConnectionStatus />
        <Link href="/settings" asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
