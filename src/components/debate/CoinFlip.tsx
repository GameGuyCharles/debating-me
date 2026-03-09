"use client";

import { cn } from "@/lib/utils";

interface CoinFlipProps {
  result: {
    winnerId: number;
    result: "heads" | "tails";
  } | null;
  userAName: string;
  userBName: string;
}

export function CoinFlip({ result, userAName, userBName }: CoinFlipProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold">Coin Flip</h2>
      <p className="text-muted-foreground">
        Determining who goes first...
      </p>

      {/* Coin animation */}
      <div
        className={cn(
          "relative h-32 w-32 rounded-full border-4 flex items-center justify-center text-4xl font-bold transition-all duration-1000",
          result
            ? "border-primary bg-primary/10"
            : "border-muted animate-spin"
        )}
      >
        {result ? (
          result.result === "heads" ? "H" : "T"
        ) : (
          <span className="animate-pulse">?</span>
        )}
      </div>

      {result && (
        <div className="text-center animate-in fade-in duration-500">
          <p className="text-lg font-medium">
            {result.result === "heads" ? "Heads" : "Tails"}!
          </p>
          <p className="text-xl font-bold text-primary">
            {result.result === "heads" ? userAName : userBName} goes first
          </p>
        </div>
      )}

      {!result && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Waiting for both debaters to join...
        </p>
      )}
    </div>
  );
}
