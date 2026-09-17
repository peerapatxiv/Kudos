import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { MORE_NAV } from "@/components/layout/nav-items";
import { Card } from "@/components/ui/card";
import { MobileHeader } from "@/components/layout/mobile-header";

export default function MorePage() {
  return (
    <div className="space-y-6 md:hidden">
      <MobileHeader title="More" />
      <Card className="divide-y divide-border overflow-hidden">
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-surface-2"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted" />
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </Card>

      <form action={signOut}>
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
