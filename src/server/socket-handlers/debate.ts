import type { Server, Socket } from "socket.io";
import { pool } from "@/lib/db";
import { scoringQueue } from "@/lib/ai/queue";
import { timerManager } from "@/lib/debate/timer";
import { performCoinFlip } from "@/lib/debate/coin-flip";

export function handleDebateEvents(io: Server, socket: Socket) {
  const user = socket.data.user;

  socket.on("debate:join", async (debateId: string) => {
    try {
      console.log(`[Debate] User ${user.username} (${user.userId}) joining debate ${debateId}`);

      const result = await pool.query(
        `SELECT * FROM debates WHERE id = $1`,
        [debateId]
      );
      if (result.rows.length === 0) {
        console.log(`[Debate] Debate ${debateId} not found`);
        return;
      }

      const debate = result.rows[0];

      // Verify user is a participant
      if (debate.user_a_id !== user.userId && debate.user_b_id !== user.userId) {
        console.log(`[Debate] User ${user.userId} is not a participant (a=${debate.user_a_id}, b=${debate.user_b_id})`);
        return; // Not a participant; use spectator:join instead
      }

      socket.join(`debate:${debateId}`);
      socket.join(`debate:${debateId}:participants`);

      // Send current debate state
      socket.emit("debate:state_update", {
        debateId,
        status: debate.status,
        phase: debate.current_phase,
        currentTurn: debate.current_turn,
        activeUserId: debate.active_user_id,
        userAScore: parseFloat(debate.user_a_score),
        userBScore: parseFloat(debate.user_b_score),
        spectatorCount: debate.spectator_count,
      });

      // If both participants are in the room and status is coin_flip, start
      const room = io.sockets.adapter.rooms.get(`debate:${debateId}:participants`);
      const roomSize = room ? room.size : 0;
      console.log(`[Debate] Room participants: ${roomSize}, debate status: ${debate.status}`);

      if (room && room.size >= 2 && debate.status === "coin_flip") {
        await startCoinFlip(io, debateId, debate.user_a_id, debate.user_b_id);
      }
    } catch (err) {
      console.error("[Debate] Join error:", err);
    }
  });

  socket.on("debate:submit_arg", async ({ debateId, content }) => {
    try {
      const result = await pool.query(
        `SELECT * FROM debates WHERE id = $1`,
        [debateId]
      );
      if (result.rows.length === 0) return;

      const debate = result.rows[0];

      // Validate it's this user's turn
      if (debate.active_user_id !== user.userId) return;
      if (debate.current_phase !== "writing" &&
          debate.current_phase !== "closing_a" &&
          debate.current_phase !== "closing_b") return;

      // Clear the turn timer
      timerManager.clearTimer(debateId);

      // Transition to AI scoring
      await pool.query(
        `UPDATE debates SET current_phase = 'ai_scoring' WHERE id = $1`,
        [debateId]
      );

      io.to(`debate:${debateId}`).emit("debate:state_update", {
        debateId,
        status: debate.status,
        phase: "ai_scoring",
        currentTurn: debate.current_turn,
        activeUserId: debate.active_user_id,
        userAScore: parseFloat(debate.user_a_score),
        userBScore: parseFloat(debate.user_b_score),
        spectatorCount: debate.spectator_count,
        message: "AI is analyzing the argument...",
      });

      // Determine turn type
      const isClosing = debate.current_phase === "closing_a" || debate.current_phase === "closing_b";
      const turnType = debate.current_turn <= 1 ? "opening" : isClosing ? "closing" : "rebuttal";

      // Get rules and previous turns for context
      const rulesResult = await pool.query(
        `SELECT rule_text FROM debate_rules WHERE debate_id = $1`,
        [debateId]
      );
      const rules = rulesResult.rows.map((r: { rule_text: string }) => r.rule_text);

      const turnsResult = await pool.query(
        `SELECT turn_number, user_id, raw_content, turn_type FROM debate_turns
         WHERE debate_id = $1 ORDER BY turn_number`,
        [debateId]
      );

      const side = debate.user_a_id === user.userId ? debate.user_a_side : debate.user_b_side;

      // Enqueue for AI scoring
      scoringQueue.add(debateId, {
        id: `${debateId}-${debate.current_turn}`,
        debateId,
        userId: user.userId,
        content,
        turnNumber: debate.current_turn,
        turnType,
        side,
        topic: debate.topic,
        rules,
        previousTurns: turnsResult.rows.map((t: { turn_number: number; user_id: number; raw_content: string; turn_type: string }) => ({
          turnNumber: t.turn_number,
          userId: t.user_id,
          side: t.user_id === debate.user_a_id ? debate.user_a_side : debate.user_b_side,
          content: t.raw_content,
          turnType: t.turn_type,
        })),
      });
    } catch (err) {
      console.error("[Debate] Submit error:", err);
    }
  });

  // Save draft (for auto-submit on timer expiry)
  socket.on("debate:draft", ({ debateId, content }) => {
    draftStore.set(`${debateId}:${user.userId}`, content);
  });

  socket.on("debate:leave", (debateId: string) => {
    socket.leave(`debate:${debateId}`);
    socket.leave(`debate:${debateId}:participants`);
  });

  socket.on("debate:flag_score", async ({ debateId, turnId, claimIndex, reason }) => {
    try {
      // Check flag budget (max 2 per user per debate)
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM score_flags
         WHERE debate_id = $1 AND flagged_by = $2`,
        [debateId, user.userId]
      );

      if (parseInt(countResult.rows[0].count) >= 2) {
        return; // Exceeded flag limit
      }

      // Create the flag
      const flagResult = await pool.query(
        `INSERT INTO score_flags (debate_id, turn_id, flagged_by, claim_index, reason)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [debateId, turnId, user.userId, claimIndex, reason]
      );

      // Get the original turn for re-evaluation context
      const turnResult = await pool.query(
        `SELECT dt.*, d.topic, d.user_a_side, d.user_b_side, d.user_a_id
         FROM debate_turns dt
         JOIN debates d ON dt.debate_id = d.id
         WHERE dt.id = $1`,
        [turnId]
      );

      if (turnResult.rows.length === 0) return;

      const turn = turnResult.rows[0];
      const analysis = turn.ai_analysis_json;
      if (!analysis?.claims?.[claimIndex]) return;

      const side = turn.user_id === turn.user_a_id ? turn.user_a_side : turn.user_b_side;

      // Queue re-evaluation
      scoringQueue.addReEvaluation({
        flagId: flagResult.rows[0].id,
        turnId,
        claimIndex,
        reason: reason || null,
        originalClaim: analysis.claims[claimIndex],
        topic: turn.topic,
        side,
        fullArgument: turn.raw_content,
      });
    } catch (err) {
      console.error("[Debate] Flag error:", err);
    }
  });
}

