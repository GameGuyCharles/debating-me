import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createInviteSchema } from "@/lib/validators/invite";
import { nanoid } from "nanoid";
import { appEvents } from "@/lib/events";

// POST /api/invites — Create a debate invite
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const inviteCode = data.inviteType === "link" ? nanoid(10) : null;

  const result = await pool.query(
    `INSERT INTO debate_invites
     (sender_id, recipient_id, invite_type, invite_code, topic, sender_side,
      scheduled_time, turn_time_secs, review_time_secs, total_turns, topic_board_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      session.user.id,
      data.recipientId || null,
      data.inviteType,
      inviteCode,
      data.topic,
      data.senderSide,
      data.scheduledTime || null,
      data.turnTimeSecs,
      data.reviewTimeSecs,
      data.totalTurns,
      data.topicBoardId || null,
    ]
  );

  const invite = result.rows[0];

  // Insert custom rules
  if (data.rules.length > 0) {
    for (const rule of data.rules) {
      await pool.query(
        `INSERT INTO debate_rules (invite_id, rule_text, added_by)
         VALUES ($1, $2, $3)`,
        [invite.id, rule, session.user.id]
      );
    }
  }

  // Notify recipient via EventEmitter -> Socket.io
  if (data.recipientId) {
    appEvents.emit("invite:created", {
      recipientId: data.recipientId,
      invite: {
        id: invite.id,
        senderId: parseInt(session.user.id),
        senderUsername: session.user.username,
        senderAvatarUrl: session.user.image,
        recipientId: data.recipientId,
        topic: data.topic,
        senderSide: data.senderSide,
        scheduledTime: data.scheduledTime || null,
        turnTimeSecs: data.turnTimeSecs,
        reviewTimeSecs: data.reviewTimeSecs,
        totalTurns: data.totalTurns,
        status: "pending",
        inviteType: data.inviteType,
        rules: data.rules,
      },
    });
  }

  return NextResponse.json(invite, { status: 201 });
}

// GET /api/invites — List user's invites
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");

  let query = `
    SELECT di.*,
           sender.username as sender_username,
           sender.display_name as sender_display_name,
           sender.avatar_url as sender_avatar_url,
           recipient.username as recipient_username,
           recipient.display_name as recipient_display_name,
           recipient.avatar_url as recipient_avatar_url
    FROM debate_invites di
    JOIN users sender ON di.sender_id = sender.id
    LEFT JOIN users recipient ON di.recipient_id = recipient.id
    WHERE (di.sender_id = $1 OR di.recipient_id = $1)
  `;
  const params: (string | number)[] = [session.user.id];

  if (status) {
    params.push(status);
    query += ` AND di.status = $${params.length}`;
  }

  query += ` ORDER BY di.updated_at DESC LIMIT 50`;

  const result = await pool.query(query, params);
  return NextResponse.json(result.rows);
}
