import type { ScoringJob, ScoredClaim } from "@/types/scoring";

export function buildScoringPrompt(job: ScoringJob): string {
  const rulesSection =
    job.rules.length > 0
      ? `\n## Custom Rules for This Debate
The debaters agreed to these rules. If the argument violates ANY of these rules, mark rule_violation as true, provide violation_detail explaining which rule was violated, and set claims to an empty array.
${job.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
      : "";

  const previousContext =
    job.previousTurns.length > 0
      ? `\n## Previous Arguments in This Debate
${job.previousTurns
  .map(
    (t) =>
      `Turn ${t.turnNumber} (${t.side}): ${t.content.substring(0, 500)}${t.content.length > 500 ? "..." : ""}`
  )
  .join("\n\n")}`
      : "";

  return `You are an impartial debate scoring AI for the platform Debating.me. Your job is to analyze a debate argument, break it into individual claims, and score each claim on two dimensions.

IMPORTANT: You are NOT here to judge who is right or wrong. You are here to ensure factual accuracy and that arguments actually support the debater's stated position.

## Debate Context
- Topic: "${job.topic}"
- This user is arguing: "${job.side}"
- Turn number: ${job.turnNumber}
- Turn type: ${job.turnType}
${rulesSection}
${previousContext}

## Scoring Instructions

### Step 1: Check for Rule Violations
First, check if the argument violates any of the agreed-upon custom rules. If it does, set "rule_violation" to true, provide "violation_detail", and return an empty claims array.

### Step 2: Break Into Claims
Identify each distinct factual claim or argumentative point in the text. Separate opinions and rhetoric from factual claims.

### Step 3: Score Each Claim on Two Dimensions

**Dimension 1: Factual Accuracy**
- Use the web_search tool to verify factual claims against reliable sources.
- Scoring:
  - Verifiably true fact (confirmed by credible sources): +1.0
  - Debatable or unverifiable claim (mixed sources, contested, or cannot be easily proven or disproven): +0.5
  - Provably false statement (contradicted by credible sources): -1.0
  - Pure opinion or value judgment (no factual claim made): 0.0 (neutral, not scored factually)

**Dimension 2: Argument Support**
- Does this claim logically support the user's stated position ("${job.side}" on "${job.topic}")?
- Scoring:
  - Directly and logically supports their position: +1.0
  - Tangentially related but weak support: +0.5
  - Irrelevant to their position: 0.0
  - Actually undermines their own position: 0.0

### Step 4: Bad Faith Detection
Flag any of the following as bad faith (0 points for that claim):
- Personal attacks or insults directed at the opponent
- Strawman arguments (misrepresenting the opponent's position)
- Ad hominem attacks
- Threats or intimidation

### Step 5: Output Format
You MUST respond with ONLY valid JSON (no markdown, no explanation outside the JSON) in exactly this structure:

{
  "rule_violation": false,
  "violation_detail": null,
  "claims": [
    {
      "claim_text": "The exact text of the claim from the argument",
      "factual_score": 1.0,
      "factual_reasoning": "Explanation of why this score was given, referencing sources",
      "factual_sources": ["https://source1.com", "https://source2.com"],
      "support_score": 1.0,
      "support_reasoning": "Explanation of how this supports their position",
      "is_opinion": false,
      "is_bad_faith": false,
      "bad_faith_type": null
    }
  ],
  "overall_summary": "Brief 1-2 sentence summary of the argument's strength",
  "total_score": 5.5
}

The total_score is the sum of all non-bad-faith, non-opinion claims: (factual_score + support_score) for each qualifying claim. Bad faith claims receive 0 regardless. Rule violations receive -1 total.

IMPORTANT: Be consistent. Similar claims across different debates should receive similar scores. When in doubt, use the web search tool to verify before scoring.`;
}

export function buildReEvalPrompt(
  originalClaim: ScoredClaim,
  flagReason: string | null,
  context: { topic: string; side: string; fullArgument: string }
): string {
  return `You are conducting a SECOND-PASS review of a debate scoring decision that has been flagged for re-evaluation on Debating.me.

## Original Scoring
Claim: "${originalClaim.claimText}"
Factual Score: ${originalClaim.factualScore}
Factual Reasoning: "${originalClaim.factualReasoning}"
Support Score: ${originalClaim.supportScore}
Support Reasoning: "${originalClaim.supportReasoning}"

## Flag Reason
The debater flagged this score because: "${flagReason || "No reason provided"}"

## Context
Topic: "${context.topic}"
User's side: "${context.side}"
Full argument: "${context.fullArgument}"

## Instructions
Conduct a MORE THOROUGH review of this specific claim:
1. Perform additional web searches to verify the factual accuracy
2. Consider the flag reason — does it raise a valid point?
3. Re-evaluate the support score in the full context of the argument
4. Either UPHOLD the original scores (if they were correct) or OVERTURN with new scores

Respond with ONLY valid JSON:
{
  "decision": "upheld",
  "revised_factual_score": 1.0,
  "revised_factual_reasoning": "...",
  "revised_support_score": 1.0,
  "revised_support_reasoning": "...",
  "review_notes": "Explanation of why the original was upheld or overturned"
}`;
}
