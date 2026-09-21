import * as React from "react";
import { cn } from "@/lib/utils";

const inputStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator {
    display: none;
  }
  input[type="date"]::-webkit-outer-spin-button,
  input[type="date"]::-webkit-inner-spin-button {
    display: none;
  }
`;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <>
      <style>{inputStyles}</style>
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </>
  ),
);
Input.displayName = "Input";
