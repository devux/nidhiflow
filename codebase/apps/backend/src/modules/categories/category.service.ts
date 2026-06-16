import type { CategoryRepository } from "./category.repository.js";

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async listSystemCategories(transactionType?: "income" | "expense") {
    return this.repository.listSystemCategories(transactionType);
  }
}
