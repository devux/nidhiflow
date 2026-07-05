import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  archiveCategory,
  createCategory,
  listCategories,
  updateCategory,
  type CategoryResource,
} from "../../../data/api/financeClient";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";

export function SettingsPage() {
  const { accessToken, activeWorkspace } = useAuth();
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const [categoryState, setCategoryState] = useState<"error" | "idle" | "loading" | "saving">(
    "idle",
  );
  const [editingCategory, setEditingCategory] = useState<CategoryResource | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  useEffect(() => {
    if (!accessToken || !activeWorkspace) return;
    let active = true;
    setCategoryState("loading");

    void listCategories({
      accessToken,
      trackLoading: false,
      workspaceId: activeWorkspace.id,
    })
      .then((records) => {
        if (!active) return;
        setCategories(records);
        setCategoryState("idle");
      })
      .catch(() => {
        if (active) setCategoryState("error");
      });

    return () => {
      active = false;
    };
  }, [accessToken, activeWorkspace]);

  function openCategoryDialog(category?: CategoryResource) {
    setEditingCategory(category ?? null);
    setCategoryName(category?.name ?? "");
    setCategoryType(category?.transactionType === "income" ? "income" : "expense");
    setCategoryState("idle");
    setIsCategoryDialogOpen(true);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = categoryName.trim();
    if (!accessToken || !activeWorkspace || !normalizedName) return;
    setCategoryState("saving");

    try {
      const category = editingCategory
        ? await updateCategory({
            accessToken,
            categoryId: editingCategory.id,
            name: normalizedName,
            transactionType: categoryType,
            workspaceId: activeWorkspace.id,
          })
        : await createCategory({
            accessToken,
            name: normalizedName,
            transactionType: categoryType,
            workspaceId: activeWorkspace.id,
          });
      setCategories((current) => [...current.filter((item) => item.id !== category.id), category]);
      setCategoryState("idle");
      setIsCategoryDialogOpen(false);
    } catch {
      setCategoryState("error");
    }
  }

  async function handleCategoryDelete() {
    if (!accessToken || !activeWorkspace || !editingCategory) return;
    setCategoryState("saving");

    try {
      await archiveCategory({
        accessToken,
        categoryId: editingCategory.id,
        workspaceId: activeWorkspace.id,
      });
      setCategories((current) => current.filter((item) => item.id !== editingCategory.id));
      setCategoryState("idle");
      setIsCategoryDialogOpen(false);
    } catch {
      setCategoryState("error");
    }
  }

  return (
    <main className="page page--settings" id="main-content">
      <PageHeader title="Settings" />

      <section aria-labelledby="category-settings-title">
        <Card className="profile-category-preferences">
          <div className="profile-category-preferences__heading">
            <span>
              <strong id="category-settings-title">Categories</strong>
              <small>
                Default categories stay read-only. Your categories belong to this workspace.
              </small>
            </span>
            <Button onClick={() => openCategoryDialog()} variant="secondary">
              <Icon name="plus" size={18} />
              Add
            </Button>
          </div>

          {categoryState === "loading" ? <p role="status">Loading categories…</p> : null}
          {categoryState === "error" ? (
            <p className="form-error" role="alert">
              Categories could not be loaded or saved.
            </p>
          ) : null}

          <div className="profile-category-preferences__group">
            <strong>Default</strong>
            <div className="profile-category-chips">
              {categories
                .filter((category) => category.isSystem)
                .map((category) => (
                  <span key={category.id}>
                    {category.name}
                    <small>{category.transactionType}</small>
                  </span>
                ))}
            </div>
          </div>

          <div className="profile-category-preferences__group">
            <strong>Your categories</strong>
            {categories.some((category) => !category.isSystem) ? (
              <div className="profile-custom-categories">
                {categories
                  .filter((category) => !category.isSystem)
                  .map((category) => (
                    <button
                      aria-label={`Edit ${category.name} category`}
                      key={category.id}
                      onClick={() => openCategoryDialog(category)}
                      type="button"
                    >
                      <span>
                        <strong>{category.name}</strong>
                        <small>{category.transactionType}</small>
                      </span>
                      <span>Edit</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p>No custom categories yet.</p>
            )}
          </div>
        </Card>
      </section>

      <Dialog
        aria-labelledby="category-dialog-title"
        fullWidth
        maxWidth="xs"
        onClose={() => setIsCategoryDialogOpen(false)}
        open={isCategoryDialogOpen}
        slotProps={{ paper: { className: "profile-dialog" } }}
      >
        <DialogTitle id="category-dialog-title">
          {editingCategory ? "Edit category" : "Add category"}
        </DialogTitle>
        <IconButton
          aria-label="Close category editor"
          className="profile-dialog__close"
          onClick={() => setIsCategoryDialogOpen(false)}
          size="small"
        >
          <CloseRoundedIcon aria-hidden="true" />
        </IconButton>
        <DialogContent>
          <form
            className="settings-form profile-category-form"
            onSubmit={(event) => void handleCategorySubmit(event)}
          >
            <label htmlFor="category-name">Name</label>
            <input
              autoFocus
              id="category-name"
              maxLength={80}
              onChange={(event) => setCategoryName(event.target.value)}
              required
              value={categoryName}
            />
            <label htmlFor="category-type">Transaction type</label>
            <select
              id="category-type"
              onChange={(event) => setCategoryType(event.target.value as typeof categoryType)}
              value={categoryType}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            {categoryState === "error" ? (
              <p className="form-error" role="alert">
                This category could not be saved. Check the name and try again.
              </p>
            ) : null}
            <div className="profile-category-form__actions">
              {editingCategory ? (
                <Button
                  disabled={categoryState === "saving"}
                  onClick={() => void handleCategoryDelete()}
                  variant="quiet"
                >
                  Delete
                </Button>
              ) : null}
              <Button disabled={categoryState === "saving"} type="submit">
                {categoryState === "saving" ? "Saving" : "Save category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
