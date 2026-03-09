"use client";

import { useEffect, useState } from "react";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { ScoreBoard } from "@/components/debate/ScoreBoard";
import { TurnTimer } from "@/components/debate/TurnTimer";
import { ArgumentDisplay } from "@/components/debate/ArgumentDisplay";
import { SpectatorChat } from "./SpectatorChat";
import { Badge } from "@/components/ui/badge";
import type { DebateState, ScoredTurn } from "@/types/socket-events";

interface DebateData {
  id: string;
  topic: string;
  status: string;
  current_phase: string;
  current_turn: number;
  total_turns: number;
  user_a_id: number;
  user_b_id: number;
  user_a_side: string;
  user_b_side: string;
  user_a_score: string;
  user_b_score: string;
  user_a_username: string;
  user_b_username: string;
  active_user_id: number | null;
  spectator_count: number;
  winner_id: number | null;
}

export function SpectatorView({ debate: initial }: { debate: DebateData }) {
  const [debate, setDebate] = useState(initial);
  const [turns, setTurns] = useState<ScoredTurn[]>([]);
  const [timerEnd, setTimerEnd] = useState<string | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(initial.spectator_count);

  // Load existing turns
  useEffect(() => {
    async function loadTurns() {
      const res = await fetch(`/api/debates/${debate.id}/turns`);
      if (res.ok) {
        const data = await res.json();
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
    }
    loadTurns();
  }, [debate.id]);

  // Socket connection as spectator
  useEffect(() => {
    const socket = connectSocket();

    socket.emit("spectator:join", debate.id);

    socket.on("debate:state_update", (state: DebateState) => {
      setDebate((prev) => ({
        ...prev,
        status: state.status,
        current_phase: state.phase,
        current_turn: state.currentTurn,
        active_user_id: state.activeUserId,
        user_a_score: String(state.userAScore),
        user_b_score: String(state.userBScore),
      }));
    });

    socket.on("debate:turn_start", (data) => {
      setTimerEnd(data.endsAt);
    });

    socket.on("debate:arg_scored", ({ turn }) => {
      setTurns((prev) => [...prev, turn]);
    });

    socket.on("debate:review_start", (data) => {
      setTimerEnd(data.endsAt);
    });

    socket.on("debate:completed", (data) => {
      setDebate((prev) => ({
        ...prev,
        status: "completed",
        current_phase: "finished",
        winner_id: data.winnerId,
        user_a_score: String(data.userAScore),
        user_b_score: String(data.userBScore),
      }));
    });

    socket.on("spectator:count", ({ count }) => {
      setSpectatorCount(count);
    });

    return () => {
      socket.emit("spectator:leave", debate.id);
      socket.off("debate:state_update");
      socket.off("debate:turn_start");
      socket.off("debate:arg_scored");
      socket.off("debate:review_start");
      socket.off("debate:completed");
      socket.off("spectator:count");
      disconnectSocket();
    };
  }, [debate.id]);

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-4 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Spectating</Badge>
            <span className="text-sm text-muted-foreground">
              {spectatorCount} watching
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold">{debate.topic}</h1>
        </div>

        <ScoreBoard
          userA={{
            username: debate.user_a_username,
            side: debate.user_a_side,
            score: parseFloat(debate.user_a_score),
            isActive: debate.active_user_id === debate.user_a_id,
          }}
          userB={{
            username: debate.user_b_username,
            side: debate.user_b_side,
            score: parseFloat(debate.user_b_score),
            isActive: debate.active_user_id === debate.user_b_id,
          }}
          winnerId={debate.winner_id}
          userAId={debate.user_a_id}
        />

        {timerEnd && debate.current_phase !== "finished" && (
          <TurnTimer endsAt={timerEnd} />
        )}

        <div className="mt-4 flex flex-col gap-4">
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

        {debate.current_phase === "ai_scoring" && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium">
              AI is analyzing and scoring the argument...
            </p>
          </div>
        )}

        {debate.current_phase === "finished" && (
          <div className="mt-4 rounded-lg border bg-card p-6 text-center">
            <h2 className="text-2xl font-bold">Debate Complete!</h2>
            <p className="mt-1 text-muted-foreground">
              Final score: {parseFloat(debate.user_a_score).toFixed(1)} -{" "}
              {parseFloat(debate.user_b_score).toFixed(1)}
            </p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-80">
        <SpectatorChat debateId={debate.id} />
      </div>
    </div>
  );
}
