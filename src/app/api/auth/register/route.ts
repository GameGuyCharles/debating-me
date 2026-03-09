import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { registerSchema } from "@/lib/validators/user";
import bcrypt from "bcryptjs";

// POST /api/auth/register — Register a new user
export async function POST(req: NextRequest) {
  const body = await req.json();

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, username, displayName } = parsed.data;

  // Check if email already exists
  const emailCheck = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (emailCheck.rows.length > 0) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  // Check if username already exists
  const usernameCheck = await pool.query(
    `SELECT id FROM users WHERE username = $1`,
    [username]
  );
  if (usernameCheck.rows.length > 0) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user (with password_hash in a column we need to add)
  const result = await pool.query(
    `INSERT INTO users (email, username, display_name, name, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, username, display_name`,
    [email, username, displayName || username, displayName || username, passwordHash]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
