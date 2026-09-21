"use client";

import { PHASE_COLORS, type PhaseColor } from "@/lib/training/phases";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

export function ColorPicker({
  value,
  onChange,
  label = "Phase color",
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  const colors: PhaseColor[] = ["rest", "easy", "tempo", "interval", "secondary-race", "recovery"];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-3">
        {colors.map((color) => {
          const isSelected = value === color;
          return (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                "relative h-10 w-10 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden group flex-shrink-0",
                PHASE_COLORS[color],
                isSelected
                  ? "border-foreground ring-2 ring-foreground/30 shadow-lg scale-110"
                  : "border-border/30 hover:border-border/60 hover:shadow-md hover:scale-105"
              )}
              title={color}
            >
              {isSelected && (
                <Check className="h-4 w-4 text-white drop-shadow-lg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
