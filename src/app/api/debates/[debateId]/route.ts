import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/debates/:debateId — Get debate details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ debateId: string }> }
) {
  const { debateId } = await params;

  const result = await pool.query(
    `SELECT d.*,
            ua.username as user_a_username, ua.display_name as user_a_display_name, ua.avatar_url as user_a_avatar_url,
            ub.username as user_b_username, ub.display_name as user_b_display_name, ub.avatar_url as user_b_avatar_url
     FROM debates d
     JOIN users ua ON d.user_a_id = ua.id
     JOIN users ub ON d.user_b_id = ub.id
     WHERE d.id = $1`,
    [debateId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}
