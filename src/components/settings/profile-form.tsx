"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/training/actions";
import { CheckCircle2 } from "lucide-react";

export function ProfileForm({
  initialName,
  initialHeightCm,
  email,
}: {
  initialName: string | null;
  initialHeightCm: number | null;
  email: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [height, setHeight] = useState(initialHeightCm != null ? String(initialHeightCm) : "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const trimmedHeight = height.trim();
      const heightCm = trimmedHeight === "" ? null : Number(trimmedHeight);
      if (heightCm !== null && (Number.isNaN(heightCm) || heightCm <= 0)) {
        setError("Enter a valid height, or leave it blank.");
        return;
      }

      const result = await updateProfile({ displayName: name, heightCm });
      if (!result.ok) {
        setError(result.error ?? "Could not save profile.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Peerapat P."
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height-cm">Height (cm)</Label>
            <Input
              id="height-cm"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="175"
              disabled={pending}
            />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button variant="outline" className="w-full" onClick={handleSave} disabled={pending}>
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" /> Saved
            </>
          ) : pending ? (
            "Saving…"
          ) : (
            "Save"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
