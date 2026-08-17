import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, authApi } from "../api/client";
import { AuthProvider } from "../auth/AuthContext";
import { useDashboard } from "./useDashboard";
import type {
  AdminUser,
  Device,
  DeviceCommand,
  DeviceCreated,
  HealthStatus,
  ParkingActivity,
  ParkingLot,
} from "../api/types";

const HEALTH_OK: HealthStatus = { status: "ok", database: "ok", timestamp: "2026-08-15T00:00:00+09:00" };

function mockAllPollingEndpoints(
  overrides: Partial<{
    health: HealthStatus;
    parkingLots: ParkingLot[];
    devices: Device[];
    activities: ParkingActivity[];
    adminUsers: AdminUser[];
  }> = {},
) {
  vi.spyOn(api, "health").mockResolvedValue(overrides.health ?? HEALTH_OK);
  vi.spyOn(api, "listParkingLots").mockResolvedValue(overrides.parkingLots ?? []);
  vi.spyOn(api, "listDevices").mockResolvedValue(overrides.devices ?? []);
  vi.spyOn(api, "listAllActivities").mockResolvedValue(overrides.activities ?? []);
  vi.spyOn(api, "listAdminUsers").mockResolvedValue(overrides.adminUsers ?? []);
}

function renderDashboardHook() {
  return renderHook(() => useDashboard(), { wrapper: AuthProvider });
}

