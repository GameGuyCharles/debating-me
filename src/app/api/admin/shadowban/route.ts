import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// POST /api/admin/shadowban — Shadow-ban a user (moderator only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is a moderator
  const modCheck = await pool.query(
    `SELECT role FROM users WHERE id = $1`,
    [session.user.id]
  );

  if (modCheck.rows.length === 0 || modCheck.rows[0].role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, reason, expiresAt } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Create shadow ban
  await pool.query(
    `INSERT INTO shadow_bans (user_id, banned_by, reason, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, session.user.id, reason || null, expiresAt || null]
  );

  // Update user flag
  await pool.query(
    `UPDATE users SET is_shadow_banned = TRUE WHERE id = $1`,
    [userId]
  );

  return NextResponse.json({ success: true });
}
