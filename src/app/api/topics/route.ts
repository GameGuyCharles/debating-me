import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/topics — List all topic categories
export async function GET() {
  const result = await pool.query(
    `SELECT tc.*, COUNT(tb.id) as board_count
     FROM topic_categories tc
     LEFT JOIN topic_boards tb ON tc.id = tb.category_id
     GROUP BY tc.id
     ORDER BY tc.display_order`
  );

  return NextResponse.json(result.rows);
}
