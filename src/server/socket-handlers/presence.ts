import type { Server, Socket } from "socket.io";
import { pool } from "@/lib/db";

// Track which debates each socket is spectating
const socketDebates = new Map<string, Set<string>>();

export function handlePresenceEvents(io: Server, socket: Socket) {
  socket.on("spectator:join", async (debateId: string) => {
    try {
      // Join both the spectator-specific and main debate room
      socket.join(`debate:${debateId}:spectators`);
      socket.join(`debate:${debateId}`);

      // Track this socket's spectated debates
      if (!socketDebates.has(socket.id)) {
        socketDebates.set(socket.id, new Set());
      }
      socketDebates.get(socket.id)!.add(debateId);

      // Increment spectator count
      await pool.query(
        `UPDATE debates SET spectator_count = spectator_count + 1 WHERE id = $1`,
        [debateId]
      );

      const result = await pool.query(
        `SELECT spectator_count FROM debates WHERE id = $1`,
        [debateId]
      );

      if (result.rows.length > 0) {
        io.to(`debate:${debateId}`).emit("spectator:count", {
          debateId,
          count: result.rows[0].spectator_count,
        });
      }
    } catch (err) {
      console.error("[Presence] Spectator join error:", err);
    }
  });

  socket.on("spectator:leave", async (debateId: string) => {
    await removeSpectator(io, socket, debateId);
  });

  socket.on("disconnect", async () => {
    const debates = socketDebates.get(socket.id);
    if (debates) {
      for (const debateId of debates) {
        await removeSpectator(io, socket, debateId);
      }
      socketDebates.delete(socket.id);
    }
  });
}

async function removeSpectator(io: Server, socket: Socket, debateId: string) {
  try {
    socket.leave(`debate:${debateId}:spectators`);
    socket.leave(`debate:${debateId}`);

    socketDebates.get(socket.id)?.delete(debateId);

    await pool.query(
      `UPDATE debates SET spectator_count = GREATEST(spectator_count - 1, 0) WHERE id = $1`,
      [debateId]
    );

    const result = await pool.query(
      `SELECT spectator_count FROM debates WHERE id = $1`,
      [debateId]
    );

    if (result.rows.length > 0) {
      io.to(`debate:${debateId}`).emit("spectator:count", {
        debateId,
        count: result.rows[0].spectator_count,
      });
    }
  } catch (err) {
    console.error("[Presence] Remove spectator error:", err);
  }
}
