"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-40 flex items-end justify-center rounded-t-3xl border-t border-border/40 bg-gradient-to-t from-surface/95 to-surface/90 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl shadow-black/20 px-4 py-3 gap-0"
      aria-label="Primary navigation"
      role="navigation"
    >
      <div className="flex w-full max-w-md items-end justify-around gap-1">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 px-3 rounded-xl transition-all duration-250 ease-out relative",
                "hover:bg-surface-2/40 active:scale-95",
                active && "text-a-race"
              )}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-all duration-250",
                  active ? "fill-current" : "fill-transparent"
                )}
                strokeWidth={active ? 2.2 : 2}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
