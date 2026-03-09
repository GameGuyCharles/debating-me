export interface InviteDetails {
  id: string;
  senderId: number;
  senderUsername: string;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  recipientId: number | null;
  recipientUsername: string | null;
  recipientDisplayName: string | null;
  recipientAvatarUrl: string | null;
  inviteType: "direct" | "public" | "link";
  inviteCode: string | null;
  topic: string;
  senderSide: "for" | "against";
  scheduledTime: string | null;
  turnTimeSecs: number;
  reviewTimeSecs: number;
  totalTurns: number;
  status: "pending" | "counter_proposed" | "accepted" | "declined" | "expired" | "cancelled";
  lastModifiedBy: number | null;
  rules: InviteRule[];
  negotiations: NegotiationEntry[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface InviteRule {
  id: number;
  ruleText: string;
  addedBy: number;
  addedByUsername: string;
}

export interface NegotiationEntry {
  id: number;
  modifiedBy: number;
  modifiedByUsername: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  message: string | null;
  createdAt: string;
}

export interface CreateInvitePayload {
  recipientId?: number;
  inviteType: "direct" | "public" | "link";
  topic: string;
  senderSide: "for" | "against";
  scheduledTime?: string;
  turnTimeSecs: number;
  reviewTimeSecs: number;
  totalTurns: number;
  rules: string[];
  topicBoardId?: number;
}

export interface CounterProposalPayload {
  turnTimeSecs?: number;
  reviewTimeSecs?: number;
  totalTurns?: number;
  scheduledTime?: string;
  message?: string;
  addRules?: string[];
  removeRuleIds?: number[];
}
