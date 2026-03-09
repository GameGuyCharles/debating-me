export interface DebateConfig {
  topic: string;
  senderSide: "for" | "against";
  scheduledTime: Date | null;
  turnTimeSecs: number;
  reviewTimeSecs: number;
  totalTurns: number;
  rules: string[];
}

export interface DebateParticipant {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  side: "for" | "against";
  score: number;
}

export interface DebateView {
  id: string;
  topic: string;
  status: string;
  phase: string;
  currentTurn: number;
  totalTurns: number;
  turnTimeSecs: number;
  reviewTimeSecs: number;
  userA: DebateParticipant;
  userB: DebateParticipant;
  activeUserId: number | null;
  firstTurnUserId: number | null;
  spectatorCount: number;
  replaySlug: string | null;
  createdAt: string;
  completedAt: string | null;
}

export type DebatePhase =
  | "waiting"
  | "writing"
  | "ai_scoring"
  | "reviewing"
  | "closing_a"
  | "closing_b"
  | "finished";

export type DebateStatus =
  | "coin_flip"
  | "in_progress"
  | "scoring"
  | "completed"
  | "abandoned";
