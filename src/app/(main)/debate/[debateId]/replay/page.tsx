"use client";

import { useEffect, useState, use } from "react";
import { ScoreBoard } from "@/components/debate/ScoreBoard";
import { ArgumentDisplay } from "@/components/debate/ArgumentDisplay";
import type { ScoredTurn } from "@/types/socket-events";

interface DebateData {
  id: string;
  topic: string;
  status: string;
  user_a_id: number;
  user_b_id: number;
  user_a_side: string;
  user_b_side: string;
  user_a_score: string;
  user_b_score: string;
  user_a_username: string;
  user_b_username: string;
  winner_id: number | null;
  total_turns: number;
  turn_time_secs: number;
  created_at: string;
  completed_at: string | null;
}

export default function ReplayPage({
  params,
}: {
  params: Promise<{ debateId: string }>;
}) {
  const { debateId } = use(params);
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [turns, setTurns] = useState<ScoredTurn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [debateRes, turnsRes] = await Promise.all([
        fetch(`/api/debates/${debateId}`),
        fetch(`/api/debates/${debateId}/turns`),
      ]);

      if (debateRes.ok) setDebate(await debateRes.json());
      if (turnsRes.ok) {
        const data = await turnsRes.json();
        setTurns(
          data.map((t: Record<string, unknown>) => ({
            id: t.id,
            debateId: t.debate_id,
            userId: t.user_id,
            turnNumber: t.turn_number,
            turnType: t.turn_type,
            rawContent: t.raw_content,
            wasAutoSubmitted: t.was_auto_submitted,
            totalScore: parseFloat(t.total_score as string),
            ruleViolation: t.rule_violation,
            violationDetail: t.violation_detail,
            aiAnalysis: t.ai_analysis_json,
            submittedAt: t.submitted_at,
            scoredAt: t.scored_at,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [debateId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading replay...</p>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Debate not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{debate.topic}</h1>
        <p className="text-sm text-muted-foreground">
          Debate Replay &middot;{" "}
          {debate.completed_at
            ? new Date(debate.completed_at).toLocaleDateString()
            : "In progress"}
        </p>
      </div>

      <ScoreBoard
        userA={{
          username: debate.user_a_username,
          side: debate.user_a_side,
          score: parseFloat(debate.user_a_score),
          isActive: false,
        }}
        userB={{
          username: debate.user_b_username,
          side: debate.user_b_side,
          score: parseFloat(debate.user_b_score),
          isActive: false,
        }}
        winnerId={debate.winner_id}
        userAId={debate.user_a_id}
      />

      <div className="mt-6 flex flex-col gap-4">
        {turns.map((turn) => (
          <ArgumentDisplay
            key={turn.id}
            turn={turn}
            username={
              turn.userId === debate.user_a_id
                ? debate.user_a_username
                : debate.user_b_username
            }
            side={
              turn.userId === debate.user_a_id
                ? debate.user_a_side
                : debate.user_b_side
            }
            isCurrentUser={false}
            debateId={debate.id}
          />
        ))}
      </div>

      {debate.winner_id && (
        <div className="mt-6 rounded-lg border bg-card p-6 text-center">
          <h2 className="text-xl font-bold">
            Winner:{" "}
            {debate.winner_id === debate.user_a_id
              ? debate.user_a_username
              : debate.user_b_username}
          </h2>
          <p className="text-muted-foreground">
            Final: {parseFloat(debate.user_a_score).toFixed(1)} -{" "}
            {parseFloat(debate.user_b_score).toFixed(1)}
          </p>
        </div>
      )}
    </div>
  );
}
