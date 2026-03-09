import type { Server, Socket } from "socket.io";
import { pool } from "@/lib/db";

export function handleChatEvents(io: Server, socket: Socket) {
  const user = socket.data.user;

  socket.on("chat:send", async ({ debateId, content }) => {
    try {
      if (!content || content.trim().length === 0) return;
      if (content.length > 500) return; // Max chat message length

      // Check if user is shadow banned
      const isBanned = user.isShadowBanned || (await isUserShadowBanned(user.userId));

      // Save message
      const result = await pool.query(
        `INSERT INTO spectator_messages (debate_id, user_id, content, is_shadow_hidden)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [debateId, user.userId, content.trim(), isBanned]
      );

      const message = {
        id: result.rows[0].id,
        userId: user.userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        content: content.trim(),
        createdAt: result.rows[0].created_at.toISOString(),
      };

      if (isBanned) {
        // Only send back to the banned user (they think it was posted)
        socket.emit("chat:message", message);
      } else {
        // Broadcast to all spectators and participants
        io.to(`debate:${debateId}`).emit("chat:message", message);
      }
    } catch (err) {
      console.error("[Chat] Send error:", err);
    }
  });

  socket.on("chat:report", async ({ messageId, reason }) => {
    try {
      await pool.query(
        `INSERT INTO chat_reports (message_id, reported_by, reason)
         VALUES ($1, $2, $3)`,
        [messageId, user.userId, reason]
      );
    } catch (err) {
      console.error("[Chat] Report error:", err);
    }
  });
}

async function isUserShadowBanned(userId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM shadow_bans
     WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}