beforeEach(() => {
  // AuthProvider bootstraps a session from the refresh-token cookie on
  // mount via a real fetch() — stub it so these tests never depend on (or
  // hang waiting for) a real backend being reachable.
  vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useDashboard", () => {
  it("healthがokの場合、serverOnlineがtrueになることを確認する", async () => {
    mockAllPollingEndpoints();
    const { result } = renderDashboardHook();

    await waitFor(() => expect(result.current.serverOnline).toBe(true));
  });

  it("healthがok以外の場合、serverOnlineがfalseになることを確認する", async () => {
    mockAllPollingEndpoints({
      health: { status: "degraded", database: "error", timestamp: "2026-08-15T00:00:00+09:00" },
    });
    const { result } = renderDashboardHook();

    await waitFor(() => expect(result.current.health.data?.status).toBe("degraded"));
    expect(result.current.serverOnline).toBe(false);
  });

  it("notifyError/dismissNoticeでエラー通知の表示・非表示を制御できることを確認する", async () => {
    mockAllPollingEndpoints();
    const { result } = renderDashboardHook();
    await waitFor(() => expect(result.current.health.loading).toBe(false));

    act(() => result.current.notifyError("エラーです"));
    expect(result.current.notice).toBe("エラーです");

    act(() => result.current.dismissNotice());
    expect(result.current.notice).toBeNull();
  });

  it("handleDeviceCreatedはrevealedDeviceをセットし、デバイス一覧を再取得することを確認する", async () => {
    mockAllPollingEndpoints();
    const spy = vi.spyOn(api, "listDevices");
    const { result } = renderDashboardHook();
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    const created: DeviceCreated = {
      id: 1,
      device_code: "trapa-dev1",
      name: null,
      parking_lot_id: 1,
      api_key: "secret-key",
    };
    act(() => result.current.handleDeviceCreated(created));

    expect(result.current.revealedDevice).toEqual(created);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

    act(() => result.current.dismissRevealedDevice());
    expect(result.current.revealedDevice).toBeNull();
  });

  it("handleParkingLotUpdate/Delete/Reset/ResetAllが対応するAPIを正しい引数で呼ぶことを確認する", async () => {
    mockAllPollingEndpoints();
    const update = vi.spyOn(api, "updateParkingLot").mockResolvedValue({} as ParkingLot);
    const del = vi.spyOn(api, "deleteParkingLot").mockResolvedValue(undefined);
    const reset = vi.spyOn(api, "resetParkingLot").mockResolvedValue({} as ParkingLot);
    const resetAll = vi.spyOn(api, "resetAllParkingLots").mockResolvedValue([]);
    const { result } = renderDashboardHook();
    await waitFor(() => expect(result.current.parkingLots.loading).toBe(false));

    await act(async () => {
      await result.current.handleParkingLotUpdate(1, { name: "x", capacity: 5 });
    });
    expect(update).toHaveBeenCalledWith(1, { name: "x", capacity: 5 });

    await act(async () => {
      await result.current.handleParkingLotDelete(1);
    });
    expect(del).toHaveBeenCalledWith(1);

    await act(async () => {
      await result.current.handleParkingLotReset(1, { count: 5, target: "current" });
    });
    expect(reset).toHaveBeenCalledWith(1, { count: 5, target: "current" });

    await act(async () => {
      await result.current.handleParkingLotResetAll("system");
    });
    expect(resetAll).toHaveBeenCalledWith({ target: "system" });
  });

  it("handleDeviceUpdate/Deleteが対応するAPIを正しい引数で呼ぶことを確認する", async () => {
    mockAllPollingEndpoints();
    const update = vi.spyOn(api, "updateDevice").mockResolvedValue({} as Device);
    const del = vi.spyOn(api, "deleteDevice").mockResolvedValue(undefined);
    const { result } = renderDashboardHook();
    await waitFor(() => expect(result.current.devices.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeviceUpdate(1, { device_code: "dev1", parking_lot_id: 1 });
    });
    expect(update).toHaveBeenCalledWith(1, { device_code: "dev1", parking_lot_id: 1 });

    await act(async () => {
      await result.current.handleDeviceDelete(1);
    });
    expect(del).toHaveBeenCalledWith(1);
  });

  it("handleAdminUserCreated/Deleteが許可ユーザー一覧を再取得することを確認する", async () => {
    mockAllPollingEndpoints();
    const del = vi.spyOn(api, "deleteAdminUser").mockResolvedValue(undefined);
    const adminUsersSpy = vi.spyOn(api, "listAdminUsers");
    const { result } = renderDashboardHook();
    await waitFor(() => expect(adminUsersSpy).toHaveBeenCalledTimes(1));

    act(() => result.current.handleAdminUserCreated());
    await waitFor(() => expect(adminUsersSpy).toHaveBeenCalledTimes(2));

    await act(async () => {
      await result.current.handleAdminUserDelete(9);
    });
    expect(del).toHaveBeenCalledWith(9);
    await waitFor(() => expect(adminUsersSpy).toHaveBeenCalledTimes(3));
  });

  it("handleDeviceCommandはコマンドをキューに積み、即座に「送信しています」通知を出すことを確認する", async () => {
    mockAllPollingEndpoints();
    const queued: DeviceCommand = {
      id: 1,
      device_id: 1,
      command_type: "restart",
      status: "pending",
      requested_by: "admin",
      result_message: null,
      created_at: "2026-08-15T00:00:00",
      delivered_at: null,
      completed_at: null,
    };
    vi.spyOn(api, "queueCommand").mockResolvedValue(queued);
    vi.spyOn(api, "listCommands").mockResolvedValue([queued]);
    const { result } = renderDashboardHook();
    await waitFor(() => expect(result.current.devices.loading).toBe(false));

    act(() => {
      void result.current.handleDeviceCommand(1, "restart");
    });

    await waitFor(() => expect(result.current.commandNotice?.message).toBe("再起動を送信しています…"));
  });

  it("コマンド発行自体に失敗した場合、エラー通知が表示されることを確認する", async () => {
    mockAllPollingEndpoints();
    vi.spyOn(api, "queueCommand").mockRejectedValue(new Error("device not found"));
    const { result } = renderDashboardHook();
    await waitFor(() => expect(result.current.devices.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });

    expect(result.current.commandNotice).toEqual({ severity: "error", message: "device not found" });
  });

  it("コマンドが完了するまでバックグラウンドでポーリングし、完了したら成功通知を表示することを確認する", async () => {
    vi.useFakeTimers();
    mockAllPollingEndpoints();
    const queued: DeviceCommand = {
      id: 1,
      device_id: 1,
      command_type: "restart",
      status: "pending",
      requested_by: "admin",
      result_message: null,
      created_at: "2026-08-15T00:00:00",
      delivered_at: null,
      completed_at: null,
    };
    vi.spyOn(api, "queueCommand").mockResolvedValue(queued);
    vi.spyOn(api, "listCommands").mockResolvedValue([{ ...queued, status: "completed", result_message: "OK" }]);
    const { result } = renderDashboardHook();
    await vi.waitFor(() => expect(result.current.devices.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.commandNotice).toEqual({ severity: "success", message: "再起動が完了しました: OK" });
  });

  it("コマンドが一定時間内に完了しなかった場合、未応答の警告通知を表示することを確認する", async () => {
    vi.useFakeTimers();
    mockAllPollingEndpoints();
    const queued: DeviceCommand = {
      id: 1,
      device_id: 1,
      command_type: "restart",
      status: "pending",
      requested_by: "admin",
      result_message: null,
      created_at: "2026-08-15T00:00:00",
      delivered_at: null,
      completed_at: null,
    };
    vi.spyOn(api, "queueCommand").mockResolvedValue(queued);
    vi.spyOn(api, "listCommands").mockResolvedValue([queued]);
    const { result } = renderDashboardHook();
    await vi.waitFor(() => expect(result.current.devices.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(21000);
    });

    expect(result.current.commandNotice).toEqual({
      severity: "warning",
      message: "再起動の応答がありません（デバイスが未応答の可能性があります）",
    });
  });

  it("コマンドが失敗ステータスで完了した場合、エラー通知を表示することを確認する", async () => {
    vi.useFakeTimers();
    mockAllPollingEndpoints();
    const queued: DeviceCommand = {
      id: 1,
      device_id: 1,
      command_type: "restart",
      status: "pending",
      requested_by: "admin",
      result_message: null,
      created_at: "2026-08-15T00:00:00",
      delivered_at: null,
      completed_at: null,
    };
    vi.spyOn(api, "queueCommand").mockResolvedValue(queued);
    vi.spyOn(api, "listCommands").mockResolvedValue([{ ...queued, status: "failed", result_message: null }]);
    const { result } = renderDashboardHook();
    await vi.waitFor(() => expect(result.current.devices.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.commandNotice).toEqual({ severity: "error", message: "再起動に失敗しました" });
  });

  it("コマンド通知は表示から一定時間後に自動的に消えることを確認する（新しい通知に置き換わっていない場合）", async () => {
    vi.useFakeTimers();
    mockAllPollingEndpoints();
    const queued: DeviceCommand = {
      id: 1,
      device_id: 1,
      command_type: "restart",
      status: "pending",
      requested_by: "admin",
      result_message: null,
      created_at: "2026-08-15T00:00:00",
      delivered_at: null,
      completed_at: null,
    };
    vi.spyOn(api, "queueCommand").mockResolvedValue(queued);
    vi.spyOn(api, "listCommands").mockResolvedValue([{ ...queued, status: "completed", result_message: "OK" }]);
    const { result } = renderDashboardHook();
    await vi.waitFor(() => expect(result.current.devices.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.commandNotice).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(result.current.commandNotice).toBeNull();
  });

  it("自動消去タイマーが発火する前に別のコマンドで通知が上書きされた場合、古いタイマーは新しい通知を消さないことを確認する", async () => {
    vi.useFakeTimers();
    mockAllPollingEndpoints();
    const base = {
      device_id: 1,
      command_type: "restart" as const,
      status: "pending" as const,
      requested_by: "admin",
      result_message: null,
      created_at: "2026-08-15T00:00:00",
      delivered_at: null,
      completed_at: null,
    };
    const commandA: DeviceCommand = { ...base, id: 1 };
    const commandB: DeviceCommand = { ...base, id: 2 };
    vi.spyOn(api, "queueCommand").mockResolvedValueOnce(commandA).mockResolvedValueOnce(commandB);
    // Both commands' final statuses are visible from the very first poll —
    // this isolates the notice-replacement timing from the (already
    // separately tested) poll-loop mechanics.
    vi.spyOn(api, "listCommands").mockResolvedValue([
      { ...commandA, status: "completed", result_message: "OK-A" },
      { ...commandB, status: "completed", result_message: "OK-B" },
    ]);
    const { result } = renderDashboardHook();
    await vi.waitFor(() => expect(result.current.devices.loading).toBe(false));

    // t=0: queue command A.
    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });
    // t=1500: A's poll finds it completed — success notice N1, auto-clear
    // scheduled for t=5500 (1500 + COMMAND_NOTICE_CLEAR_MS).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(result.current.commandNotice?.message).toBe("再起動が完了しました: OK-A");

    // Still t=1500: queue command B — its "sending…" notice (N2) replaces N1.
    await act(async () => {
      await result.current.handleDeviceCommand(1, "restart");
    });
    expect(result.current.commandNotice?.message).toBe("再起動を送信しています…");

    // Advance to t=6000: along the way, B's poll completes at t=3000 (success
    // notice N3, auto-clear at t=7000), and N1's stale clear fires at t=5500.
    // That stale timer must see current !== N1 and leave N3 alone.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(result.current.commandNotice?.message).toBe("再起動が完了しました: OK-B");
  });

  it("dismissCommandNoticeでコマンド通知を消せることを確認する", async () => {
    mockAllPollingEndpoints();
    const { result } = renderDashboardHook();
    await waitFor(() => expect(result.current.devices.loading).toBe(false));

    act(() => {
      result.current.dismissCommandNotice();
    });

    expect(result.current.commandNotice).toBeNull();
  });
});
