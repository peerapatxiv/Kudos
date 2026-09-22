"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-40 flex items-end justify-center rounded-t-3xl border-t border-white/8 bg-gradient-to-t from-surface/98 via-surface/95 to-surface/90 backdrop-blur-3xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl shadow-black/25 px-4 py-4"
      aria-label="Primary navigation"
      role="navigation"
    >
      <div className="flex w-full max-w-lg items-end justify-around gap-2">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 ease-out relative group",
                "hover:bg-white/5 active:scale-95",
                active ? "text-a-race" : "text-foreground/60 hover:text-foreground/80"
              )}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-all duration-300",
                  active ? "fill-current scale-105" : "fill-transparent group-hover:scale-110"
                )}
                strokeWidth={active ? 2.3 : 2.1}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
