"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

const PREFS_KEY = "cockpit:notification-prefs";

interface Prefs {
  morningWorkout: boolean;
  raceCountdown: boolean;
  restDay: boolean;
  workoutCompletion: boolean;
}

const DEFAULT_PREFS: Prefs = {
  morningWorkout: true,
  raceCountdown: true,
  restDay: false,
  workoutCompletion: false,
};

const PREF_LABELS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "morningWorkout", label: "Morning workout reminder", description: "A nudge for today's session." },
  { key: "raceCountdown", label: "Race countdown", description: "Milestone reminders as race day approaches." },
  { key: "restDay", label: "Rest day reminder", description: "A note that today is a scheduled rest day." },
  { key: "workoutCompletion", label: "Workout completion reminder", description: "A prompt to log an unlogged workout." },
];

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reads browser Notification API / localStorage state on mount */
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {
      // ignore malformed local storage
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function updatePref(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new Notification("Cockpit notifications enabled", {
        body: "You'll get reminders based on the preferences below.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Browser notifications, shown while the app is open or installed as a PWA. Kept light — no spam.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission !== "granted" && (
          <Button variant="outline" className="w-full" onClick={requestPermission} disabled={permission === "unsupported"}>
            {permission === "unsupported" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {permission === "unsupported" ? "Notifications not supported" : "Enable notifications"}
          </Button>
        )}

        {PREF_LABELS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted">{description}</p>
            </div>
            <Switch checked={prefs[key]} onCheckedChange={(v) => updatePref(key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
