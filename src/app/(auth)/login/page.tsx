import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-a-race text-lg font-bold text-a-race-foreground">
            C
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Cockpit</h1>
          <p className="text-sm text-muted">
            Training toward the Amazing Thailand Half Marathon, then a recovery-effort full in Singapore.
          </p>
        </div>

        {isSupabaseConfigured ? <AuthForm /> : <SupabaseNotConfigured />}
      </div>
    </div>
  );
}
