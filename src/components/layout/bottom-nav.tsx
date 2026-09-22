"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/30 bg-surface md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary navigation"
      role="navigation"
    >
      <div className="flex items-center justify-around px-2 py-3">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                active
                  ? "text-a-race"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-all duration-200",
                  active ? "fill-current" : "fill-transparent"
                )}
                strokeWidth={active ? 2.3 : 2}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
