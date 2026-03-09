"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ScoreBoardProps {
  userA: {
    username: string;
    side: string;
    score: number;
    isActive: boolean;
  };
  userB: {
    username: string;
    side: string;
    score: number;
    isActive: boolean;
  };
  winnerId: number | null;
  userAId: number;
}

export function ScoreBoard({ userA, userB, winnerId, userAId }: ScoreBoardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <PlayerScore
        username={userA.username}
        side={userA.side}
        score={userA.score}
        isActive={userA.isActive}
        isWinner={winnerId === userAId}
      />

      <div className="px-4 text-center">
        <div className="text-2xl font-bold font-mono">
          {userA.score.toFixed(1)} - {userB.score.toFixed(1)}
        </div>
        <p className="text-xs text-muted-foreground">Score</p>
      </div>

      <PlayerScore
        username={userB.username}
        side={userB.side}
        score={userB.score}
        isActive={userB.isActive}
        isWinner={winnerId !== null && winnerId !== userAId}
        align="right"
      />
    </div>
  );
}

function PlayerScore({
  username,
  side,
  isActive,
  isWinner,
  align = "left",
}: {
  username: string;
  side: string;
  score: number;
  isActive: boolean;
  isWinner?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        align === "right" && "items-end"
      )}
    >
      <div className="flex items-center gap-2">
        {isActive && (
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
        <span
          className={cn(
            "font-semibold",
            isWinner && "text-primary"
          )}
        >
          {username}
          {isWinner && " (Winner)"}
        </span>
      </div>
      <Badge variant="outline" className="text-xs">
        {side === "for" ? "For" : "Against"}
      </Badge>
    </div>
  );
}
