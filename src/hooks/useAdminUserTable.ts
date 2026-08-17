import { useState } from "react";
import type { AdminUser } from "../api/types";

type Options = {
  onDelete: (userId: number) => Promise<void>;
  onError: (message: string) => void;
};

export function useAdminUserTable({ onDelete, onError }: Options) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await onDelete(deleteTarget.id);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
    }
  };

  return {
    pendingId,
    deleteTarget,
    requestDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
  };
}
