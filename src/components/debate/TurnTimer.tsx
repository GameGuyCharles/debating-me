"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TurnTimerProps {
  endsAt: string;
  label?: string;
}

export function TurnTimer({ endsAt, label }: TurnTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    function update() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLow = secondsLeft <= 30;
  const isCritical = secondsLeft <= 10;

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border p-3 text-center transition-colors",
        isCritical
          ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
          : isLow
            ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
            : "border-border bg-card"
      )}
    >
      {label && (
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {label}
        </p>
      )}
      <span className="font-mono text-3xl font-bold">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
