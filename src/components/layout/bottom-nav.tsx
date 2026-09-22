"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch rounded-3xl border border-white/15 bg-gradient-to-b from-surface/70 via-surface/60 to-surface/50 backdrop-blur-3xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl shadow-black/50 mx-2 mb-2 gap-2 px-2 py-2"
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
              "flex flex-1 flex-col items-center justify-center py-3 px-3 rounded-2xl transition-all duration-300 ease-out relative",
              active
                ? "text-a-race border-2 border-a-race"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={item.label}
          >
            <Icon className={cn("h-6 w-6 transition-all duration-300")} strokeWidth={active ? 2.5 : 2} />
            {active && (
              <div className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-a-race"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
