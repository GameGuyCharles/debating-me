"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ClaimAnnotation } from "./ClaimAnnotation";
import type { ScoredTurn } from "@/types/socket-events";

interface ArgumentDisplayProps {
  turn: ScoredTurn;
  username: string;
  side: string;
  isCurrentUser: boolean;
  debateId: string;
}

export function ArgumentDisplay({
  turn,
  username,
  side,
  isCurrentUser,
  debateId,
}: ArgumentDisplayProps) {
  if (turn.ruleViolation) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="destructive">Rule Violation</Badge>
          <span className="text-sm font-medium">{username}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          The user posted an argument that violated the agreed upon rules. -1
          point has been deducted and the argument has been removed.
        </p>
        {turn.violationDetail && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            {turn.violationDetail}
          </p>
        )}
      </div>
    );
  }

  const analysis = turn.aiAnalysis;
  const hasClaims = analysis && analysis.claims && analysis.claims.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border",
        isCurrentUser ? "border-primary/30 bg-primary/5" : "bg-card"
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{username}</span>
          <Badge variant="outline" className="text-xs">
            {side === "for" ? "For" : "Against"}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {turn.turnType === "opening"
              ? "Opening"
              : turn.turnType === "closing"
                ? "Closing"
                : `Turn ${turn.turnNumber}`}
          </Badge>
          {turn.wasAutoSubmitted && (
            <Badge variant="outline" className="text-xs text-yellow-500">
              Auto-submitted
            </Badge>
          )}
        </div>
        <span
          className={cn(
            "font-mono text-lg font-bold",
            turn.totalScore > 0
              ? "text-green-600 dark:text-green-400"
              : turn.totalScore < 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          )}
        >
          {turn.totalScore > 0 ? "+" : ""}
          {turn.totalScore.toFixed(1)} pts
        </span>
      </div>

      {/* Argument content */}
      <div className="px-4 pb-4 whitespace-pre-wrap text-sm leading-relaxed">
        {turn.rawContent}
      </div>

      {/* AI Analysis Section */}
      {hasClaims && (
        <div className="border-t bg-muted/20">
          {/* Analysis header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">🤖 AI Analysis</span>
              <Badge variant="outline" className="text-xs">
                {analysis.claims.length} claim{analysis.claims.length !== 1 ? "s" : ""} evaluated
              </Badge>
            </div>
            {analysis.web_sources_checked && analysis.web_sources_checked.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {analysis.web_sources_checked.length} sources checked
              </span>
            )}
          </div>

          {/* Claims breakdown */}
          <div className="px-4 pb-3 flex flex-col gap-3">
            {analysis.claims.map((claim, index) => (
              <ClaimAnnotation
                key={index}
                claim={claim}
                claimIndex={index}
                turnId={turn.id}
                debateId={debateId}
                canFlag={!isCurrentUser}
              />
            ))}
          </div>

          {/* Overall summary */}
          {analysis.overall_summary && (
            <div className="mx-4 mb-4 rounded-md bg-muted/40 border border-border/50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Summary
              </p>
              <p className="text-sm text-foreground/80">
                {analysis.overall_summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fallback for scored but no claims */}
      {!hasClaims && analysis && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">🤖 AI Analysis</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {analysis.overall_summary || "No individual claims were identified in this argument."}
          </p>
        </div>
      )}
    </div>
  );
}
