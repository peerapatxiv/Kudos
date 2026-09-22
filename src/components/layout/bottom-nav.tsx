"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch rounded-3xl border border-white/10 bg-gradient-to-b from-surface/60 to-surface/40 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl shadow-black/40 mx-2 mb-2"
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
              "flex flex-1 flex-col items-center gap-1 py-2.5 px-1 text-xs font-medium transition-all",
              active ? "text-a-race" : "text-muted hover:text-muted/80",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "fill-a-race/10")} strokeWidth={active ? 2.3 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
