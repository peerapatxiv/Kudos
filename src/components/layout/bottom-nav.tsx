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
      <div className="grid w-full px-1 py-1.5" style={{ gridTemplateColumns: `repeat(${MOBILE_NAV.length}, minmax(0, 1fr))` }}>
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-2 transition-colors duration-200",
                active
                  ? "text-a-race"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span aria-hidden className="absolute top-0 h-0.5 w-6 rounded-full bg-a-race" />
              )}
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 2} />
              <span className="w-full truncate text-center text-[11px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
