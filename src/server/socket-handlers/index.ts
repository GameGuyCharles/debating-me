import type { Server, Socket } from "socket.io";
import { handleDebateEvents, getDraft, clearDraft } from "./debate";
import { handleChatEvents } from "./chat";
import { handleInviteEvents } from "./invite";
import { handlePresenceEvents } from "./presence";
import { scoringQueue } from "@/lib/ai/queue";
import { advanceDebateState } from "@/lib/debate/engine";
import { timerManager } from "@/lib/debate/timer";
import { pool } from "@/lib/db";
import type { ScoringJob, ScoringResult, ReEvalJob, ReEvalResult } from "@/types/scoring";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    console.log(`[Socket] Connected: ${user.username} (${socket.id})`);

    // Join user's personal room for direct notifications
    socket.join(`user:${user.userId}`);

    handleDebateEvents(io, socket);
    handleChatEvents(io, socket);
    handleInviteEvents(io, socket);
    handlePresenceEvents(io, socket);

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${user.username} (${socket.id})`);
    });
  });

  // Wire up scoring queue completion → debate engine → Socket.io
  scoringQueue.events.on(
    "scored",
    async ({
      debateId,
      job,
      result,
    }: {
      debateId: string;
      job: ScoringJob;
      result: ScoringResult;
    }) => {
      try {
        // Advance the debate state machine
        const { nextPhase, nextActiveUserId, isComplete } =
          await advanceDebateState(debateId, result, job.userId, false, job.content);

        // Query the just-inserted turn from the DB to send full ScoredTurn
        const turnResult = await pool.query(
          `SELECT * FROM debate_turns
           WHERE debate_id = $1 AND user_id = $2
           ORDER BY turn_number DESC, scored_at DESC
           LIMIT 1`,
          [debateId, job.userId]
        );

        if (turnResult.rows.length > 0) {
          const t = turnResult.rows[0];
          io.to(`debate:${debateId}`).emit("debate:arg_scored", {
            turn: {
              id: t.id,
              debateId: t.debate_id,
              userId: t.user_id,
              turnNumber: t.turn_number,
              turnType: t.turn_type,
              rawContent: t.raw_content,
              wasAutoSubmitted: t.was_auto_submitted,
              totalScore: parseFloat(t.total_score),
              ruleViolation: t.rule_violation,
              violationDetail: t.violation_detail,
              aiAnalysis: t.ai_analysis_json,
              submittedAt: t.submitted_at,
              scoredAt: t.scored_at,
            },
          });
        }

        if (isComplete) {
          // Fetch final scores
          const debateResult = await pool.query(
            `SELECT * FROM debates WHERE id = $1`,
            [debateId]
          );
          const debate = debateResult.rows[0];

          io.to(`debate:${debateId}`).emit("debate:completed", {
            debateId,
            winnerId: debate.winner_id,
            userAScore: parseFloat(debate.user_a_score),
            userBScore: parseFloat(debate.user_b_score),
            replaySlug: debate.replay_slug,
          });
        } else {
          // Fetch updated scores
          const debateResult = await pool.query(
            `SELECT * FROM debates WHERE id = $1`,
            [debateId]
          );
          const debate = debateResult.rows[0];

          // Broadcast state update
          io.to(`debate:${debateId}`).emit("debate:state_update", {
            debateId,
            status: debate.status,
            phase: nextPhase,
            currentTurn: debate.current_turn,
            activeUserId: nextActiveUserId,
            userAScore: parseFloat(debate.user_a_score),
            userBScore: parseFloat(debate.user_b_score),
            spectatorCount: debate.spectator_count,
          });

          // If entering review phase, emit review timer and schedule writing transition
          if (nextPhase === "reviewing") {
            const reviewTimeSecs = debate.review_time_secs;
            const reviewEndsAt = new Date(Date.now() + reviewTimeSecs * 1000).toISOString();

            console.log(`[Review] Starting ${reviewTimeSecs}s review for user ${nextActiveUserId}`);
            io.to(`debate:${debateId}`).emit("debate:review_start", {
              endsAt: reviewEndsAt,
              userId: nextActiveUserId,
            });

            setTimeout(() => {
              // After review, transition to writing
              handleReviewComplete(io, debateId);
            }, reviewTimeSecs * 1000);
          } else if (
            nextPhase === "writing" ||
            nextPhase === "closing_a" ||
            nextPhase === "closing_b"
          ) {
            startWritingTimer(io, debateId, debate.turn_time_secs, nextActiveUserId!, debate.current_turn);
          }
        }
      } catch (err) {
        console.error("[Scoring→Engine] Error advancing debate:", err);
      }
    }
  );

  // Wire up re-evaluation completion
  scoringQueue.events.on(
    "reeval_complete",
    async ({ job, result }: { job: ReEvalJob; result: ReEvalResult }) => {
      try {
        // Update the flag with the result
        await pool.query(
          `UPDATE score_flags SET
             status = $1,
             revised_score_json = $2,
             reviewed_at = NOW()
           WHERE id = $3`,
          [result.decision, JSON.stringify(result), job.flagId]
        );

        // If overturned, adjust the scores
        if (result.decision === "overturned") {
          const turnResult = await pool.query(
            `SELECT dt.*, d.user_a_id FROM debate_turns dt
             JOIN debates d ON dt.debate_id = d.id
             WHERE dt.id = $1`,
            [job.turnId]
          );
          if (turnResult.rows.length > 0) {
            const turn = turnResult.rows[0];
            const analysis = turn.ai_analysis_json;
            if (analysis?.claims?.[job.claimIndex]) {
              const oldClaim = analysis.claims[job.claimIndex];
              const scoreDiff =
                (result.revisedFactualScore - oldClaim.factual_score) +
                (result.revisedSupportScore - oldClaim.support_score);

              // Update the claim in the analysis JSON
              analysis.claims[job.claimIndex] = {
                ...oldClaim,
                factual_score: result.revisedFactualScore,
                factual_reasoning: result.revisedFactualReasoning,
                support_score: result.revisedSupportScore,
                support_reasoning: result.revisedSupportReasoning,
                was_revised: true,
                review_notes: result.reviewNotes,
              };

              await pool.query(
                `UPDATE debate_turns SET ai_analysis_json = $1 WHERE id = $2`,
                [JSON.stringify(analysis), job.turnId]
              );

              // Adjust debate score
              const scoreColumn =
                turn.user_id === turn.user_a_id
                  ? "user_a_score"
                  : "user_b_score";
              await pool.query(
                `UPDATE debates SET ${scoreColumn} = ${scoreColumn} + $1 WHERE id = $2`,
                [scoreDiff, turn.debate_id]
              );

              // Broadcast the re-evaluation result
              io.to(`debate:${turn.debate_id}`).emit("debate:reeval_result", {
                debateId: turn.debate_id,
                turnId: job.turnId,
                claimIndex: job.claimIndex,
                decision: result.decision,
                revisedFactualScore: result.revisedFactualScore,
                revisedSupportScore: result.revisedSupportScore,
                reviewNotes: result.reviewNotes,
              });
            }
          }
        }
      } catch (err) {
        console.error("[ReEval] Error processing result:", err);
      }
    }
  );
}

async function handleReviewComplete(io: Server, debateId: string) {
  try {
    const result = await pool.query(`SELECT * FROM debates WHERE id = $1`, [
      debateId,
    ]);
    if (result.rows.length === 0) return;

    const debate = result.rows[0];

    // Only transition if still in reviewing phase
    if (debate.current_phase !== "reviewing") return;

    // Transition from reviewing to writing
    await pool.query(
      `UPDATE debates SET current_phase = 'writing', turn_started_at = NOW() WHERE id = $1`,
      [debateId]
    );

    io.to(`debate:${debateId}`).emit("debate:state_update", {
      debateId,
      status: debate.status,
      phase: "writing",
      currentTurn: debate.current_turn,
      activeUserId: debate.active_user_id,
      userAScore: parseFloat(debate.user_a_score),
      userBScore: parseFloat(debate.user_b_score),
      spectatorCount: debate.spectator_count,
    });

    console.log(`[Review] Complete for debate ${debateId}, starting writing timer`);
    startWritingTimer(io, debateId, debate.turn_time_secs, debate.active_user_id, debate.current_turn);
  } catch (err) {
    console.error("[Review] Error completing review:", err);
  }
}

function startWritingTimer(
  io: Server,
  debateId: string,
  turnTimeSecs: number,
  activeUserId: number,
  currentTurn: number
) {
  const endsAt = new Date(Date.now() + turnTimeSecs * 1000).toISOString();

  io.to(`debate:${debateId}`).emit("debate:turn_start", {
    userId: activeUserId,
    turnNumber: currentTurn,
    phase: "writing",
    endsAt,
  });

  timerManager.startTurnTimer(
    debateId,
    turnTimeSecs,
    async () => {
      // Auto-submit on timer expiry
      const draft = getDraft(debateId, activeUserId);
      clearDraft(debateId, activeUserId);

      io.to(`debate:${debateId}`).emit("debate:auto_submit", {
        turnNumber: 0,
      });

      // Transition to AI scoring
      await pool.query(
        `UPDATE debates SET current_phase = 'ai_scoring' WHERE id = $1`,
        [debateId]
      );

      const debateResult = await pool.query(
        `SELECT * FROM debates WHERE id = $1`,
        [debateId]
      );
      const debate = debateResult.rows[0];
      const isClosing =
        debate.current_phase === "closing_a" ||
        debate.current_phase === "closing_b";
      const turnType =
        debate.current_turn <= 1
          ? "opening"
          : isClosing
            ? "closing"
            : "rebuttal";

      const rulesResult = await pool.query(
        `SELECT rule_text FROM debate_rules WHERE debate_id = $1`,
        [debateId]
      );
      const turnsResult = await pool.query(
        `SELECT turn_number, user_id, raw_content, turn_type FROM debate_turns
         WHERE debate_id = $1 ORDER BY turn_number`,
        [debateId]
      );

      const side =
        debate.user_a_id === activeUserId
          ? debate.user_a_side
          : debate.user_b_side;

      scoringQueue.add(debateId, {
        id: `${debateId}-${debate.current_turn}-auto`,
        debateId,
        userId: activeUserId,
        content: draft,
        turnNumber: debate.current_turn,
        turnType,
        side,
        topic: debate.topic,
        rules: rulesResult.rows.map(
          (r: { rule_text: string }) => r.rule_text
        ),
        previousTurns: turnsResult.rows.map(
          (t: {
            turn_number: number;
            user_id: number;
            raw_content: string;
            turn_type: string;
          }) => ({
            turnNumber: t.turn_number,
            userId: t.user_id,
            side:
              t.user_id === debate.user_a_id
                ? debate.user_a_side
                : debate.user_b_side,
            content: t.raw_content,
            turnType: t.turn_type,
          })
        ),
      });
    },
    (secondsRemaining) => {
      io.to(`debate:${debateId}`).emit("debate:timer_tick", {
        secondsRemaining,
      });
    }
  );
}
