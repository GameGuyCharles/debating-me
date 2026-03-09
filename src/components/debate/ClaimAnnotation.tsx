"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSocket } from "@/lib/socket";
import type { AiClaim } from "@/types/database";

interface ClaimAnnotationProps {
  claim: AiClaim;
  claimIndex: number;
  turnId: string;
  debateId: string;
  canFlag: boolean;
}

function getFactualVerdict(score: number) {
  if (score >= 1) return { label: "Verified", emoji: "✅", color: "text-green-600 dark:text-green-400" };
  if (score >= 0.5) return { label: "Debatable", emoji: "⚠️", color: "text-yellow-600 dark:text-yellow-400" };
  if (score < 0) return { label: "False", emoji: "❌", color: "text-red-600 dark:text-red-400" };
  return { label: "Unverified", emoji: "❓", color: "text-muted-foreground" };
}

function getSupportVerdict(score: number) {
  if (score >= 1) return { label: "Strong", icon: "🎯", color: "text-green-600 dark:text-green-400" };
  if (score >= 0.5) return { label: "Partial", icon: "↗️", color: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Weak", icon: "➖", color: "text-muted-foreground" };
}

export function ClaimAnnotation({
  claim,
  claimIndex,
  turnId,
  debateId,
  canFlag,
}: ClaimAnnotationProps) {
  const [expanded, setExpanded] = useState(false);
  const [flagged, setFlagged] = useState(false);

  function handleFlag() {
    const socket = getSocket();
    socket.emit("debate:flag_score", {
      debateId,
      turnId,
      claimIndex,
      reason: "I believe this score is incorrect",
    });
    setFlagged(true);
  }

  const factual = getFactualVerdict(claim.factualScore);
  const support = getSupportVerdict(claim.supportScore);
  const pointsForClaim = claim.isBadFaith ? 0 : claim.isOpinion ? 0 : claim.factualScore + claim.supportScore;

  // Bad faith claim — always fully visible
  if (claim.isBadFaith) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="italic text-foreground/80 truncate">&ldquo;{claim.claimText}&rdquo;</span>
          <Badge variant="destructive" className="shrink-0 text-[10px]">Bad Faith</Badge>
        </div>
        <p className="mt-1 text-muted-foreground">{claim.factualReasoning}</p>
      </div>
    );
  }

  // Opinion claim — compact
  if (claim.isOpinion) {
    return (
      <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="italic text-foreground/80 truncate">&ldquo;{claim.claimText}&rdquo;</span>
          <span className="shrink-0 text-muted-foreground">💭 Opinion</span>
        </div>
      </div>
    );
  }

  // Regular factual claim — collapsed by default, click to expand
  return (
    <div className="rounded-md border bg-muted/10">
      {/* Collapsed summary row — always visible */}
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Claim text */}
        <span className="flex-1 text-xs italic text-foreground/80 truncate">
          &ldquo;{claim.claimText}&rdquo;
        </span>

        {/* Factual verdict chip */}
        <span className={cn("shrink-0 text-xs font-semibold", factual.color)}>
          {factual.emoji} {factual.label} ({claim.factualScore > 0 ? "+" : ""}{claim.factualScore})
        </span>

        {/* Support verdict chip */}
        <span className={cn("shrink-0 text-xs font-semibold", support.color)}>
          {support.icon} {support.label} (+{claim.supportScore})
        </span>

        {/* Total for this claim */}
        <span className={cn(
          "shrink-0 text-xs font-bold font-mono min-w-[3.5rem] text-right",
          pointsForClaim > 0 ? "text-green-600 dark:text-green-400" : pointsForClaim < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
        )}>
          {pointsForClaim > 0 ? "+" : ""}{pointsForClaim.toFixed(1)} pts
        </span>

        {/* Expand indicator */}
        <span className="shrink-0 text-muted-foreground text-xs">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-3 py-2 text-xs space-y-2">
          {/* Factual reasoning */}
          <div>
            <span className={cn("font-semibold", factual.color)}>Factual Accuracy:</span>
            <p className="mt-0.5 text-foreground/80 leading-relaxed">{claim.factualReasoning}</p>
          </div>

          {/* Support reasoning */}
          <div>
            <span className={cn("font-semibold", support.color)}>Argument Support:</span>
            <p className="mt-0.5 text-foreground/80 leading-relaxed">{claim.supportReasoning}</p>
          </div>

          {/* Sources */}
          {claim.factualSources && claim.factualSources.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">Sources: </span>
              {claim.factualSources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline mr-2"
                >
                  [{i + 1}]
                </a>
              ))}
            </div>
          )}

          {/* Flag button */}
          {canFlag && !flagged && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
                onClick={(e) => { e.stopPropagation(); handleFlag(); }}
              >
                🚩 Flag for Re-evaluation
              </Button>
            </div>
          )}
          {flagged && (
            <p className="text-primary text-right">🔄 Flagged — AI will re-evaluate</p>
          )}
        </div>
      )}
    </div>
  );
}