// In-memory draft storage for auto-submit
const draftStore = new Map<string, string>();

export function getDraft(debateId: string, userId: number): string {
  return draftStore.get(`${debateId}:${userId}`) || "";
}

export function clearDraft(debateId: string, userId: number): void {
  draftStore.delete(`${debateId}:${userId}`);
}

async function startCoinFlip(
  io: Server,
  debateId: string,
  userAId: number,
  userBId: number
) {
  console.log(`[CoinFlip] Starting coin flip for debate ${debateId}`);
  const { winnerId, result } = performCoinFlip(userAId, userBId);

  // Update debate state
  await pool.query(
    `UPDATE debates SET
       first_turn_user_id = $1,
       status = 'in_progress',
       current_turn = 1,
       current_phase = 'writing',
       active_user_id = $1,
       turn_started_at = NOW()
     WHERE id = $2`,
    [winnerId, debateId]
  );

  console.log(`[CoinFlip] Winner: ${winnerId}, result: ${result}`);

  // Broadcast coin flip result
  io.to(`debate:${debateId}`).emit("debate:coin_flip", { winnerId, result });

  // Also broadcast a state_update so clients that missed the coin_flip event
  // (e.g. due to React StrictMode reconnect) can dismiss the coin flip screen
  const updatedDebate = await pool.query(
    `SELECT * FROM debates WHERE id = $1`,
    [debateId]
  );
  const debate = updatedDebate.rows[0];

  io.to(`debate:${debateId}`).emit("debate:state_update", {
    debateId,
    status: "in_progress",
    phase: "writing",
    currentTurn: 1,
    activeUserId: winnerId,
    userAScore: parseFloat(debate.user_a_score),
    userBScore: parseFloat(debate.user_b_score),
    spectatorCount: debate.spectator_count,
  });

  // After a brief delay for animation, start the first turn timer
  const turnTimeSecs = debate.turn_time_secs;

  setTimeout(() => {
    const endsAt = new Date(Date.now() + turnTimeSecs * 1000).toISOString();

    io.to(`debate:${debateId}`).emit("debate:turn_start", {
      userId: winnerId,
      turnNumber: 1,
      phase: "writing",
      endsAt,
    });

    // Start server-side timer
    timerManager.startTurnTimer(
      debateId,
      turnTimeSecs,
      () => handleTimerExpiry(io, debateId),
      (secondsRemaining) => {
        io.to(`debate:${debateId}`).emit("debate:timer_tick", { secondsRemaining });
      }
    );

    console.log(`[CoinFlip] Turn 1 started for debate ${debateId}, timer: ${turnTimeSecs}s`);
  }, 3000); // 3s for coin flip animation
}

