import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useParkingLotTable } from "./useParkingLotTable";
import type { ParkingLot } from "../api/types";

const lot: ParkingLot = {
  id: 1,
  name: "第一駐車場",
  capacity: 10,
  current_count: 3,
  system_count: 5,
  has_device: true,
  created_at: "2026-08-15T00:00:00+09:00",
};

function renderTable(overrides: Partial<Parameters<typeof useParkingLotTable>[0]> = {}) {
  return renderHook(() =>
    useParkingLotTable({
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
      onReset: vi.fn(),
      onResetAll: vi.fn(),
      onError: vi.fn(),
      ...overrides,
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useParkingLotTable — 編集", () => {
  it("startEditで駐車場名・収容台数が初期値として読み込まれることを確認する", () => {
    const { result } = renderTable();

    act(() => result.current.startEdit(lot));

    expect(result.current.editingId).toBe(1);
    expect(result.current.editName).toBe("第一駐車場");
    expect(result.current.editCapacity).toBe("10");
  });

  it("cancelEditで編集状態が解除されることを確認する", () => {
    const { result } = renderTable();
    act(() => result.current.startEdit(lot));

    act(() => result.current.cancelEdit());

    expect(result.current.editingId).toBeNull();
  });

  it("saveEditが成功すると、名前と収容台数を送信し編集状態を解除することを確認する", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onUpdate });
    act(() => result.current.startEdit(lot));
    act(() => result.current.setEditName("  第一駐車場（改）  "));
    act(() => result.current.setEditCapacity("15"));

    await act(async () => {
      await result.current.saveEdit(1);
    });

    expect(onUpdate).toHaveBeenCalledWith(1, { name: "第一駐車場（改）", capacity: 15 });
    expect(result.current.editingId).toBeNull();
  });

  it("駐車場名が空欄の場合、saveEditはonUpdateを呼ばないことを確認する", async () => {
    const onUpdate = vi.fn();
    const { result } = renderTable({ onUpdate });
    act(() => result.current.startEdit(lot));
    act(() => result.current.setEditName(""));

    await act(async () => {
      await result.current.saveEdit(1);
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("saveEditが失敗した場合、onErrorが呼ばれることを確認する", async () => {
    const onError = vi.fn();
    const onUpdate = vi.fn().mockRejectedValue(new Error("capacity must be non-negative"));
    const { result } = renderTable({ onUpdate, onError });
    act(() => result.current.startEdit(lot));

    await act(async () => {
      await result.current.saveEdit(1);
    });

    expect(onError).toHaveBeenCalledWith("capacity must be non-negative");
  });
});

describe("useParkingLotTable — 削除", () => {
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
    act(() => result.current.requestDelete(lot));

    act(() => result.current.cancelDelete());

    expect(result.current.deleteTarget).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("confirmDeleteが成功すると、onDeleteが呼ばれdeleteTargetがクリアされることを確認する", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onDelete });
    act(() => result.current.requestDelete(lot));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDelete).toHaveBeenCalledWith(1);
    expect(result.current.deleteTarget).toBeNull();
  });

  it("confirmDeleteが失敗した場合、onErrorが呼ばれることを確認する", async () => {
    const onError = vi.fn();
    const onDelete = vi.fn().mockRejectedValue(new Error("この駐車場に紐づくデバイスが存在するため削除できません"));
    const { result } = renderTable({ onDelete, onError });
    act(() => result.current.requestDelete(lot));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onError).toHaveBeenCalledWith("この駐車場に紐づくデバイスが存在するため削除できません");
  });
});

