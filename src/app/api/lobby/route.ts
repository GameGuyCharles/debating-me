import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/lobby — List public open challenges
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const topic = searchParams.get("topic");
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  let query = `
    SELECT di.*, u.username, u.display_name, u.avatar_url, u.avg_score, u.total_debates,
           tc.name as category_name, tc.slug as category_slug
    FROM debate_invites di
    JOIN users u ON di.sender_id = u.id
    LEFT JOIN topic_boards tb ON di.topic_board_id = tb.id
    LEFT JOIN topic_categories tc ON tb.category_id = tc.id
    WHERE di.invite_type IN ('public', 'link')
      AND di.status = 'pending'
      AND (di.expires_at IS NULL OR di.expires_at > NOW())
  `;
  const params: unknown[] = [];

  if (topic) {
    params.push(`%${topic}%`);
    query += ` AND di.topic ILIKE $${params.length}`;
  }

  if (category) {
    params.push(category);
    query += ` AND tc.slug = $${params.length}`;
  }

  query += ` ORDER BY di.created_at DESC`;
  params.push(limit);
  query += ` LIMIT $${params.length}`;
  params.push((page - 1) * limit);
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  return NextResponse.json(result.rows);
}