async function handleTimerExpiry(io: Server, debateId: string) {
  try {
    const result = await pool.query(`SELECT * FROM debates WHERE id = $1`, [debateId]);
    if (result.rows.length === 0) return;

    const debate = result.rows[0];
    const activeUserId = debate.active_user_id;
    if (!activeUserId) return;

    // Auto-submit whatever draft exists
    const draft = draftStore.get(`${debateId}:${activeUserId}`) || "";
    clearDraft(debateId, activeUserId);

    io.to(`debate:${debateId}`).emit("debate:auto_submit", {
      turnNumber: debate.current_turn,
    });

    // Transition to AI scoring
    await pool.query(
      `UPDATE debates SET current_phase = 'ai_scoring' WHERE id = $1`,
      [debateId]
    );

    const isClosing = debate.current_phase === "closing_a" || debate.current_phase === "closing_b";
    const turnType = debate.current_turn === 1 ? "opening" : isClosing ? "closing" : "rebuttal";

    const rulesResult = await pool.query(
      `SELECT rule_text FROM debate_rules WHERE debate_id = $1`, [debateId]
    );
    const turnsResult = await pool.query(
      `SELECT turn_number, user_id, raw_content, turn_type FROM debate_turns
       WHERE debate_id = $1 ORDER BY turn_number`, [debateId]
    );

    const side = debate.user_a_id === activeUserId ? debate.user_a_side : debate.user_b_side;

    scoringQueue.add(debateId, {
      id: `${debateId}-${debate.current_turn}-auto`,
      debateId,
      userId: activeUserId,
      content: draft,
      turnNumber: debate.current_turn,
      turnType,
      side,
      topic: debate.topic,
      rules: rulesResult.rows.map((r: { rule_text: string }) => r.rule_text),
      previousTurns: turnsResult.rows.map((t: { turn_number: number; user_id: number; raw_content: string; turn_type: string }) => ({
        turnNumber: t.turn_number,
        userId: t.user_id,
        side: t.user_id === debate.user_a_id ? debate.user_a_side : debate.user_b_side,
        content: t.raw_content,
        turnType: t.turn_type,
      })),
    });
  } catch (err) {
    console.error("[Debate] Timer expiry error:", err);
  }
}
