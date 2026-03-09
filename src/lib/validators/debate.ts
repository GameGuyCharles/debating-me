import { z } from "zod";

export const submitArgumentSchema = z.object({
  debateId: z.string().uuid(),
  content: z.string().max(10000, "Argument too long"),
});

export const flagScoreSchema = z.object({
  debateId: z.string().uuid(),
  turnId: z.string().uuid(),
  claimIndex: z.number().int().min(0),
  reason: z.string().max(500).optional(),
});

export type SubmitArgumentInput = z.infer<typeof submitArgumentSchema>;
export type FlagScoreInput = z.infer<typeof flagScoreSchema>;
