"use client";

import { PHASE_COLORS, type PhaseColor } from "@/lib/training/phases";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              "h-12 rounded-lg border-2 border-border/50 transition-all flex items-center justify-center font-medium text-xs",
              PHASE_COLORS[color],
              value === color && "border-foreground ring-2 ring-foreground/20"
            )}
            title={color}
          >
            {color}
          </button>
        ))}
      </div>
    </div>
  );
}
