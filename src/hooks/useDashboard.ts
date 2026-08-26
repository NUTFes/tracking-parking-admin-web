import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { CommandType, DeviceCreated, ResetTarget } from "../api/types";
import { COMMAND_LABELS } from "../api/types";
import { usePolling } from "./usePolling";

const POLL_INTERVAL_MS = 5000;
// How often (and how long) to watch for a queued command's result before
// giving up — the device only picks it up on its next heartbeat, so this
// isn't instant.
const COMMAND_POLL_INTERVAL_MS = 1500;
const COMMAND_POLL_TIMEOUT_MS = 20000;
const COMMAND_NOTICE_CLEAR_MS = 4000;

type CommandNotice = { severity: "info" | "success" | "warning" | "error"; message: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useDashboard() {
  const { user, logout } = useAuth();
  const health = usePolling(api.health, POLL_INTERVAL_MS);
  const parkingLots = usePolling(api.listParkingLots, POLL_INTERVAL_MS);
  const devices = usePolling(api.listDevices, POLL_INTERVAL_MS);
  const activities = usePolling(api.listAllActivities, POLL_INTERVAL_MS);
  const adminUsers = usePolling(api.listAdminUsers, POLL_INTERVAL_MS);
  const [revealedDevice, setRevealedDevice] = useState<DeviceCreated | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commandNotice, setCommandNotice] = useState<CommandNotice | null>(null);

  const notifyError = (message: string) => setNotice(message);
  const dismissNotice = () => setNotice(null);
  const dismissRevealedDevice = () => setRevealedDevice(null);
  const dismissCommandNotice = () => setCommandNotice(null);

  // Shows `next` right away; if `autoClearMs` is given, clears it again after
  // that delay — but only if a newer notice hasn't replaced it in the
  // meantime (identity check against the exact object we just set).
  const showCommandNotice = (next: CommandNotice, autoClearMs?: number) => {
    setCommandNotice(next);
    if (autoClearMs) {
      setTimeout(() => setCommandNotice((current) => (current === next ? null : current)), autoClearMs);
    }
  };

  const pollCommandResult = async (deviceId: number, commandId: number, label: string) => {
    const deadline = Date.now() + COMMAND_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(COMMAND_POLL_INTERVAL_MS);
      const commands = await api.listCommands(deviceId);
      const command = commands.find((c) => c.id === commandId);
      if (command?.status === "completed" || command?.status === "failed") {
        const succeeded = command.status === "completed";
        showCommandNotice(
          {
            severity: succeeded ? "success" : "error",
            message:
              `${label}${succeeded ? "が完了しました" : "に失敗しました"}` +
              (command.result_message ? `: ${command.result_message}` : ""),
          },
          COMMAND_NOTICE_CLEAR_MS,
        );
        devices.refresh();
        return;
      }
    }
    showCommandNotice(
      { severity: "warning", message: `${label}の応答がありません（デバイスが未応答の可能性があります）` },
      COMMAND_NOTICE_CLEAR_MS,
    );
  };

  // Resolves as soon as the command is queued (so callers — e.g. the confirm
  // dialog — aren't left waiting on the slow part). Watching for the actual
  // result happens in the background and only ever touches commandNotice.
  const handleDeviceCommand = async (deviceId: number, commandType: CommandType) => {
    const label = COMMAND_LABELS[commandType];
    showCommandNotice({ severity: "info", message: `${label}を送信しています…` });
    let queued;
    try {
      queued = await api.queueCommand(deviceId, commandType, user?.email ?? "admin-console");
    } catch (err) {
      showCommandNotice({ severity: "error", message: (err as Error).message }, COMMAND_NOTICE_CLEAR_MS);
      return;
    }
    devices.refresh();
    void pollCommandResult(deviceId, queued.id, label);
  };

  const handleDeviceCreated = (device: DeviceCreated) => {
    setRevealedDevice(device);
    devices.refresh();
  };

  const handleParkingLotUpdate = async (
    lotId: number,
    input: { name?: string; capacity?: number; x_percent?: number; y_percent?: number },
  ) => {
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
    activities.refresh();
  };

  const handleParkingLotResetAll = async (target: ResetTarget) => {
    await api.resetAllParkingLots({ target });
    parkingLots.refresh();
    activities.refresh();
  };

  const handleDeviceUpdate = async (
    deviceId: number,
    input: { device_code: string; name?: string; parking_lot_id: number },
  ) => {
    await api.updateDevice(deviceId, input);
    devices.refresh();
  };

  const handleDeviceDelete = async (deviceId: number) => {
    await api.deleteDevice(deviceId);
    devices.refresh();
  };

  const handleAdminUserCreated = () => {
    adminUsers.refresh();
  };

  const handleAdminUserDelete = async (userId: number) => {
    await api.deleteAdminUser(userId);
    adminUsers.refresh();
  };

  const serverOnline = health.data?.status === "ok";

  return {
    user,
    logout,
    health,
    serverOnline,
    parkingLots,
    devices,
    activities,
    adminUsers,
    revealedDevice,
    dismissRevealedDevice,
    notice,
    notifyError,
    dismissNotice,
    commandNotice,
    dismissCommandNotice,
    handleDeviceCommand,
    handleDeviceCreated,
    handleParkingLotUpdate,
    handleParkingLotDelete,
    handleParkingLotReset,
    handleParkingLotResetAll,
    handleDeviceUpdate,
    handleDeviceDelete,
    handleAdminUserCreated,
    handleAdminUserDelete,
  };
}
