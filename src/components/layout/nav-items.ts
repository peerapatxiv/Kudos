import type { LucideIcon } from "lucide-react";
import { Calendar, Gauge, LayoutDashboard, Settings, TrendingUp } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: Gauge },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const DESKTOP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Training Plan", icon: Gauge },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MORE_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];
