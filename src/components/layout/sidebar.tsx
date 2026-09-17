"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { DESKTOP_NAV } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar({ displayName }: { displayName: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-a-race text-sm font-bold text-a-race-foreground">
          C
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Cockpit</p>
          <p className="text-xs text-muted leading-tight">{displayName ?? "Athlete"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
        {DESKTOP_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-a-race/10 text-a-race" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-4 py-4">
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
