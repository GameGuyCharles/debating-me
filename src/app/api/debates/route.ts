import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/debates — List user's debates
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");

  let query = `
    SELECT d.*,
           ua.username as user_a_username, ua.display_name as user_a_display_name, ua.avatar_url as user_a_avatar_url,
           ub.username as user_b_username, ub.display_name as user_b_display_name, ub.avatar_url as user_b_avatar_url
    FROM debates d
    JOIN users ua ON d.user_a_id = ua.id
    JOIN users ub ON d.user_b_id = ub.id
    WHERE (d.user_a_id = $1 OR d.user_b_id = $1)
  `;
  const params: (string | number)[] = [session.user.id];

  if (status) {
    params.push(status);
    query += ` AND d.status = $${params.length}`;
  }

  query += ` ORDER BY d.created_at DESC LIMIT 50`;

  const result = await pool.query(query, params);
  return NextResponse.json(result.rows);
}
