import { z } from "zod";

export const createInviteSchema = z.object({
  recipientId: z.number().int().positive().optional(),
  inviteType: z.enum(["direct", "public", "link"]),
  topic: z.string().min(5, "Topic must be at least 5 characters").max(500),
  senderSide: z.enum(["for", "against"]),
  scheduledTime: z.string().datetime().optional(),
  turnTimeSecs: z
    .number()
    .int()
    .min(60, "Minimum 1 minute per turn")
    .max(1800, "Maximum 30 minutes per turn")
    .default(300),
  reviewTimeSecs: z
    .number()
    .int()
    .min(15, "Minimum 15 seconds review time")
    .max(300, "Maximum 5 minutes review time")
    .default(60),
  totalTurns: z
    .number()
    .int()
    .min(1, "At least 1 turn required")
    .max(10, "Maximum 10 turns")
    .default(3),
  rules: z.array(z.string().min(3).max(200)).max(10).default([]),
  topicBoardId: z.number().int().positive().optional(),
});

export const counterProposalSchema = z.object({
  turnTimeSecs: z.number().int().min(60).max(1800).optional(),
  reviewTimeSecs: z.number().int().min(15).max(300).optional(),
  totalTurns: z.number().int().min(1).max(10).optional(),
  scheduledTime: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
  addRules: z.array(z.string().min(3).max(200)).max(10).optional(),
  removeRuleIds: z.array(z.number().int().positive()).optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type CounterProposalInput = z.infer<typeof counterProposalSchema>;
