import { z } from "zod";

export const workspaceIdSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

const flowMessageSchema = z.object({
  content: z.string().trim().min(1).max(2_000),
  role: z.enum(["assistant", "user"]),
});

export const flowChatBodySchema = z.object({
  messages: z.array(flowMessageSchema).min(1).max(12),
});

export type FlowChatBody = z.infer<typeof flowChatBodySchema>;
export type FlowMessage = z.infer<typeof flowMessageSchema>;
