import { pool } from "@/lib/db";
import type { DbDebate } from "@/types/database";
import type { ScoringResult } from "@/types/scoring";

/**
 * Debate state machine transition logic.
 * Called after AI scoring completes to advance the debate to the next phase.
 */
export async function advanceDebateState(
  debateId: string,
  scoringResult: ScoringResult,
  userId: number,
  wasAutoSubmitted: boolean,
  originalContent: string = ""
): Promise<{
  nextPhase: string;
  nextActiveUserId: number | null;
  isComplete: boolean;
}> {
  const result = await pool.query(`SELECT * FROM debates WHERE id = $1`, [debateId]);
  if (result.rows.length === 0) throw new Error("Debate not found");

  const debate: DbDebate = result.rows[0];
  const otherUserId =
    debate.user_a_id === userId ? debate.user_b_id : debate.user_a_id;

  // Update scores
  const scoreColumn = debate.user_a_id === userId ? "user_a_score" : "user_b_score";
  const scoreDelta = scoringResult.ruleViolation ? -1 : scoringResult.totalScore;

  await pool.query(
    `UPDATE debates SET ${scoreColumn} = ${scoreColumn} + $1 WHERE id = $2`,
    [scoreDelta, debateId]
  );

  // Save the turn
  // NOTE: current_phase is 'ai_scoring' here (overwritten before scoring runs),
  // so we detect closing by turn number instead
  const turnType = debate.current_turn <= 1 ? "opening" :
    debate.current_turn > debate.total_turns ? "closing" :
    "rebuttal";

  await pool.query(
    `INSERT INTO debate_turns
     (debate_id, user_id, turn_number, turn_type, raw_content, was_auto_submitted,
      total_score, rule_violation, violation_detail, ai_analysis_json,
      started_at, submitted_at, scored_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
    [
      debateId,
      userId,
      debate.current_turn,
      turnType,
      scoringResult.ruleViolation ? "[REMOVED - Rule Violation]" : originalContent,
      wasAutoSubmitted,
      scoringResult.totalScore,
      scoringResult.ruleViolation,
      scoringResult.violationDetail,
      JSON.stringify({
        claims: scoringResult.claims,
        overall_summary: scoringResult.overallSummary,
        web_sources_checked: scoringResult.webSourcesChecked,
        total_score: scoringResult.totalScore,
      }),
      debate.turn_started_at || new Date(),
    ]
  );

  // Determine next state
  return determineNextPhase(debateId, debate, userId, otherUserId);
}

async function determineNextPhase(
  debateId: string,
  debate: DbDebate,
  currentUserId: number,
  otherUserId: number
): Promise<{
  nextPhase: string;
  nextActiveUserId: number | null;
  isComplete: boolean;
}> {
  const { current_turn, total_turns, first_turn_user_id } = debate;
  const isFirstUserInTurn = currentUserId === first_turn_user_id;

  // IMPORTANT: We detect closing phase by turn number, NOT by current_phase.
  // current_phase gets overwritten to 'ai_scoring' before this function runs,
  // so checking current_phase === "closing_a" would always fail.
  //
  // When current_turn > total_turns, we're in closing territory:
  //   - If the first user just submitted → their closing is done → move to closing_b
  //   - If the second user just submitted → both closings done → debate complete
  if (current_turn > total_turns) {
    if (isFirstUserInTurn) {
      // First user's closing just scored → second user's closing
      await pool.query(
        `UPDATE debates SET
           current_phase = 'closing_b',
           active_user_id = $1,
           turn_started_at = NOW()
         WHERE id = $2`,
        [otherUserId, debateId]
      );
      return { nextPhase: "closing_b", nextActiveUserId: otherUserId, isComplete: false };
    } else {
      // Second user's closing just scored → debate is complete
      return await completeDebate(debateId);
    }
  }

  // Regular turns: check if this was the first or second user in the current turn
  if (isFirstUserInTurn) {
    // First user just went. Now it's the second user's turn (with review time first).
    await pool.query(
      `UPDATE debates SET
         current_phase = 'reviewing',
         active_user_id = $1
       WHERE id = $2`,
      [otherUserId, debateId]
    );
    return { nextPhase: "reviewing", nextActiveUserId: otherUserId, isComplete: false };
  } else {
    // Second user just went. This completes one full round.
    const nextTurn = current_turn + 1;

    if (nextTurn > total_turns) {
      // All regular turns done, move to closing arguments
      // The first turn user gives closing first
      await pool.query(
        `UPDATE debates SET
           current_turn = $1,
           current_phase = 'closing_a',
           active_user_id = $2,
           turn_started_at = NOW()
         WHERE id = $3`,
        [nextTurn, first_turn_user_id, debateId]
      );
      return {
        nextPhase: "closing_a",
        nextActiveUserId: first_turn_user_id,
        isComplete: false,
      };
    } else {
      // Next round: first user goes again (with review time first)
      await pool.query(
        `UPDATE debates SET
           current_turn = $1,
           current_phase = 'reviewing',
           active_user_id = $2
         WHERE id = $3`,
        [nextTurn, first_turn_user_id, debateId]
      );
      return {
        nextPhase: "reviewing",
        nextActiveUserId: first_turn_user_id,
        isComplete: false,
      };
    }
  }
}

async function completeDebate(
  debateId: string
): Promise<{
  nextPhase: string;
  nextActiveUserId: number | null;
  isComplete: boolean;
}> {
  const result = await pool.query(`SELECT * FROM debates WHERE id = $1`, [debateId]);
  const debate = result.rows[0];

  const userAScore = parseFloat(debate.user_a_score);
  const userBScore = parseFloat(debate.user_b_score);

  let winnerId: number | null = null;
  if (userAScore > userBScore) winnerId = debate.user_a_id;
  else if (userBScore > userAScore) winnerId = debate.user_b_id;
  // null = draw

  await pool.query(
    `UPDATE debates SET
       status = 'completed',
       current_phase = 'finished',
       active_user_id = NULL,
       winner_id = $1,
       completed_at = NOW(),
       replay_slug = SUBSTRING(id::text, 1, 8)
     WHERE id = $2`,
    [winnerId, debateId]
  );

  // Update user stats
  await updateUserStats(debate.user_a_id, debate.user_b_id, winnerId);

  return { nextPhase: "finished", nextActiveUserId: null, isComplete: true };
}

async function updateUserStats(
  userAId: number,
  userBId: number,
  winnerId: number | null
) {
  // Increment total_debates for both
  await pool.query(
    `UPDATE users SET total_debates = total_debates + 1, updated_at = NOW()
     WHERE id IN ($1, $2)`,
    [userAId, userBId]
  );

  if (winnerId) {
    const loserId = winnerId === userAId ? userBId : userAId;

    await pool.query(
      `UPDATE users SET wins = wins + 1, updated_at = NOW() WHERE id = $1`,
      [winnerId]
    );
    await pool.query(
      `UPDATE users SET losses = losses + 1, updated_at = NOW() WHERE id = $1`,
      [loserId]
    );
  } else {
    // Draw
    await pool.query(
      `UPDATE users SET draws = draws + 1, updated_at = NOW()
       WHERE id IN ($1, $2)`,
      [userAId, userBId]
    );
  }

  // Update average scores
  for (const userId of [userAId, userBId]) {
    await pool.query(
      `UPDATE users SET avg_score = COALESCE(
         (SELECT AVG(total_score) FROM debate_turns WHERE user_id = $1),
         0
       ), updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }
}
