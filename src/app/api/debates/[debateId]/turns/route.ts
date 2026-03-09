import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/debates/:debateId/turns — Get all turns with scoring
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ debateId: string }> }
) {
  const { debateId } = await params;

  const result = await pool.query(
    `SELECT dt.*, u.username, u.display_name, u.avatar_url
     FROM debate_turns dt
     JOIN users u ON dt.user_id = u.id
     WHERE dt.debate_id = $1
     ORDER BY dt.turn_number`,
    [debateId]
  );

  return NextResponse.json(result.rows);
}
