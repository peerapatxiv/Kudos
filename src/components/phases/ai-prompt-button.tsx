"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buildPlanPrompt, parseAiPlan, type PlanPromptContext } from "@/lib/training/ai-plan";
import { PHASE_COLORS, type PhaseColor } from "@/lib/training/phases";
import { importAiPlan } from "@/lib/training/actions";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, ChevronDown, Compass, Copy, Sparkles } from "lucide-react";

const TEXTAREA =
  "flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-race/40 resize-none";

export function AiPromptButton({ context }: { context: PlanPromptContext }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("generate");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="group gap-1.5 border-a-race/40 bg-a-race/10 text-a-race hover:border-a-race/70 hover:bg-a-race/15"
      >
        <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
        Plan with AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Plan with AI</DialogTitle>
            <DialogDescription>
              Generate a prompt from your stats, paste it into any AI chat, then paste the reply back to create the plan.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <StepTrigger value="generate" step={1} label="Generate prompt" done={tab === "import"} />
              <StepTrigger value="import" step={2} label="Paste plan" />
            </TabsList>
            <TabsContent value="generate">
              <GenerateTab context={context} onNext={() => setTab("import")} />
            </TabsContent>
            <TabsContent value="import">
              <ImportTab onDone={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StepTrigger({ value, step, label, done }: { value: string; step: number; label: string; done?: boolean }) {
  return (
    <TabsTrigger value={value} className="group inline-flex items-center justify-center gap-2 py-2">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
          done
            ? "bg-a-race/15 text-a-race"
            : "bg-border text-muted group-data-[state=active]:bg-a-race group-data-[state=active]:text-a-race-foreground",
        )}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : step}
      </span>
      {label}
    </TabsTrigger>
  );
}

function GenerateTab({ context, onNext }: { context: PlanPromptContext; onNext: () => void }) {
  const races = context.upcomingRaces;
  const [raceId, setRaceId] = useState<string | null>(
    () => (races.find((r) => r.priority === "a_race") ?? races[0])?.id ?? null,
  );
  const [extra, setExtra] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const prompt = useMemo(
    () => buildPlanPrompt(context, { targetRaceId: raceId, extraInstructions: extra }),
    [context, raceId, extra],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <SectionLabel>Target race</SectionLabel>
        {races.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            No upcoming races yet.{" "}
            <Link href="/calendar" className="font-medium text-foreground underline underline-offset-2">
              Add a race
            </Link>{" "}
            to build the plan around it, or continue for a general plan.
          </p>
        ) : (
          <div className="space-y-2" role="radiogroup" aria-label="Target race">
            {races.map((race) => (
              <RaceOption
                key={race.id}
                selected={raceId === race.id}
                onSelect={() => setRaceId(race.id)}
                date={race.date}
                title={race.name}
                distanceKm={race.distanceKm}
                goal={race.goalTimeSeconds ? formatGoal(race.goalTimeSeconds) : null}
                priority={race.priority}
                today={context.today}
              />
            ))}
            <RaceOption selected={raceId === null} onSelect={() => setRaceId(null)} title="No specific race" />
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <SectionLabel htmlFor="ai-extra" hint="optional">
          Notes for the coach
        </SectionLabel>
        <textarea
          id="ai-extra"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          rows={2}
          className={TEXTAREA}
          placeholder="e.g. 5 days a week, long run on Sunday, no running on Mondays."
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface-2/40">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Your prompt is ready</p>
            <p className="text-xs text-muted">Paste it into ChatGPT, Claude, Gemini, or any AI chat.</p>
          </div>
          <Button variant="primary" size="sm" onClick={copy} className="shrink-0 gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          aria-expanded={showPrompt}
          className="flex w-full items-center gap-1 border-t border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showPrompt && "rotate-180")} />
          {showPrompt ? "Hide prompt" : "Preview prompt"}
        </button>
        {showPrompt && (
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap border-t border-border bg-surface px-4 py-3 font-mono text-[11px] leading-relaxed text-muted">
            {prompt}
          </pre>
        )}
      </section>

      <Button variant="outline" className="h-10 w-full gap-1.5" onClick={onNext}>
        I have the reply — paste plan
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SectionLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
      {hint && <span className="font-normal normal-case tracking-normal">({hint})</span>}
    </Label>
  );
}

const PRIORITY_BADGE: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  a_race: { label: "A-race", variant: "a-race" },
  secondary: { label: "Secondary", variant: "secondary" },
  tune_up: { label: "Tune-up", variant: "tune-up" },
  other: { label: "Other", variant: "other-race" },
};

