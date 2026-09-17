import { getCurrentUser, getProfile } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { ProfileForm } from "@/components/settings/profile-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { signOut } from "@/lib/auth/actions";

export default async function SettingsPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;

  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
      </div>

      <ProfileForm initialName={profile?.display_name ?? null} email={user?.email ?? ""} />
      <ThemeSettings />
      <NotificationSettings />

      <form action={signOut} className="md:hidden">
        <button
          type="submit"
          className="w-full rounded-md border border-border py-3 text-sm font-medium text-danger hover:bg-danger/5"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
