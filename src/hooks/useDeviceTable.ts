import { useState } from "react";
import type { CommandType, Device } from "../api/types";

type Options = {
  onCommand: (deviceId: number, commandType: CommandType) => Promise<void>;
  onUpdate: (deviceId: number, input: { device_code: string; name: string; parking_lot_id: number }) => Promise<void>;
  onDelete: (deviceId: number) => Promise<void>;
  onError: (message: string) => void;
};

export function useDeviceTable({ onCommand, onUpdate, onDelete, onError }: Options) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDeviceCode, setEditDeviceCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editParkingLotId, setEditParkingLotId] = useState("");
  const [commandTarget, setCommandTarget] = useState<{ device: Device; commandType: CommandType } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  const requestCommand = (device: Device, commandType: CommandType) => setCommandTarget({ device, commandType });
  const cancelCommand = () => setCommandTarget(null);

  const confirmCommand = async () => {
    if (!commandTarget) return;
    setPendingId(commandTarget.device.id);
    try {
      await onCommand(commandTarget.device.id, commandTarget.commandType);
    } finally {
      setPendingId(null);
      setCommandTarget(null);
    }
  };

  const startEdit = (device: Device) => {
    setEditingId(device.id);
    setEditDeviceCode(device.device_code);
    setEditName(device.name ?? "");
    setEditParkingLotId(String(device.parking_lot_id));
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (deviceId: number) => {
    if (!editDeviceCode.trim() || !editParkingLotId) return;
    setPendingId(deviceId);
    try {
      await onUpdate(deviceId, {
        device_code: editDeviceCode.trim(),
        name: editName.trim(),
        parking_lot_id: Number(editParkingLotId),
      });
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

  return {
    pendingId,
    editingId,
    editDeviceCode,
    setEditDeviceCode,
    editName,
    setEditName,
    editParkingLotId,
    setEditParkingLotId,
    commandTarget,
    deleteTarget,
    requestCommand,
    cancelCommand,
    confirmCommand,
    startEdit,
    cancelEdit,
    saveEdit,
    requestDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
  };
}
