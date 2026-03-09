import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { counterProposalSchema } from "@/lib/validators/invite";
import { appEvents } from "@/lib/events";

// GET /api/invites/:inviteId — Get invite details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await params;

  const result = await pool.query(
    `SELECT di.*,
            sender.username as sender_username,
            sender.display_name as sender_display_name,
            sender.avatar_url as sender_avatar_url,
            recipient.username as recipient_username
     FROM debate_invites di
     JOIN users sender ON di.sender_id = sender.id
     LEFT JOIN users recipient ON di.recipient_id = recipient.id
     WHERE di.id = $1`,
    [inviteId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  // Get rules
  const rulesResult = await pool.query(
    `SELECT dr.id, dr.rule_text, dr.added_by, u.username as added_by_username
     FROM debate_rules dr
     JOIN users u ON dr.added_by = u.id
     WHERE dr.invite_id = $1 ORDER BY dr.id`,
    [inviteId]
  );

  // Get negotiation history
  const negoResult = await pool.query(
    `SELECT n.*, u.username as modified_by_username
     FROM invite_negotiations n
     JOIN users u ON n.modified_by = u.id
     WHERE n.invite_id = $1 ORDER BY n.created_at`,
    [inviteId]
  );

  const invite = result.rows[0];
  return NextResponse.json({
    ...invite,
    rules: rulesResult.rows,
    negotiations: negoResult.rows,
  });
}

// PATCH /api/invites/:inviteId — Counter-propose
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await params;
  const body = await req.json();

  const parsed = counterProposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify the invite exists and user is a participant
  const inviteResult = await pool.query(
    `SELECT * FROM debate_invites WHERE id = $1`,
    [inviteId]
  );

  if (inviteResult.rows.length === 0) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = inviteResult.rows[0];
  const userId = parseInt(session.user.id);

  if (invite.sender_id !== userId && invite.recipient_id !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (invite.status !== "pending" && invite.status !== "counter_proposed") {
    return NextResponse.json(
      { error: "Invite cannot be modified in its current state" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Build update query dynamically
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (data.turnTimeSecs !== undefined && data.turnTimeSecs !== invite.turn_time_secs) {
    changes.turn_time_secs = { old: invite.turn_time_secs, new: data.turnTimeSecs };
    updates.push(`turn_time_secs = $${paramIdx++}`);
    values.push(data.turnTimeSecs);
  }

  if (data.reviewTimeSecs !== undefined && data.reviewTimeSecs !== invite.review_time_secs) {
    changes.review_time_secs = { old: invite.review_time_secs, new: data.reviewTimeSecs };
    updates.push(`review_time_secs = $${paramIdx++}`);
    values.push(data.reviewTimeSecs);
  }

  if (data.totalTurns !== undefined && data.totalTurns !== invite.total_turns) {
    changes.total_turns = { old: invite.total_turns, new: data.totalTurns };
    updates.push(`total_turns = $${paramIdx++}`);
    values.push(data.totalTurns);
  }

  if (data.scheduledTime !== undefined) {
    changes.scheduled_time = { old: invite.scheduled_time, new: data.scheduledTime };
    updates.push(`scheduled_time = $${paramIdx++}`);
    values.push(data.scheduledTime);
  }

  // Always update status and last_modified_by
  updates.push(`status = 'counter_proposed'`);
  updates.push(`last_modified_by = $${paramIdx++}`);
  values.push(userId);
  updates.push(`updated_at = NOW()`);

  values.push(inviteId);

  await pool.query(
    `UPDATE debate_invites SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
    values
  );

  // Handle rule changes
  if (data.removeRuleIds?.length) {
    for (const ruleId of data.removeRuleIds) {
      await pool.query(
        `DELETE FROM debate_rules WHERE id = $1 AND invite_id = $2`,
        [ruleId, inviteId]
      );
    }
    changes.rules_removed = { old: null, new: data.removeRuleIds };
  }

  if (data.addRules?.length) {
    for (const rule of data.addRules) {
      await pool.query(
        `INSERT INTO debate_rules (invite_id, rule_text, added_by)
         VALUES ($1, $2, $3)`,
        [inviteId, rule, userId]
      );
    }
    changes.rules_added = { old: null, new: data.addRules };
  }

  // Record negotiation entry
  if (Object.keys(changes).length > 0) {
    await pool.query(
      `INSERT INTO invite_negotiations (invite_id, modified_by, changes_json, message)
       VALUES ($1, $2, $3, $4)`,
      [inviteId, userId, JSON.stringify(changes), data.message || null]
    );
  }

  // Notify the other party
  const targetUserId =
    invite.sender_id === userId ? invite.recipient_id : invite.sender_id;

  if (targetUserId) {
    appEvents.emit("invite:updated", {
      targetUserId,
      invite: { id: inviteId, status: "counter_proposed" },
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/invites/:inviteId — Decline or cancel an invite
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await params;
  const userId = parseInt(session.user.id);

  const inviteResult = await pool.query(
    `SELECT * FROM debate_invites WHERE id = $1`,
    [inviteId]
  );

  if (inviteResult.rows.length === 0) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = inviteResult.rows[0];

  if (invite.sender_id !== userId && invite.recipient_id !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (invite.status !== "pending" && invite.status !== "counter_proposed") {
    return NextResponse.json(
      { error: "Invite cannot be modified in its current state" },
      { status: 400 }
    );
  }

  // Sender cancels, recipient declines
  const newStatus = invite.sender_id === userId ? "cancelled" : "declined";

  await pool.query(
    `UPDATE debate_invites SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newStatus, inviteId]
  );

  // Notify the other party
  const targetUserId =
    invite.sender_id === userId ? invite.recipient_id : invite.sender_id;

  if (targetUserId) {
    appEvents.emit("invite:updated", {
      targetUserId,
      invite: { id: inviteId, status: newStatus },
    });
  }

  return NextResponse.json({ success: true });
}
