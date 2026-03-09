import { EventEmitter } from "node:events";
import { scoreArgument, reEvaluateClaim } from "./scoring";
import type { ScoringJob, ScoringResult, ReEvalJob, ReEvalResult } from "@/types/scoring";

class ScoringQueue {
  private queues: Map<string, ScoringJob[]> = new Map();
  private processing: Set<string> = new Set();
  private reEvalQueue: ReEvalJob[] = [];
  private reEvalProcessing = false;
  public events = new EventEmitter();

  add(debateId: string, job: ScoringJob) {
    if (!this.queues.has(debateId)) {
      this.queues.set(debateId, []);
    }
    this.queues.get(debateId)!.push(job);
    this.process(debateId);
  }

  private async process(debateId: string) {
    if (this.processing.has(debateId)) return;
    this.processing.add(debateId);

    const queue = this.queues.get(debateId);
    while (queue && queue.length > 0) {
      const job = queue.shift()!;
      try {
        console.log(`[Scoring] Processing argument for debate ${debateId}, turn ${job.turnNumber}`);
        const result = await scoreArgument(job);
        console.log(`[Scoring] Complete: score=${result.totalScore}, violation=${result.ruleViolation}`);
        this.events.emit("scored", { debateId, job, result });
      } catch (error) {
        console.error(`[Scoring] Error processing debate ${debateId}:`, error);
        // Emit a fallback result so the debate doesn't get stuck
        const fallbackResult: ScoringResult = {
          ruleViolation: false,
          violationDetail: null,
          claims: [],
          overallSummary: "AI scoring encountered an error. No score assigned.",
          totalScore: 0,
          webSourcesChecked: [],
        };
        this.events.emit("scored", { debateId, job, result: fallbackResult });
      }
    }

    this.processing.delete(debateId);
  }

  addReEvaluation(job: ReEvalJob) {
    this.reEvalQueue.push(job);
    this.processReEvals();
  }

  private async processReEvals() {
    if (this.reEvalProcessing) return;
    this.reEvalProcessing = true;

    while (this.reEvalQueue.length > 0) {
      const job = this.reEvalQueue.shift()!;
      try {
        console.log(`[ReEval] Processing flag ${job.flagId}`);
        const result = await reEvaluateClaim(job);
        console.log(`[ReEval] Complete: decision=${result.decision}`);
        this.events.emit("reeval_complete", { job, result });
      } catch (error) {
        console.error(`[ReEval] Error processing flag ${job.flagId}:`, error);
        const fallbackResult: ReEvalResult = {
          decision: "upheld",
          revisedFactualScore: job.originalClaim.factualScore,
          revisedFactualReasoning: "Re-evaluation failed due to an error",
          revisedSupportScore: job.originalClaim.supportScore,
          revisedSupportReasoning: "Re-evaluation failed due to an error",
          reviewNotes: "An error occurred during re-evaluation. Original score upheld.",
        };
        this.events.emit("reeval_complete", { job, result: fallbackResult });
      }
    }

    this.reEvalProcessing = false;
  }
}

export const scoringQueue = new ScoringQueue();
