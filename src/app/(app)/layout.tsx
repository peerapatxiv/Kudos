import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeaderBar } from "@/components/layout/mobile-header-bar";
import { OfflineQueueSync } from "@/components/layout/offline-queue-sync";
import { getProfile } from "@/lib/training/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar displayName={profile?.display_name ?? null} />
      <div className="md:pl-64">
        <MobileHeaderBar />
        <main className="mx-auto max-w-6xl px-3 py-4 pb-32 sm:px-4 md:px-8 md:py-8 md:pb-12">{children}</main>
      </div>
      <BottomNav />
      <OfflineQueueSync />
    </div>
  );
}
