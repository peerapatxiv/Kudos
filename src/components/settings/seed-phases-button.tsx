"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { seedPhases } from "@/lib/training/actions";

export function SeedPhasesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await seedPhases();
      if (result.ok) {
        setMessage({ type: "success", text: "Phases created successfully!" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to create phases" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="mb-4">
        <h3 className="font-semibold">Training Phases</h3>
        <p className="text-sm text-muted mt-1">Create your training phases in the database</p>
      </div>
      <Button
        onClick={handleSeed}
        disabled={loading}
        variant="primary"
        className="w-full"
      >
        {loading ? "Creating phases..." : "Seed Training Phases"}
      </Button>
      {message && (
        <div className={`mt-3 text-sm p-2 rounded ${
          message.type === "success"
            ? "bg-completed/10 text-completed"
            : "bg-danger/10 text-danger"
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
