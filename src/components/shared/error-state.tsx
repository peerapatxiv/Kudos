"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-danger/5 p-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message ? <p className="text-xs text-muted max-w-xs">{message}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/** Shown app-wide whenever NEXT_PUBLIC_SUPABASE_URL / ANON_KEY aren't set. */
export function SupabaseNotConfigured() {
  return (
    <ErrorState
      title="Supabase is not configured"
      message="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example), then restart the dev server."
    />
  );
}
