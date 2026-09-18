import { getCurrentUser } from "@/lib/training/queries";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-a-race text-lg font-bold text-a-race-foreground">
            C
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted">Choose a new password for your Cockpit account.</p>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <p className="text-center text-sm text-danger">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        )}
      </div>
    </div>
  );
}
