import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeviceTable } from "./useDeviceTable";
import type { Device } from "../api/types";

const device: Device = {
  id: 1,
  device_code: "trapa-dev1",
  name: "入口カメラ",
  parking_lot_id: 1,
  last_status: "ok",
  last_seen_at: "2026-08-15T00:00:00+09:00",
  online: true,
  created_at: "2026-08-15T00:00:00+09:00",
};

function renderTable(overrides: Partial<Parameters<typeof useDeviceTable>[0]> = {}) {
  return renderHook(() =>
    useDeviceTable({
      onCommand: vi.fn(),
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
      onError: vi.fn(),
      ...overrides,
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDeviceTable — コマンド確認", () => {
  it("requestCommand/cancelCommandでcommandTargetをセット・解除できることを確認する", () => {
    const { result } = renderTable();

    act(() => result.current.requestCommand(device, "restart"));
    expect(result.current.commandTarget).toEqual({ device, commandType: "restart" });

    act(() => result.current.cancelCommand());
    expect(result.current.commandTarget).toBeNull();
  });

  it("confirmCommandはonCommandを呼び、完了後commandTargetをクリアすることを確認する", async () => {
    const onCommand = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onCommand });
    act(() => result.current.requestCommand(device, "restart"));

    await act(async () => {
      await result.current.confirmCommand();
    });

    expect(onCommand).toHaveBeenCalledWith(1, "restart");
    expect(result.current.commandTarget).toBeNull();
    expect(result.current.pendingId).toBeNull();
  });

  it("commandTargetが未設定の場合、confirmCommandはonCommandを呼ばないことを確認する", async () => {
    const onCommand = vi.fn();
    const { result } = renderTable({ onCommand });

    await act(async () => {
      await result.current.confirmCommand();
    });

    expect(onCommand).not.toHaveBeenCalled();
  });
});

describe("useDeviceTable — 編集", () => {
  it("startEditで編集対象のフィールドが初期値として読み込まれることを確認する", () => {
    const { result } = renderTable();

    act(() => result.current.startEdit(device));

    expect(result.current.editingId).toBe(1);
    expect(result.current.editDeviceCode).toBe("trapa-dev1");
    expect(result.current.editName).toBe("入口カメラ");
    expect(result.current.editParkingLotId).toBe("1");
  });

  it("表示名がnullのデバイスをstartEditすると、editNameが空文字になることを確認する", () => {
    const { result } = renderTable();

    act(() => result.current.startEdit({ ...device, name: null }));

    expect(result.current.editName).toBe("");
  });

  it("cancelEditで編集状態が解除されることを確認する", () => {
    const { result } = renderTable();
    act(() => result.current.startEdit(device));

    act(() => result.current.cancelEdit());

    expect(result.current.editingId).toBeNull();
  });

  it("saveEditは表示名が空欄の場合、name未指定（undefined）で更新することを確認する（NULLへの復元）", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onUpdate });
    act(() => result.current.startEdit(device));
    act(() => result.current.setEditName(""));

    await act(async () => {
      await result.current.saveEdit(1);
    });

    expect(onUpdate).toHaveBeenCalledWith(1, { device_code: "trapa-dev1", name: undefined, parking_lot_id: 1 });
    expect(result.current.editingId).toBeNull();
  });

  it("デバイスコードが空欄の場合、saveEditはonUpdateを呼ばないことを確認する", async () => {
    const onUpdate = vi.fn();
    const { result } = renderTable({ onUpdate });
    act(() => result.current.startEdit(device));
    act(() => result.current.setEditDeviceCode(""));

    await act(async () => {
      await result.current.saveEdit(1);
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("saveEditが失敗した場合、onErrorが呼ばれ編集状態は解除されないことを確認する", async () => {
    const onError = vi.fn();
    const onUpdate = vi.fn().mockRejectedValue(new Error("device_code already exists"));
    const { result } = renderTable({ onUpdate, onError });
    act(() => result.current.startEdit(device));

    await act(async () => {
      await result.current.saveEdit(1);
    });

    expect(onError).toHaveBeenCalledWith("device_code already exists");
    expect(result.current.editingId).toBe(1);
  });
});

describe("useDeviceTable — 削除", () => {
  it("deleteTargetが未設定の場合、confirmDeleteはonDeleteを呼ばないことを確認する", async () => {
    const onDelete = vi.fn();
    const { result } = renderTable({ onDelete });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("cancelDeleteでdeleteTargetが解除され、onDeleteが呼ばれないことを確認する", () => {
    const onDelete = vi.fn();
    const { result } = renderTable({ onDelete });
    act(() => result.current.requestDelete(device));

    act(() => result.current.cancelDelete());

    expect(result.current.deleteTarget).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("confirmDeleteが成功すると、onDeleteが呼ばれdeleteTargetがクリアされることを確認する", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onDelete });
    act(() => result.current.requestDelete(device));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDelete).toHaveBeenCalledWith(1);
    expect(result.current.deleteTarget).toBeNull();
  });

  it("confirmDeleteが失敗した場合、onErrorが呼ばれることを確認する", async () => {
    const onError = vi.fn();
    const onDelete = vi.fn().mockRejectedValue(new Error("device not found"));
    const { result } = renderTable({ onDelete, onError });
    act(() => result.current.requestDelete(device));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onError).toHaveBeenCalledWith("device not found");
  });
});
