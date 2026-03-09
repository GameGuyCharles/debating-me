import { z } from "zod";

export const chatMessageSchema = z.object({
  debateId: z.string().uuid(),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500, "Message too long"),
});

export const chatReportSchema = z.object({
  messageId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatReportInput = z.infer<typeof chatReportSchema>;
