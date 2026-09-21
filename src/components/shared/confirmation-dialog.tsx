"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  destructiveText: string;
  cancelText?: string;
  onConfirm: () => Promise<void>;
  isDestructive?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  destructiveText,
  cancelText = "Cancel",
  onConfirm,
  isDestructive = true,
  icon,
}: ConfirmationDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {icon ? (
              <div>{icon}</div>
            ) : isDestructive ? (
              <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
            ) : null}
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "primary"}
            className="flex-1"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Deleting..." : destructiveText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
