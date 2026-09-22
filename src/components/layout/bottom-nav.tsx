"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed left-2 right-2 bottom-2 z-40 flex items-stretch justify-center rounded-3xl border border-white/15 bg-gradient-to-b from-surface/70 via-surface/60 to-surface/50 backdrop-blur-3xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl shadow-black/50 gap-1 px-2 py-2"
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
              "flex flex-1 flex-col items-center justify-center py-3 px-3 rounded-xl transition-all duration-300 ease-out",
              active
                ? "text-a-race border-2 border-a-race"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={item.label}
          >
            <Icon className={cn("h-6 w-6 transition-all duration-300")} strokeWidth={active ? 2.5 : 2} />
          </Link>
        );
      })}
    </nav>
  );
}
