import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-muted",
        "a-race": "bg-a-race text-a-race-foreground",
        secondary: "bg-secondary-race text-secondary-race-foreground",
        "tune-up": "bg-tune-up text-white",
        "other-race": "bg-other-race text-other-race-foreground",
        easy: "bg-easy/15 text-easy",
        tempo: "bg-tempo/15 text-tempo",
        interval: "bg-interval/15 text-interval",
        long_run: "bg-long-run/15 text-long-run",
        rest: "bg-rest/15 text-rest",
        recovery: "bg-recovery/15 text-recovery",
        race: "bg-race/15 text-race",
        completed: "bg-completed/15 text-completed",
        skipped: "bg-skipped/15 text-skipped",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
