import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/debates/live — List publicly visible live debates
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const topic = searchParams.get("topic");
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  let query = `
    SELECT d.id, d.topic, d.status, d.current_turn, d.total_turns,
           d.current_phase, d.spectator_count, d.created_at,
           d.user_a_score, d.user_b_score, d.active_user_id,
           d.user_a_id, d.user_b_id,
           ua.username as user_a_username, ua.display_name as user_a_display_name,
           ua.avatar_url as user_a_avatar_url,
           ub.username as user_b_username, ub.display_name as user_b_display_name,
           ub.avatar_url as user_b_avatar_url,
           tc.name as category_name, tc.slug as category_slug
    FROM debates d
    JOIN users ua ON d.user_a_id = ua.id
    JOIN users ub ON d.user_b_id = ub.id
    LEFT JOIN debate_invites di ON d.invite_id = di.id
    LEFT JOIN topic_boards tb ON di.topic_board_id = tb.id
    LEFT JOIN topic_categories tc ON tb.category_id = tc.id
    WHERE d.status IN ('coin_flip', 'in_progress')
  `;
  const params: unknown[] = [];

  if (topic) {
    params.push(`%${topic}%`);
    query += ` AND d.topic ILIKE $${params.length}`;
  }

  if (category) {
    params.push(category);
    query += ` AND tc.slug = $${params.length}`;
  }

  query += ` ORDER BY d.spectator_count DESC, d.created_at DESC`;
  params.push(limit);
  query += ` LIMIT $${params.length}`;
  params.push((page - 1) * limit);
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  return NextResponse.json(result.rows);
}
