"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ArgumentEditorProps {
  onSubmit: (content: string) => void;
  onDraftChange: (content: string) => void;
  side: string;
  turnType: "opening" | "rebuttal" | "closing";
  disabled?: boolean;
  disabledReason?: string;
}

export function ArgumentEditor({
  onSubmit,
  onDraftChange,
  side,
  turnType,
  disabled = false,
  disabledReason,
}: ArgumentEditorProps) {
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const draftInterval = useRef<NodeJS.Timeout>(null);

  // Reset submitted state when re-enabled (new turn)
  useEffect(() => {
    if (!disabled) {
      setSubmitted(false);
    }
  }, [disabled]);

  // Send draft updates every 3 seconds
  useEffect(() => {
    if (disabled) return;
    draftInterval.current = setInterval(() => {
      if (content) {
        onDraftChange(content);
      }
    }, 3000);

    return () => {
      if (draftInterval.current) clearInterval(draftInterval.current);
    };
  }, [content, onDraftChange, disabled]);

  function handleSubmit() {
    if (!content.trim() || disabled) return;
    setSubmitted(true);
    onSubmit(content);
  }

  const turnLabel =
    turnType === "opening"
      ? "Opening Argument"
      : turnType === "closing"
        ? "Closing Argument"
        : "Rebuttal";

  if (submitted) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-medium text-sm">Argument submitted!</p>
        <p className="text-xs text-muted-foreground">
          Waiting for AI to score your argument...
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card p-3", disabled && "opacity-50")}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={disabled ? "outline" : "default"} className="text-xs">{turnLabel}</Badge>
          <Badge variant="outline" className="text-xs">{side === "for" ? "For" : "Against"}</Badge>
          {disabled && disabledReason && (
            <span className="text-xs text-muted-foreground">{disabledReason}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {content.length} chars
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          disabled
            ? "Waiting for your turn..."
            : turnType === "opening"
              ? "Present your opening argument. State your position and support it with facts..."
              : turnType === "closing"
                ? "Summarize your key points and deliver your closing argument..."
                : "Respond to your opponent's argument. Counter their points with facts..."
        }
        rows={4}
        className="mb-2 resize-none"
        maxLength={10000}
        disabled={disabled}
        autoFocus={!disabled}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          AI will score on factual accuracy &amp; argument support.
        </p>
        <Button onClick={handleSubmit} disabled={!content.trim() || disabled} size="sm">
          Submit Argument
        </Button>
      </div>
    </div>
  );
}
