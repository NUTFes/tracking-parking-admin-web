import { useState } from "react";
import type { ParkingLot } from "../api/types";

type Options = {
  onUpdate: (lotId: number, input: { name: string; capacity: number }) => Promise<void>;
  onDelete: (lotId: number) => Promise<void>;
  onReset: (lotId: number, input: { count: number; note?: string }) => Promise<void>;
  onError: (message: string) => void;
};

export function useParkingLotTable({ onUpdate, onDelete, onReset, onError }: Options) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null);
  const [resetTarget, setResetTarget] = useState<ParkingLot | null>(null);
  const [resetCount, setResetCount] = useState("");
  const [resetNote, setResetNote] = useState("");

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
    setResetCount(String(lot.current_count));
    setResetNote("");
  };

  const cancelReset = () => setResetTarget(null);

  const confirmReset = async () => {
    if (!resetTarget || !resetCount) return;
    setPendingId(resetTarget.id);
    try {
      await onReset(resetTarget.id, { count: Number(resetCount), note: resetNote.trim() || undefined });
      setResetTarget(null);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setPendingId(null);
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
    resetCount,
    setResetCount,
    resetNote,
    setResetNote,
    requestReset,
    cancelReset,
    confirmReset,
  };
}
