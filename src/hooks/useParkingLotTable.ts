import { useState } from "react";
import type { ParkingLot, ResetTarget } from "../api/types";

type Options = {
  onUpdate: (lotId: number, input: { name: string; capacity: number }) => Promise<void>;
  onDelete: (lotId: number) => Promise<void>;
  onReset: (lotId: number, input: { count: number; target: ResetTarget; note?: string }) => Promise<void>;
  onResetAll: (target: ResetTarget) => Promise<void>;
  onError: (message: string) => void;
};

export function useParkingLotTable({ onUpdate, onDelete, onReset, onResetAll, onError }: Options) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null);
  const [resetTarget, setResetTarget] = useState<ParkingLot | null>(null);
  const [resetField, setResetFieldState] = useState<ResetTarget>("current");
  const [resetCount, setResetCount] = useState("");
  const [resetNote, setResetNote] = useState("");
  const [resetAllTarget, setResetAllTarget] = useState<ResetTarget | null>(null);

  const startEdit = (lot: ParkingLot) => {
    setEditingId(lot.id);
    setEditName(lot.name);
    setEditCapacity(String(lot.capacity));
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (lotId: number) => {
    if (!editName.trim() || !editCapacity) return;
    setPendingId(lotId);
    try {
      await onUpdate(lotId, { name: editName.trim(), capacity: Number(editCapacity) });
      setEditingId(null);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setPendingId(null);
    }
  };

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

  const requestReset = (lot: ParkingLot) => {
    setResetTarget(lot);
    setResetFieldState("current");
    setResetCount(String(lot.current_count));
    setResetNote("");
  };

  const cancelReset = () => setResetTarget(null);

  // Switching 人力/システム also refreshes the pre-filled count to that
  // field's current value, since the two counts usually differ.
  const setResetField = (field: ResetTarget) => {
    setResetFieldState(field);
    if (resetTarget) {
      setResetCount(String(field === "current" ? resetTarget.current_count : resetTarget.system_count));
    }
  };

  const confirmReset = async () => {
    if (!resetTarget || !resetCount) return;
    setPendingId(resetTarget.id);
    try {
      await onReset(resetTarget.id, {
        count: Number(resetCount),
        target: resetField,
        note: resetNote.trim() || undefined,
      });
      setResetTarget(null);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  const requestResetAll = (field: ResetTarget) => setResetAllTarget(field);
  const cancelResetAll = () => setResetAllTarget(null);

  const confirmResetAll = async () => {
    if (!resetAllTarget) return;
    try {
      await onResetAll(resetAllTarget);
      setResetAllTarget(null);
    } catch (err) {
      onError((err as Error).message);
    }
  };

  return {
    editingId,
    editName,
    setEditName,
    editCapacity,
    setEditCapacity,
    pendingId,
    deleteTarget,
    startEdit,
    cancelEdit,
    saveEdit,
    requestDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
    resetTarget,
    resetField,
    setResetField,
    resetCount,
    setResetCount,
    resetNote,
    setResetNote,
    requestReset,
    cancelReset,
    confirmReset,
    resetAllTarget,
    requestResetAll,
    cancelResetAll,
    confirmResetAll,
  };
}
