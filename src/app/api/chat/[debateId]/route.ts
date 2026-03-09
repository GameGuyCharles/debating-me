import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/chat/:debateId — Get chat history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ debateId: string }> }
) {
  const { debateId } = await params;

  const result = await pool.query(
    `SELECT sm.id, sm.user_id, sm.content, sm.created_at,
            u.username, u.avatar_url
     FROM spectator_messages sm
     JOIN users u ON sm.user_id = u.id
     WHERE sm.debate_id = $1 AND sm.is_shadow_hidden = FALSE
     ORDER BY sm.created_at
     LIMIT 200`,
    [debateId]
  );

  return NextResponse.json(result.rows);
}
