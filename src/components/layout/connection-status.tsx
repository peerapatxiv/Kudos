"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Small offline indicator — the app is read-only-cached offline (see public/sw.js). */
export function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a browser API unavailable during SSR
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <span
      className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-[10px] font-semibold uppercase text-warning"
      title="Offline — showing cached data"
    >
      <WifiOff className="h-3 w-3" />
      Offline
    </span>
  );
}
