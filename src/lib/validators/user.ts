import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores"
    ),
  displayName: z.string().max(100).optional().transform(v => v === "" ? undefined : v),
});

export const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional().transform(v => v === "" ? undefined : v),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
