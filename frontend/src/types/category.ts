export interface Category {
  id: string;
  groupId: string;
  name: string;
  parentId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CategoryFormPayload {
  name: string;
  parentId: string | null;
}

export interface DeletePreview {
  subCategoriesCount: number;
  affectedExpensesCount: number;
}

/** Same shape as DeletePreview, surfaced on the 409 has_dependencies envelope. */
export type BlockerInfo = DeletePreview;

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

/**
 * Discriminated error union — mirrors the expense service shape so the two
 * features stay consistent. The backend's machine-readable `code` is preserved
 * on the conflict/forbidden/server variants so callers can branch on the
 * specific FR-016 codes (idempotency.conflict, idempotency.cross_resource_conflict)
 * and the category codes (category.duplicate_name, category.role_immutable,
 * category.parent_not_root, category.parent_invalid, category.has_dependencies).
 */
export type CategoryServiceError =
  | { kind: 'validation'; status: number; message: string; fieldErrors: FieldError[] }
  | { kind: 'not_authenticated'; message: string }
  | { kind: 'forbidden'; code: string; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'conflict'; code: string; message: string; blockers?: BlockerInfo }
  | { kind: 'network'; message: string }
  | { kind: 'server'; status: number; code: string; message: string };
