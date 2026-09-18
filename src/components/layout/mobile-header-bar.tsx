"use client";

import { usePathname } from "next/navigation";
import { MobileHeader } from "./mobile-header";

const TITLES: [string, string][] = [
  ["/dashboard", "Cockpit"],
  ["/plan", "Training Plan"],
  ["/calendar", "Calendar"],
  ["/races/a-race", "A-Race"],
  ["/races/singapore", "Singapore Marathon"],
  ["/progress", "Progress"],
  ["/settings", "Settings"],
  ["/more", "More"],
];

export function MobileHeaderBar() {
  const pathname = usePathname();
  if (pathname === "/more") return null; // /more renders its own header
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return <MobileHeader title={match?.[1] ?? "Cockpit"} />;
}
