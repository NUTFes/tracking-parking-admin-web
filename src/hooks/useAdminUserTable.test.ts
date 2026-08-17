import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAdminUserTable } from "./useAdminUserTable";
import type { AdminUser } from "../api/types";

const user: AdminUser = { id: 1, email: "25.m.kitano.nutfes@gmail.com", created_at: "2026-08-15T00:00:00+09:00" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAdminUserTable", () => {
  it("requestDelete/cancelDeleteでdeleteTargetをセット・解除できることを確認する", () => {
    const { result } = renderHook(() => useAdminUserTable({ onDelete: vi.fn(), onError: vi.fn() }));

    act(() => result.current.requestDelete(user));
    expect(result.current.deleteTarget).toEqual(user);

    act(() => result.current.cancelDelete());
    expect(result.current.deleteTarget).toBeNull();
  });

  it("confirmDeleteはdeleteTargetが未設定の場合、onDeleteを呼ばないことを確認する", async () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() => useAdminUserTable({ onDelete, onError: vi.fn() }));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("confirmDeleteが成功すると、onDeleteが呼ばれdeleteTargetがクリアされることを確認する", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminUserTable({ onDelete, onError: vi.fn() }));
    act(() => result.current.requestDelete(user));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDelete).toHaveBeenCalledWith(1);
    expect(result.current.deleteTarget).toBeNull();
    expect(result.current.pendingId).toBeNull();
  });

  it("confirmDeleteが失敗した場合、onErrorが呼ばれることを確認する", async () => {
    const onError = vi.fn();
    const onDelete = vi.fn().mockRejectedValue(new Error("最後の管理者アカウントは削除できません"));
    const { result } = renderHook(() => useAdminUserTable({ onDelete, onError }));
    act(() => result.current.requestDelete(user));

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onError).toHaveBeenCalledWith("最後の管理者アカウントは削除できません");
    expect(result.current.deleteTarget).toBeNull();
  });
});
