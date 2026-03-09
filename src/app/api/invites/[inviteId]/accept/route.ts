import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { nanoid } from "nanoid";
import { appEvents } from "@/lib/events";

// POST /api/invites/:inviteId/accept — Accept invite and create debate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await params;
  const userId = parseInt(session.user.id);

  // Get invite
  const inviteResult = await pool.query(
    `SELECT * FROM debate_invites WHERE id = $1`,
    [inviteId]
  );

  if (inviteResult.rows.length === 0) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = inviteResult.rows[0];

  // Verify user can accept (must be recipient, or public/link invite)
  if (invite.invite_type === "direct" && invite.recipient_id !== userId) {
    return NextResponse.json({ error: "Not authorized to accept" }, { status: 403 });
  }

  if (invite.sender_id === userId) {
    return NextResponse.json({ error: "Cannot accept your own invite" }, { status: 400 });
  }

  if (invite.status !== "pending" && invite.status !== "counter_proposed") {
    return NextResponse.json(
      { error: "Invite is no longer available" },
      { status: 400 }
    );
  }

  // Update invite status
  await pool.query(
    `UPDATE debate_invites SET status = 'accepted', recipient_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [userId, inviteId]
  );

  // Determine sides
  const recipientSide = invite.sender_side === "for" ? "against" : "for";

  // Create the debate (starts in coin_flip status — coin flip triggers when both join via socket)
  const debateResult = await pool.query(
    `INSERT INTO debates
     (invite_id, user_a_id, user_b_id, topic, user_a_side, user_b_side,
      turn_time_secs, review_time_secs, total_turns, replay_slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      inviteId,
      invite.sender_id,
      userId,
      invite.topic,
      invite.sender_side,
      recipientSide,
      invite.turn_time_secs,
      invite.review_time_secs,
      invite.total_turns,
      nanoid(8),
    ]
  );

  const debate = debateResult.rows[0];

  // Copy rules from invite to debate
  await pool.query(
    `UPDATE debate_rules SET debate_id = $1 WHERE invite_id = $2`,
    [debate.id, inviteId]
  );

  // Notify the sender that their invite was accepted — so they can join the debate
  appEvents.emit("invite:accepted", {
    senderId: invite.sender_id,
    debateId: debate.id,
    topic: invite.topic,
    acceptedBy: session.user.username || session.user.name,
  });

  return NextResponse.json(debate, { status: 201 });
}
