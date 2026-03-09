import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/invites/join?code=ABC123 — Look up invite by invite_code
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT di.id, di.topic, di.sender_side, di.status, di.invite_type,
            di.turn_time_secs, di.review_time_secs, di.total_turns,
            sender.username as sender_username
     FROM debate_invites di
     JOIN users sender ON di.sender_id = sender.id
     WHERE di.invite_code = $1`,
    [code]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = result.rows[0];
  return NextResponse.json(invite);
}
