"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

type Theme = "light" | "dark" | "system";

export function ThemeSettings() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") || "system") as Theme;
    setThemeState(stored);
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Light, dark, or match your device.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={theme === opt.value ? "primary" : "outline"}
            size="lg"
            onClick={() => setTheme(opt.value)}
            className={cn("flex-1 h-10")}
          >
            {opt.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
