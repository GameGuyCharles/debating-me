import type { ScoringResult, ScoredClaim, ReEvalResult } from "@/types/scoring";

/**
 * Parse the Claude API response into a structured ScoringResult.
 * The response may contain text blocks and tool_use blocks (web search).
 * We need to find the final text block containing the JSON output.
 */
export function parseScoringResponse(response: {
  content: Array<{ type: string; text?: string }>;
}): ScoringResult {
  // Find the last text block in the response
  const textBlocks = response.content.filter(
    (block) => block.type === "text" && block.text
  );

  if (textBlocks.length === 0) {
    return createErrorResult("No text response from AI");
  }

  const lastText = textBlocks[textBlocks.length - 1].text!;

  try {
    // Try to extract JSON from the text (may be wrapped in markdown code blocks)
    const jsonStr = extractJson(lastText);
    const parsed = JSON.parse(jsonStr);

    return {
      ruleViolation: Boolean(parsed.rule_violation),
      violationDetail: parsed.violation_detail || null,
      claims: (parsed.claims || []).map(parseClaim),
      overallSummary: parsed.overall_summary || "",
      totalScore: typeof parsed.total_score === "number" ? parsed.total_score : 0,
      webSourcesChecked: parsed.web_sources_checked || [],
    };
  } catch (err) {
    console.error("[AI Parser] Failed to parse scoring response:", err);
    console.error("[AI Parser] Raw text:", lastText.substring(0, 500));
    return createErrorResult("Failed to parse AI response");
  }
}

export function parseReEvalResponse(response: {
  content: Array<{ type: string; text?: string }>;
}): ReEvalResult {
  const textBlocks = response.content.filter(
    (block) => block.type === "text" && block.text
  );

  if (textBlocks.length === 0) {
    return {
      decision: "upheld",
      revisedFactualScore: 0,
      revisedFactualReasoning: "Unable to re-evaluate",
      revisedSupportScore: 0,
      revisedSupportReasoning: "Unable to re-evaluate",
      reviewNotes: "AI response was empty",
    };
  }

  const lastText = textBlocks[textBlocks.length - 1].text!;

  try {
    const jsonStr = extractJson(lastText);
    const parsed = JSON.parse(jsonStr);

    return {
      decision: parsed.decision === "overturned" ? "overturned" : "upheld",
      revisedFactualScore: parsed.revised_factual_score ?? 0,
      revisedFactualReasoning: parsed.revised_factual_reasoning || "",
      revisedSupportScore: parsed.revised_support_score ?? 0,
      revisedSupportReasoning: parsed.revised_support_reasoning || "",
      reviewNotes: parsed.review_notes || "",
    };
  } catch (err) {
    console.error("[AI Parser] Failed to parse re-eval response:", err);
    return {
      decision: "upheld",
      revisedFactualScore: 0,
      revisedFactualReasoning: "Parse error",
      revisedSupportScore: 0,
      revisedSupportReasoning: "Parse error",
      reviewNotes: "Failed to parse AI re-evaluation response",
    };
  }
}

function parseClaim(raw: Record<string, unknown>): ScoredClaim {
  return {
    claimText: String(raw.claim_text || ""),
    factualScore: Number(raw.factual_score) || 0,
    factualReasoning: String(raw.factual_reasoning || ""),
    factualSources: Array.isArray(raw.factual_sources)
      ? raw.factual_sources.map(String)
      : [],
    supportScore: Number(raw.support_score) || 0,
    supportReasoning: String(raw.support_reasoning || ""),
    isOpinion: Boolean(raw.is_opinion),
    isBadFaith: Boolean(raw.is_bad_faith),
    badFaithType: raw.bad_faith_type ? String(raw.bad_faith_type) : null,
  };
}

function extractJson(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}

function createErrorResult(message: string): ScoringResult {
  return {
    ruleViolation: false,
    violationDetail: null,
    claims: [],
    overallSummary: message,
    totalScore: 0,
    webSourcesChecked: [],
  };
}
