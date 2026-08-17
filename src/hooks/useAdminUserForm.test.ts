import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { useAdminUserForm } from "./useAdminUserForm";
import type { AdminUser } from "../api/types";

function fakeEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAdminUserForm", () => {
  it("メールアドレス未入力の場合、canSubmitがfalseであることを確認する", () => {
    const { result } = renderHook(() => useAdminUserForm({ onCreated: vi.fn(), onError: vi.fn() }));

    expect(result.current.canSubmit).toBe(false);
  });

  it("送信に成功すると、トリムしたメールアドレスを送信しフォームをリセットしonCreatedを呼ぶことを確認する", async () => {
    const created: AdminUser = { id: 1, email: "25.m.kitano.nutfes@gmail.com", created_at: "2026-08-15T00:00:00+09:00" };
    const spy = vi.spyOn(api, "createAdminUser").mockResolvedValue(created);
    const onCreated = vi.fn();
    const { result } = renderHook(() => useAdminUserForm({ onCreated, onError: vi.fn() }));

    act(() => result.current.setEmail("  25.m.kitano.nutfes@gmail.com  "));
    expect(result.current.canSubmit).toBe(true);

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).toHaveBeenCalledWith({ email: "25.m.kitano.nutfes@gmail.com" });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.email).toBe("");
  });

  it("canSubmitがfalseの場合、送信してもAPIを呼ばないことを確認する", async () => {
    const spy = vi.spyOn(api, "createAdminUser");
    const { result } = renderHook(() => useAdminUserForm({ onCreated: vi.fn(), onError: vi.fn() }));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("送信に失敗した場合（形式不正・重複など）、onErrorが呼ばれメールアドレスは保持されることを確認する", async () => {
    vi.spyOn(api, "createAdminUser").mockRejectedValue(new Error("このメールアドレスは既に許可リストに登録されています"));
    const onError = vi.fn();
    const { result } = renderHook(() => useAdminUserForm({ onCreated: vi.fn(), onError }));

    act(() => result.current.setEmail("25.m.kitano.nutfes@gmail.com"));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(onError).toHaveBeenCalledWith("このメールアドレスは既に許可リストに登録されています");
    expect(result.current.email).toBe("25.m.kitano.nutfes@gmail.com");
  });
});