function RaceOption({
  selected,
  onSelect,
  title,
  date,
  distanceKm,
  goal,
  priority,
  today,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  date?: string;
  distanceKm?: number;
  goal?: string | null;
  priority?: string;
  today?: string;
}) {
  const d = date ? new Date(`${date}T00:00:00`) : null;
  const weeks =
    d && today ? Math.max(0, Math.round((d.getTime() - new Date(`${today}T00:00:00`).getTime()) / (7 * 86_400_000))) : null;
  const badge = priority ? PRIORITY_BADGE[priority] : undefined;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
        selected ? "border-a-race bg-a-race/5 ring-1 ring-a-race" : "border-border hover:border-muted/50 hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md leading-none",
          selected ? "bg-a-race/15 text-a-race" : "bg-surface-2 text-muted",
        )}
      >
        {d ? (
          <>
            <span className="text-[10px] font-semibold uppercase">{d.toLocaleDateString("en", { month: "short" })}</span>
            <span className="mt-0.5 text-base font-bold tabular-nums">{d.getDate()}</span>
          </>
        ) : (
          <Compass className="h-5 w-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {badge && (
            <Badge variant={badge.variant} className="shrink-0 px-1.5 py-0 text-[10px]">
              {badge.label}
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {d
            ? [
                `${distanceKm} km`,
                goal && `goal ${goal}`,
                weeks !== null && (weeks === 0 ? "this week" : `in ${weeks} wk${weeks === 1 ? "" : "s"}`),
              ]
                .filter(Boolean)
                .join(" · ")
            : "General plan from your current fitness"}
        </span>
      </span>

      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-a-race bg-a-race text-a-race-foreground" : "border-border",
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

function ImportTab({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => (text.trim() ? parseAiPlan(text) : null), [text]);

  const handleImport = async () => {
    if (!result?.ok) return;
    setError(null);
    setPending(true);
    const res = await importAiPlan({ text, replaceExisting: replace });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to create the plan.");
      return;
    }
    setText("");
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai-reply" className="text-sm font-medium">
          Paste the AI&apos;s reply
        </Label>
        <textarea
          id="ai-reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className={cn(TEXTAREA, "font-mono text-xs")}
          placeholder={'```json\n{ "plan_name": "...", "phases": [ ... ] }\n```'}
        />
      </div>

      {result && !result.ok && (
        <div className="space-y-1 rounded-md border border-danger/20 bg-danger/10 p-3">
          <p className="text-xs font-medium text-danger">This doesn&apos;t look like a valid plan yet:</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-danger">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted">Tip: send these errors back to the AI and ask it to fix the JSON.</p>
        </div>
      )}

      {result?.ok && (
        <div className="space-y-3 rounded-md border border-border bg-surface-2/50 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{result.plan.name ?? "Training plan"}</p>
            <p className="text-xs text-muted">
              {result.plan.startDate} → {result.plan.endDate} · {result.plan.workouts.length} workouts ·{" "}
              {result.plan.totalKm} km
            </p>
          </div>
          <ul className="space-y-1.5">
            {result.plan.phases.map((phase) => {
              const weeks = result.plan.weeks.filter((w) => w.phaseId === phase.id).length;
              return (
                <li key={phase.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-medium",
                      PHASE_COLORS[phase.color as PhaseColor] ?? PHASE_COLORS.rest,
                    )}
                  >
                    {phase.label}
                  </span>
                  <span className="text-muted">
                    {phase.startDate} → {phase.endDate} · {weeks} week{weeks === 1 ? "" : "s"}
                  </span>
                </li>
              );
            })}
          </ul>
          {result.warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-warning">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <label className="flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="mt-0.5 accent-a-race"
            />
            <span>
              Replace my current plan from {result.plan.startDate} onwards
              <span className="block text-muted">
                Removes phases and planned workouts from that date. Completed runs are kept.
              </span>
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 p-3">
          <p className="whitespace-pre-line text-xs text-danger">{error}</p>
        </div>
      )}

      <Button variant="primary" className="h-9 w-full" onClick={handleImport} disabled={!result?.ok || pending}>
        {pending ? "Creating plan…" : "Create training plan"}
      </Button>
    </div>
  );
}

function formatGoal(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}