describe("useParkingLotTable — 個別リセット", () => {
  it("requestResetで人力集計（current_count）を初期値としてresetCountが読み込まれることを確認する", () => {
    const { result } = renderTable();

    act(() => result.current.requestReset(lot));

    expect(result.current.resetTarget).toEqual(lot);
    expect(result.current.resetField).toBe("current");
    expect(result.current.resetCount).toBe("3");
  });

  it("setResetFieldでsystemに切り替えると、resetCountがsystem_countに更新されることを確認する", () => {
    const { result } = renderTable();
    act(() => result.current.requestReset(lot));

    act(() => result.current.setResetField("system"));

    expect(result.current.resetField).toBe("system");
    expect(result.current.resetCount).toBe("5");
  });

  it("systemからcurrentに戻すと、resetCountがcurrent_countに更新されることを確認する", () => {
    const { result } = renderTable();
    act(() => result.current.requestReset(lot));
    act(() => result.current.setResetField("system"));

    act(() => result.current.setResetField("current"));

    expect(result.current.resetField).toBe("current");
    expect(result.current.resetCount).toBe("3");
  });

  it("resetTarget未設定の状態でsetResetFieldを呼んでも、resetCountは変化しないことを確認する（対象欄と台数欄が結びつくのはダイアログを開いた後のみ）", () => {
    const { result } = renderTable();

    act(() => result.current.setResetField("system"));

    expect(result.current.resetField).toBe("system");
    expect(result.current.resetCount).toBe("");
  });

  it("confirmResetが成功すると、対象・台数・メモを送信しresetTargetをクリアすることを確認する", async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onReset });
    act(() => result.current.requestReset(lot));
    act(() => result.current.setResetCount("7"));
    act(() => result.current.setResetNote("  実車確認  "));

    await act(async () => {
      await result.current.confirmReset();
    });

    expect(onReset).toHaveBeenCalledWith(1, { count: 7, target: "current", note: "実車確認" });
    expect(result.current.resetTarget).toBeNull();
  });

  it("メモが空欄の場合、noteを省略して送信することを確認する", async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onReset });
    act(() => result.current.requestReset(lot));

    await act(async () => {
      await result.current.confirmReset();
    });

    expect(onReset).toHaveBeenCalledWith(1, { count: 3, target: "current", note: undefined });
  });

  it("resetTargetが未設定の場合、confirmResetはonResetを呼ばないことを確認する", async () => {
    const onReset = vi.fn();
    const { result } = renderTable({ onReset });

    await act(async () => {
      await result.current.confirmReset();
    });

    expect(onReset).not.toHaveBeenCalled();
  });

  it("resetTargetはあるがresetCountが空の場合も、confirmResetはonResetを呼ばないことを確認する", async () => {
    const onReset = vi.fn();
    const { result } = renderTable({ onReset });
    act(() => result.current.requestReset(lot));
    act(() => result.current.setResetCount(""));

    await act(async () => {
      await result.current.confirmReset();
    });

    expect(onReset).not.toHaveBeenCalled();
  });

  it("cancelResetでresetTargetが解除されることを確認する", () => {
    const { result } = renderTable();
    act(() => result.current.requestReset(lot));

    act(() => result.current.cancelReset());

    expect(result.current.resetTarget).toBeNull();
  });

  it("confirmResetが失敗した場合、onErrorが呼ばれることを確認する", async () => {
    const onError = vi.fn();
    const onReset = vi.fn().mockRejectedValue(new Error("parking lot not found"));
    const { result } = renderTable({ onReset, onError });
    act(() => result.current.requestReset(lot));

    await act(async () => {
      await result.current.confirmReset();
    });

    expect(onError).toHaveBeenCalledWith("parking lot not found");
  });
});

describe("useParkingLotTable — 一括リセット", () => {
  it("requestResetAll/cancelResetAllでresetAllTargetをセット・解除できることを確認する", () => {
    const { result } = renderTable();

    act(() => result.current.requestResetAll("current"));
    expect(result.current.resetAllTarget).toBe("current");

    act(() => result.current.cancelResetAll());
    expect(result.current.resetAllTarget).toBeNull();
  });

  it("confirmResetAllが成功すると、対象を送信しresetAllTargetをクリアすることを確認する", async () => {
    const onResetAll = vi.fn().mockResolvedValue(undefined);
    const { result } = renderTable({ onResetAll });
    act(() => result.current.requestResetAll("system"));

    await act(async () => {
      await result.current.confirmResetAll();
    });

    expect(onResetAll).toHaveBeenCalledWith("system");
    expect(result.current.resetAllTarget).toBeNull();
  });

  it("resetAllTargetが未設定の場合、confirmResetAllはonResetAllを呼ばないことを確認する", async () => {
    const onResetAll = vi.fn();
    const { result } = renderTable({ onResetAll });

    await act(async () => {
      await result.current.confirmResetAll();
    });

    expect(onResetAll).not.toHaveBeenCalled();
  });

  it("confirmResetAllが失敗した場合、onErrorが呼ばれることを確認する", async () => {
    const onError = vi.fn();
    const onResetAll = vi.fn().mockRejectedValue(new Error("internal error"));
    const { result } = renderTable({ onResetAll, onError });
    act(() => result.current.requestResetAll("current"));

    await act(async () => {
      await result.current.confirmResetAll();
    });

    expect(onError).toHaveBeenCalledWith("internal error");
  });
});
