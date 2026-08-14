import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { DeviceCreated, ResetTarget } from "../api/types";
import { usePolling } from "./usePolling";

const POLL_INTERVAL_MS = 5000;

export function useDashboard() {
  const { user, logout } = useAuth();
  const health = usePolling(api.health, POLL_INTERVAL_MS);
  const parkingLots = usePolling(api.listParkingLots, POLL_INTERVAL_MS);
  const devices = usePolling(api.listDevices, POLL_INTERVAL_MS);
  const [revealedDevice, setRevealedDevice] = useState<DeviceCreated | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const notifyError = (message: string) => setNotice(message);
  const dismissNotice = () => setNotice(null);
  const dismissRevealedDevice = () => setRevealedDevice(null);

  const handleRestart = async (deviceId: number) => {
    try {
      await api.queueRestart(deviceId, user?.email ?? "admin-console");
      devices.refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  };

  const handleDeviceCreated = (device: DeviceCreated) => {
    setRevealedDevice(device);
    devices.refresh();
  };

  const handleParkingLotUpdate = async (lotId: number, input: { name: string; capacity: number }) => {
    await api.updateParkingLot(lotId, input);
    parkingLots.refresh();
  };

  const handleParkingLotDelete = async (lotId: number) => {
    await api.deleteParkingLot(lotId);
    parkingLots.refresh();
  };

  const handleParkingLotReset = async (
    lotId: number,
    input: { count: number; target: ResetTarget; note?: string },
  ) => {
    await api.resetParkingLot(lotId, input);
    parkingLots.refresh();
  };

  const handleParkingLotResetAll = async (target: ResetTarget) => {
    await api.resetAllParkingLots({ target });
    parkingLots.refresh();
  };

  const handleDeviceUpdate = async (
    deviceId: number,
    input: { device_code: string; name: string; parking_lot_id: number },
  ) => {
    await api.updateDevice(deviceId, input);
    devices.refresh();
  };

  const handleDeviceDelete = async (deviceId: number) => {
    await api.deleteDevice(deviceId);
    devices.refresh();
  };

  const serverOnline = health.data?.status === "ok";

  return {
    user,
    logout,
    health,
    serverOnline,
    parkingLots,
    devices,
    revealedDevice,
    dismissRevealedDevice,
    notice,
    notifyError,
    dismissNotice,
    handleRestart,
    handleDeviceCreated,
    handleParkingLotUpdate,
    handleParkingLotDelete,
    handleParkingLotReset,
    handleParkingLotResetAll,
    handleDeviceUpdate,
    handleDeviceDelete,
  };
}
