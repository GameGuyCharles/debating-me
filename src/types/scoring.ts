export interface ScoringJob {
  id: string;
  debateId: string;
  userId: number;
  content: string;
  turnNumber: number;
  turnType: "opening" | "rebuttal" | "closing";
  side: string;
  topic: string;
  rules: string[];
  previousTurns: PreviousTurn[];
}

export interface PreviousTurn {
  turnNumber: number;
  userId: number;
  side: string;
  content: string;
  turnType: string;
}

export interface ScoringResult {
  ruleViolation: boolean;
  violationDetail: string | null;
  claims: ScoredClaim[];
  overallSummary: string;
  totalScore: number;
  webSourcesChecked: string[];
}

export interface ScoredClaim {
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

export interface ReEvalJob {
  flagId: string;
  turnId: string;
  claimIndex: number;
  reason: string | null;
  originalClaim: ScoredClaim;
  topic: string;
  side: string;
  fullArgument: string;
}

export interface ReEvalResult {
  decision: "upheld" | "overturned";
  revisedFactualScore: number;
  revisedFactualReasoning: string;
  revisedSupportScore: number;
  revisedSupportReasoning: string;
  reviewNotes: string;
}
