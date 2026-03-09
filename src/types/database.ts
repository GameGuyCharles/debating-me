// Database row types - mirror the PostgreSQL schema

export interface DbUser {
  id: number;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "user" | "moderator";
  total_debates: number;
  wins: number;
  losses: number;
  draws: number;
  avg_score: number;
  is_shadow_banned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbDebateInvite {
  id: string;
  sender_id: number;
  recipient_id: number | null;
  invite_type: "direct" | "public" | "link";
  invite_code: string | null;
  topic: string;
  sender_side: "for" | "against";
  scheduled_time: Date | null;
  turn_time_secs: number;
  review_time_secs: number;
  total_turns: number;
  status: "pending" | "counter_proposed" | "accepted" | "declined" | "expired" | "cancelled";
  last_modified_by: number | null;
  topic_board_id: number | null;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
}

export interface DbDebateRule {
  id: number;
  invite_id: string | null;
  debate_id: string | null;
  rule_text: string;
  added_by: number;
  created_at: Date;
}

export interface DbInviteNegotiation {
  id: number;
  invite_id: string;
  modified_by: number;
  changes_json: Record<string, { old: unknown; new: unknown }>;
  message: string | null;
  created_at: Date;
}

export interface DbDebate {
  id: string;
  invite_id: string | null;
  user_a_id: number;
  user_b_id: number;
  first_turn_user_id: number | null;
  topic: string;
  user_a_side: "for" | "against";
  user_b_side: "for" | "against";
  turn_time_secs: number;
  review_time_secs: number;
  total_turns: number;
  status: "coin_flip" | "in_progress" | "scoring" | "completed" | "abandoned";
  current_turn: number;
  current_phase: "waiting" | "writing" | "ai_scoring" | "reviewing" | "closing_a" | "closing_b" | "finished";
  active_user_id: number | null;
  user_a_score: number;
  user_b_score: number;
  winner_id: number | null;
  turn_started_at: Date | null;
  spectator_count: number;
  created_at: Date;
  completed_at: Date | null;
  replay_slug: string | null;
}

export interface DbDebateTurn {
  id: string;
  debate_id: string;
  user_id: number;
  turn_number: number;
  turn_type: "opening" | "rebuttal" | "closing";
  raw_content: string;
  was_auto_submitted: boolean;
  total_score: number;
  rule_violation: boolean;
  violation_detail: string | null;
  ai_analysis_json: AiAnalysis | null;
  started_at: Date;
  submitted_at: Date;
  scored_at: Date | null;
  created_at: Date;
}

export interface DbScoreFlag {
  id: string;
  debate_id: string;
  turn_id: string;
  flagged_by: number;
  claim_index: number;
  reason: string | null;
  status: "pending" | "processing" | "upheld" | "overturned";
  revised_score_json: RevisedClaim | null;
  created_at: Date;
  resolved_at: Date | null;
}

export interface DbTopicCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  created_at: Date;
}

export interface DbTopicBoard {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  created_by: number;
  post_count: number;
  created_at: Date;
}

export interface DbSpectatorMessage {
  id: string;
  debate_id: string;
  user_id: number;
  content: string;
  is_shadow_hidden: boolean;
  created_at: Date;
}

export interface DbChatReport {
  id: number;
  message_id: string;
  reported_by: number;
  reason: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  reviewed_by: number | null;
  created_at: Date;
  reviewed_at: Date | null;
}

export interface DbShadowBan {
  id: number;
  user_id: number;
  banned_by: number;
  reason: string | null;
  expires_at: Date | null;
  created_at: Date;
}

// Embedded JSON types
export interface AiAnalysis {
  claims: AiClaim[];
  overall_summary: string;
  web_sources_checked: string[];
  total_score: number;
}

// NOTE: Claims are stored in camelCase (from ScoredClaim via parseClaim),
// even though the top-level AiAnalysis keys are snake_case.
export interface AiClaim {
  claimText: string;
  factualScore: number;
  factualReasoning: string;
  factualSources: string[];
  supportScore: number;
  supportReasoning: string;
  isOpinion: boolean;
  isBadFaith: boolean;
  badFaithType: string | null;
}

export interface RevisedClaim {
  decision: "upheld" | "overturned";
  revised_factual_score: number;
  revised_factual_reasoning: string;
  revised_support_score: number;
  revised_support_reasoning: string;
  review_notes: string;
}
