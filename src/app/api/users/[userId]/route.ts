import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/users/:userId — Get user profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const result = await pool.query(
    `SELECT id, username, display_name, avatar_url, bio, role,
            total_debates, wins, losses, draws, avg_score, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = result.rows[0];
  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    role: user.role,
    totalDebates: user.total_debates,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    avgScore: parseFloat(user.avg_score),
    createdAt: user.created_at,
  });
}
