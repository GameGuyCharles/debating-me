"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { connectSocket, getSocket } from "@/lib/socket";
import { ScoreBoard } from "./ScoreBoard";
import { TurnTimer } from "./TurnTimer";
import { ArgumentEditor } from "./ArgumentEditor";
import { ArgumentDisplay } from "./ArgumentDisplay";
import { CoinFlip } from "./CoinFlip";
import { SpectatorChat } from "@/components/spectator/SpectatorChat";
import { Badge } from "@/components/ui/badge";
import type { DebateState, ScoredTurn } from "@/types/socket-events";

interface DebateData {
  id: string;
  topic: string;
  status: string;
  current_phase: string;
  current_turn: number;
  total_turns: number;
  turn_time_secs: number;
  review_time_secs: number;
  user_a_id: number;
  user_b_id: number;
  user_a_side: string;
  user_b_side: string;
  user_a_score: string;
  user_b_score: string;
  user_a_username: string;
  user_b_username: string;
  user_a_display_name: string | null;
  user_b_display_name: string | null;
  user_a_avatar_url: string | null;
  user_b_avatar_url: string | null;
  active_user_id: number | null;
  first_turn_user_id: number | null;
  spectator_count: number;
  winner_id: number | null;
}

interface Props {
  debate: DebateData;
  userId: number;
}

