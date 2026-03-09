import { parse } from "cookie";
import { pool } from "@/lib/db";
import { decode } from "next-auth/jwt";
import type { Socket } from "socket.io";

export async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const cookies = parse(socket.handshake.headers.cookie || "");
    const sessionToken =
      cookies["authjs.session-token"] ||
      cookies["__Secure-authjs.session-token"];

    if (!sessionToken) {
      return next(new Error("Unauthorized: No session token"));
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return next(new Error("Server misconfigured: no AUTH_SECRET"));
    }

    // Decode the JWT token
    const token = await decode({
      token: sessionToken,
      secret,
      salt: cookies["__Secure-authjs.session-token"]
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    });

    if (!token?.id) {
      return next(new Error("Unauthorized: Invalid token"));
    }

    // Fetch full user data from DB
    const result = await pool.query(
      `SELECT id, username, role, is_shadow_banned, display_name, avatar_url
       FROM users WHERE id = $1`,
      [token.id]
    );

    if (result.rows.length === 0) {
      return next(new Error("Unauthorized: User not found"));
    }

    const user = result.rows[0];
    socket.data.user = {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
      isShadowBanned: user.is_shadow_banned,
    };

    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Authentication failed"));
  }
}
