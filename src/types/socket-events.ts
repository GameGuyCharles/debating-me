import type { AiAnalysis, RevisedClaim } from "./database";

// --- Shared data shapes ---

export interface DebateState {
  debateId: string;
  status: string;
  phase: string;
  currentTurn: number;
  activeUserId: number | null;
  userAScore: number;
  userBScore: number;
  spectatorCount: number;
  message?: string;
}

export interface ScoredTurn {
  id: string;
  debateId: string;
  userId: number;
  turnNumber: number;
  turnType: string;
  rawContent: string;
  wasAutoSubmitted: boolean;
  totalScore: number;
  ruleViolation: boolean;
  violationDetail: string | null;
  aiAnalysis: AiAnalysis | null;
  submittedAt: string;
  scoredAt: string;
}

export interface FinalScores {
  userAScore: number;
  userBScore: number;
  userATotalClaims: number;
  userBTotalClaims: number;
}

export interface FlagResult {
  flagId: string;
  decision: "upheld" | "overturned";
  revisedClaim: RevisedClaim;
  scoreDelta: number;
}

export interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface InviteSummary {
  id: string;
  senderId: number;
  senderUsername: string;
  senderAvatarUrl: string | null;
  recipientId: number | null;
  topic: string;
  senderSide: string;
  scheduledTime: string | null;
  turnTimeSecs: number;
  reviewTimeSecs: number;
  totalTurns: number;
  status: string;
  inviteType: string;
  rules: string[];
}

// --- CLIENT -> SERVER ---

export interface ClientToServerEvents {
  // Debate Room
  "debate:join": (debateId: string) => void;
  "debate:leave": (debateId: string) => void;
  "debate:submit_arg": (data: { debateId: string; content: string }) => void;
  "debate:draft": (data: { debateId: string; content: string }) => void;
  "debate:forfeit": (debateId: string) => void;
  "debate:flag_score": (data: {
    debateId: string;
    turnId: string;
    claimIndex: number;
    reason?: string;
  }) => void;

  // Spectator Chat
  "chat:send": (data: { debateId: string; content: string }) => void;
  "chat:report": (data: { messageId: string; reason: string }) => void;

  // Invites
  "invite:send": (inviteId: string) => void;
  "invite:respond": (data: {
    inviteId: string;
    action: "accept" | "counter" | "decline";
  }) => void;

  // Presence
  "spectator:join": (debateId: string) => void;
  "spectator:leave": (debateId: string) => void;
}

// --- SERVER -> CLIENT ---

export interface ServerToClientEvents {
  // Debate Room
  "debate:state_update": (state: DebateState) => void;
  "debate:coin_flip": (data: {
    winnerId: number;
    result: "heads" | "tails";
  }) => void;
  "debate:turn_start": (data: {
    userId: number;
    turnNumber: number;
    phase: string;
    endsAt: string;
  }) => void;
  "debate:arg_scored": (data: { turn: ScoredTurn }) => void;
  "debate:review_start": (data: { endsAt: string; userId?: number }) => void;
  "debate:timer_tick": (data: { secondsRemaining: number }) => void;
  "debate:auto_submit": (data: { turnNumber: number }) => void;
  "debate:rule_violation": (data: { userId: number; detail: string }) => void;
  "debate:completed": (data: {
    debateId: string;
    winnerId: number | null;
    userAScore: number;
    userBScore: number;
    replaySlug?: string;
  }) => void;
  "debate:flag_result": (data: {
    turnId: string;
    claimIndex: number;
    result: FlagResult;
  }) => void;

  // Spectator Chat
  "chat:message": (message: ChatMessage) => void;
  "chat:moderated": (messageId: string) => void;

  // Invites
  "invite:received": (invite: InviteSummary) => void;
  "invite:updated": (invite: InviteSummary) => void;
  "invite:accepted": (data: {
    debateId: string;
    topic: string;
    acceptedBy: string;
  }) => void;

  // Presence
  "spectator:count": (data: { debateId: string; count: number }) => void;
  "user:online": (userId: number) => void;
  "user:offline": (userId: number) => void;
}
