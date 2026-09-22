"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-center rounded-t-2xl md:hidden"
      aria-label="Primary navigation"
      role="navigation"
    >
      {/* Background with blur effect */}
      <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-surface to-surface/90 backdrop-blur-3xl border-t border-white/10" />

      {/* Navigation container */}
      <div className="relative flex w-full max-w-2xl items-end justify-around px-4 py-3 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl",
                "transition-all duration-300 ease-out relative group",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/50",
                active
                  ? "text-a-race"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {/* Active background indicator */}
              {active && (
                <div className="absolute inset-0 rounded-2xl bg-a-race/8 -z-10" />
              )}

              {/* Icon */}
              <Icon
                className={cn(
                  "h-6 w-6 transition-all duration-300",
                  active ? "fill-current scale-110" : "fill-transparent group-hover:scale-105"
                )}
                strokeWidth={active ? 2.4 : 2}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
