import { z } from "zod";

export const feedbackBodySchema = z.object({
  category: z.enum(["suggestion", "issue", "general"]),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(1_000, "Description must be 1000 characters or fewer."),
});
