import { z } from "zod";

export const systemCategoryQuerySchema = z.object({
  transactionType: z.enum(["income", "expense"]).optional(),
});
