"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "@/lib/auth/actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Mode = "sign-in" | "sign-up" | "magic-link";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result =
        mode === "sign-in"
          ? await signInWithPassword(email, password)
          : mode === "sign-up"
            ? await signUpWithPassword(email, password)
            : await sendMagicLink(email, `${window.location.origin}/auth/callback`);

      if (!result) return; // redirect() throws internally on success for sign-in/sign-up
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else if (result.message) setMessage(result.message);
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="sign-up">Sign up</TabsTrigger>
            <TabsTrigger value="magic-link">Magic link</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {mode !== "magic-link" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <p className="flex items-start gap-1.5 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {error}
              </p>
            )}
            {message && (
              <p className="flex items-start gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {message}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
              {pending
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Send magic link"}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
