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
      <div className="grid grid-cols-3 gap-3">
        {colors.map((color) => {
          const isSelected = value === color;
          return (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                "relative h-14 rounded-lg border-2 transition-all flex flex-col items-center justify-center font-medium text-xs overflow-hidden group",
                PHASE_COLORS[color],
                isSelected
                  ? "border-foreground ring-2 ring-foreground/30 shadow-lg"
                  : "border-border/30 hover:border-border/60 hover:shadow-md"
              )}
              title={color}
            >
              <span className="capitalize">{color}</span>
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <Check className="h-4 w-4 text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