export function DebateRoom({ debate: initialDebate, userId }: Props) {
  const [debate, setDebate] = useState(initialDebate);
  const [turns, setTurns] = useState<ScoredTurn[]>([]);
  const [timerEnd, setTimerEnd] = useState<string | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(
    initialDebate.status === "coin_flip"
  );
  const [coinResult, setCoinResult] = useState<{
    winnerId: number;
    result: "heads" | "tails";
  } | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(
    initialDebate.spectator_count
  );
  const [socketStatus, setSocketStatus] = useState<string>("connecting...");

  const isMyTurn = debate.active_user_id === userId;
  const myRole =
    debate.user_a_id === userId ? "user_a" : "user_b";
  const mySide = myRole === "user_a" ? debate.user_a_side : debate.user_b_side;

  // Ref for auto-scrolling debate feed
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Helper to look up username from userId
  const getUsernameById = useCallback(
    (uid: number | null) => {
      if (uid === debate.user_a_id) return debate.user_a_username;
      if (uid === debate.user_b_id) return debate.user_b_username;
      return "...";
    },
    [debate.user_a_id, debate.user_b_id, debate.user_a_username, debate.user_b_username]
  );

  // Derive timer label from current debate phase & active user
  const timerLabel = useMemo(() => {
    const activeUsername = getUsernameById(debate.active_user_id);

    switch (debate.current_phase) {
      case "reviewing":
        return `Review Period — ${activeUsername}`;
      case "writing":
        return debate.active_user_id === userId
          ? "Your Turn"
          : `${activeUsername}'s Turn`;
      case "closing_a":
      case "closing_b":
        return debate.active_user_id === userId
          ? "Your Closing Statement"
          : `${activeUsername}'s Closing`;
      default:
        return "";
    }
  }, [debate.current_phase, debate.active_user_id, userId, getUsernameById]);

  // Auto-scroll to bottom of debate feed when new turns arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

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

  // Socket connection — use a ref to prevent React StrictMode double-init
  const socketInitRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (socketInitRef.current) return;
    socketInitRef.current = true;

    const socket = connectSocket();

    // Wait for socket to be connected before joining
    const joinDebate = () => {
      console.log("[DebateRoom] Socket connected, joining debate", debate.id);
      setSocketStatus("connected");
      socket.emit("debate:join", debate.id);
    };

    socket.on("connect_error", (err) => {
      console.error("[DebateRoom] Socket connection error:", err.message);
      setSocketStatus(`error: ${err.message}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("[DebateRoom] Socket disconnected:", reason);
      setSocketStatus(`disconnected: ${reason}`);
    });

    if (socket.connected) {
      joinDebate();
    } else {
      socket.on("connect", joinDebate);
    }

    socket.on("debate:state_update", (state: DebateState) => {
      setDebate((prev) => ({
        ...prev,
        status: state.status,
        current_phase: state.phase,
        current_turn: state.currentTurn,
        active_user_id: state.activeUserId,
        user_a_score: String(state.userAScore),
        user_b_score: String(state.userBScore),
        spectator_count: state.spectatorCount,
      }));

      // Clear timer when AI is scoring (no countdown needed)
      if (state.phase === "ai_scoring") {
        setTimerEnd(null);
      }

      // If the debate has moved past coin_flip, dismiss the coin flip screen
      if (state.status !== "coin_flip") {
        setShowCoinFlip(false);
      }
    });

    socket.on("debate:coin_flip", (data) => {
      setCoinResult(data);
      setTimeout(() => setShowCoinFlip(false), 4000);
    });

    socket.on("debate:turn_start", (data) => {
      setShowCoinFlip(false);
      setTimerEnd(data.endsAt);
      setDebate((prev) => ({
        ...prev,
        active_user_id: data.userId,
        current_phase: data.phase,
        current_turn: data.turnNumber,
      }));
    });

    socket.on("debate:arg_scored", ({ turn }) => {
      console.log("[DebateRoom] Turn scored:", turn.turnNumber, "score:", turn.totalScore);
      setTurns((prev) => [...prev, turn]);
    });

    socket.on("debate:review_start", (data) => {
      console.log("[DebateRoom] Review period started, ends at:", data.endsAt);
      setTimerEnd(data.endsAt);
    });

    socket.on("debate:auto_submit", () => {
      // Timer expired, argument was auto-submitted
    });

    socket.on("debate:rule_violation", ({ detail }) => {
      setTurns((prev) => [
        ...prev,
        {
          id: `violation-${Date.now()}`,
          debateId: debate.id,
          userId: debate.active_user_id || 0,
          turnNumber: debate.current_turn,
          turnType: "rebuttal",
          rawContent: "",
          wasAutoSubmitted: false,
          totalScore: -1,
          ruleViolation: true,
          violationDetail: detail,
          aiAnalysis: null,
          submittedAt: new Date().toISOString(),
          scoredAt: new Date().toISOString(),
        },
      ]);
    });

    socket.on("debate:completed", (data) => {
      setTimerEnd(null);
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

    return () => {};
  }, [debate.id]);

  const handleSubmitArgument = useCallback(
    (content: string) => {
      const socket = getSocket();
      socket.emit("debate:submit_arg", {
        debateId: debate.id,
        content,
      });
    },
    [debate.id]
  );

  const handleDraftChange = useCallback(
    (content: string) => {
      const socket = getSocket();
      socket.emit("debate:draft", { debateId: debate.id, content });
    },
    [debate.id]
  );

  if (showCoinFlip) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <CoinFlip
            result={coinResult}
            userAName={debate.user_a_username}
            userBName={debate.user_b_username}
          />
          <p className="text-xs text-muted-foreground/60 font-mono">
            Socket: {socketStatus} · Status: {debate.status}
          </p>
        </div>
      </div>
    );
  }

  const activeUsername = getUsernameById(debate.active_user_id);

  const phaseLabel =
    debate.current_phase === "ai_scoring"
      ? "AI is scoring..."
      : debate.current_phase === "reviewing"
        ? `${activeUsername} reviewing`
        : debate.current_phase === "writing"
          ? isMyTurn
            ? "Your turn"
            : `${activeUsername} is writing...`
          : debate.current_phase === "closing_a" || debate.current_phase === "closing_b"
            ? isMyTurn
              ? "Your closing"
              : `${activeUsername}'s closing`
            : debate.current_phase === "finished"
              ? "Debate Complete"
              : debate.current_phase;

  return (
    <div className="fixed inset-0 top-14 bottom-0 md:bottom-0 z-40 flex flex-col bg-background overflow-hidden">
      {/* ── Shared header bar ── */}
      <div className="shrink-0 border-b px-4 py-2">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-lg font-bold leading-tight">{debate.topic}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">{phaseLabel}</Badge>
                <span>Turn {debate.current_turn}/{debate.total_turns}</span>
                <span>{spectatorCount} watching</span>
              </div>
            </div>
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
          {timerEnd && debate.current_phase !== "finished" && debate.current_phase !== "ai_scoring" && (
            <div className="mt-1">
              <TurnTimer endsAt={timerEnd} label={timerLabel} />
            </div>
          )}
          {debate.current_phase === "ai_scoring" && (
            <div className="mt-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-medium">AI is analyzing and scoring the argument...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column content area (fills all remaining space) ── */}
      <div className="flex-1 min-h-0 overflow-hidden px-4">
        <div className="container mx-auto flex flex-row h-full min-h-0">
        {/* Left column: debate feed + editor — 3/4 width */}
        <div className="flex flex-col min-h-0 min-w-0" style={{ flex: '3 1 0%' }}>
          {/* Scrollable debate feed — THIS is the only thing that scrolls */}
          <div className="flex-1 overflow-y-auto py-3 pr-3">
            <div className="flex flex-col gap-4">
              {turns.length === 0 && debate.current_phase !== "finished" && (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  {debate.current_phase === "ai_scoring"
                    ? "Waiting for AI to score..."
                    : isMyTurn
                      ? "You're up! Write your argument below."
                      : `Waiting for ${activeUsername} to submit their argument...`}
                </div>
              )}

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
                  isCurrentUser={turn.userId === userId}
                  debateId={debate.id}
                />
              ))}

              {/* Completion banner */}
              {debate.current_phase === "finished" && (
                <div className="rounded-lg border bg-card p-6 text-center">
                  <h2 className="text-2xl font-bold">Debate Complete!</h2>
                  <p className="mt-2 text-lg">
                    {debate.winner_id
                      ? debate.winner_id === userId
                        ? "You won!"
                        : "Your opponent won."
                      : "It's a draw!"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Final score: {parseFloat(debate.user_a_score).toFixed(1)} -{" "}
                    {parseFloat(debate.user_b_score).toFixed(1)}
                  </p>
                </div>
              )}

              <div ref={feedEndRef} />
            </div>
          </div>

          {/* Editor — pinned to bottom of left column, always visible (grayed out when not your turn) */}
          {debate.current_phase !== "finished" && (
            <div className="shrink-0 border-t py-2 pr-3">
              <ArgumentEditor
                onSubmit={handleSubmitArgument}
                onDraftChange={handleDraftChange}
                side={mySide}
                turnType={
                  debate.current_turn <= 1
                    ? "opening"
                    : debate.current_phase.startsWith("closing")
                      ? "closing"
                      : "rebuttal"
                }
                disabled={
                  !isMyTurn ||
                  !(debate.current_phase === "writing" ||
                    debate.current_phase === "closing_a" ||
                    debate.current_phase === "closing_b")
                }
                disabledReason={
                  debate.current_phase === "ai_scoring"
                    ? "AI is scoring..."
                    : debate.current_phase === "reviewing"
                      ? "Review period"
                      : debate.current_phase === "coin_flip"
                        ? "Waiting for coin flip..."
                        : !isMyTurn
                          ? `${getUsernameById(debate.active_user_id)}'s turn`
                          : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Right column: chat — 1/4 width, separately scrollable */}
        <div className="flex border-l min-h-0" style={{ flex: '1 1 0%' }}>
          <SpectatorChat debateId={debate.id} />
        </div>
        </div>
      </div>
    </div>
  );
}
