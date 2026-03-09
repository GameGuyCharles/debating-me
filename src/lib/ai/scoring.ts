import Anthropic from "@anthropic-ai/sdk";
import { buildScoringPrompt, buildReEvalPrompt } from "./prompts";
import { parseScoringResponse, parseReEvalResponse } from "./claim-parser";
import type { ScoringJob, ScoringResult, ReEvalJob, ReEvalResult } from "@/types/scoring";

// Lazy-init: Anthropic client must NOT be created at module load time
// because env vars aren't available yet when tsx imports modules.
// We also explicitly pass the apiKey because the SDK's auto-detection
// can fail when env vars are loaded via @next/env's loadEnvConfig.
let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(
        "[Scoring] ANTHROPIC_API_KEY not found in process.env!",
        "Available ANTHROPIC* keys:",
        Object.keys(process.env).filter((k) => k.includes("ANTHROPIC"))
      );
      throw new Error("ANTHROPIC_API_KEY is not set in the environment");
    }
    console.log(`[Scoring] Initializing Anthropic client (key length: ${apiKey.length})`);
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

export async function scoreArgument(job: ScoringJob): Promise<ScoringResult> {
  const systemPrompt = buildScoringPrompt(job);

  const response = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Score the following debate argument.\n\nTopic: "${job.topic}"\nUser's side: "${job.side}"\nTurn ${job.turnNumber} (${job.turnType})\n\nArgument:\n${job.content}`,
      },
    ],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 8,
      },
    ],
  });

  return parseScoringResponse(response);
}

export async function reEvaluateClaim(job: ReEvalJob): Promise<ReEvalResult> {
  const systemPrompt = buildReEvalPrompt(job.originalClaim, job.reason, {
    topic: job.topic,
    side: job.side,
    fullArgument: job.fullArgument,
  });

  const response = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Re-evaluate this claim: "${job.originalClaim.claimText}"`,
      },
    ],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ],
  });

  return parseReEvalResponse(response);
}
