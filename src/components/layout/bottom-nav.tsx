"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch rounded-3xl border border-white/10 bg-gradient-to-b from-surface/60 to-surface/40 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl shadow-black/40 mx-2 mb-2 gap-1 p-1.5"
      aria-label="Primary"
    >
      {MOBILE_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-semibold transition-all duration-300",
              active
                ? "text-white bg-gradient-to-br from-a-race/80 to-a-race/60 shadow-lg shadow-a-race/30"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50",
            )}
          >
            <Icon className={cn("h-6 w-6 transition-all duration-300", active && "drop-shadow-lg")} strokeWidth={active ? 2.5 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
