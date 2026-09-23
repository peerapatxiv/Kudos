import { getCurrentUser, getLatestBodyMetric, getProfile } from "@/lib/training/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SupabaseNotConfigured } from "@/components/shared/error-state";
import { ProfileForm } from "@/components/settings/profile-form";
import { BodyMetricsForm } from "@/components/settings/body-metrics-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { signOut } from "@/lib/auth/actions";
export default async function SettingsPage() {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;
  const [user, profile, latestBodyMetric] = await Promise.all([
    getCurrentUser(),
    getProfile(),
    getLatestBodyMetric(),
  ]);
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in-up px-3 sm:px-4 md:px-8 py-4 sm:py-5 md:py-8 pb-32 sm:pb-24 md:pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
      </div>
      <ProfileForm
        initialName={profile?.display_name ?? null}
        email={user?.email ?? ""}
      />
      <BodyMetricsForm latest={latestBodyMetric} initialHeightCm={profile?.height_cm ?? null} />
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
