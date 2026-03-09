import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/users?q=searchTerm — Search users by username
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  const exact = req.nextUrl.searchParams.get("exact");

  // Exact username lookup (for profile pages) — includes self
  if (exact) {
    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, avg_score, total_debates
       FROM users WHERE username = $1 LIMIT 1`,
      [exact]
    );
    return NextResponse.json(result.rows);
  }

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT id, username, display_name, avatar_url, avg_score, total_debates
     FROM users
     WHERE username ILIKE $1 AND id != $2
     ORDER BY total_debates DESC
     LIMIT 20`,
    [`%${q}%`, session.user.id]
  );

  return NextResponse.json(result.rows);
}
