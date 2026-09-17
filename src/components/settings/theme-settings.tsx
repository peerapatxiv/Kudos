"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only hydration flag
    setMounted(true);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Light, dark, or match your device.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={mounted && theme === opt.value ? "primary" : "outline"}
            size="sm"
            onClick={() => setTheme(opt.value)}
            className={cn("flex-1")}
          >
            {opt.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
