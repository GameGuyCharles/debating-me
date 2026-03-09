import { pool } from "@/lib/db";

export async function getDebateRules(debateId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT rule_text FROM debate_rules WHERE debate_id = $1 ORDER BY id`,
    [debateId]
  );
  return result.rows.map((r: { rule_text: string }) => r.rule_text);
}

export async function getInviteRules(inviteId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT rule_text FROM debate_rules WHERE invite_id = $1 ORDER BY id`,
    [inviteId]
  );
  return result.rows.map((r: { rule_text: string }) => r.rule_text);
}
