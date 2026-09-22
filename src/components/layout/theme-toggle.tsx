"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Client-only mount flag so the icon matches the resolved theme instead
    // of mismatching during SSR hydration (next-themes' documented pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-10 w-10" />;

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="hover:bg-foreground/10"
    >
      {isDark ? (
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform" />
      ) : (
        <Moon className="h-5 w-5 rotate-0 scale-100 transition-transform" />
      )}
    </Button>
  );
}
