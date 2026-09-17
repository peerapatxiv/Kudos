"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/training/actions";
import { CheckCircle2 } from "lucide-react";

export function ProfileForm({ initialName, email }: { initialName: string | null; email: string }) {
  const [name, setName] = useState(initialName ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateProfile(name);
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
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Peerapat P." />
        </div>
        <Button variant="outline" onClick={handleSave} disabled={pending}>
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
