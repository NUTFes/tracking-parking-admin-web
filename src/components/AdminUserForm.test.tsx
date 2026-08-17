import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { AdminUserForm } from "./AdminUserForm";
import type { AdminUser } from "../api/types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminUserForm", () => {
  it("メールアドレス未入力の場合、登録ボタンが無効であることを確認する", () => {
    render(<AdminUserForm onCreated={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "ユーザーを登録" })).toBeDisabled();
  });

  it("フォーム送信でAPIが呼ばれ、成功後onCreatedが呼ばれ入力がリセットされることを確認する", async () => {
    const user = userEvent.setup();
    const created: AdminUser = { id: 1, email: "25.m.kitano.nutfes@gmail.com", created_at: "2026-08-15T00:00:00+09:00" };
    const spy = vi.spyOn(api, "createAdminUser").mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<AdminUserForm onCreated={onCreated} onError={vi.fn()} />);

    await user.type(screen.getByLabelText(/メールアドレス/), "25.m.kitano.nutfes@gmail.com");
    await user.click(screen.getByRole("button", { name: "ユーザーを登録" }));

    expect(spy).toHaveBeenCalledWith({ email: "25.m.kitano.nutfes@gmail.com" });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(screen.getByLabelText(/メールアドレス/)).toHaveValue("");
  });

  it("登録に失敗した場合、onErrorがエラーメッセージ付きで呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createAdminUser").mockRejectedValue(new Error("このメールアドレスは既に許可リストに登録されています"));
    const onError = vi.fn();
    render(<AdminUserForm onCreated={vi.fn()} onError={onError} />);

    await user.type(screen.getByLabelText(/メールアドレス/), "25.m.kitano.nutfes@gmail.com");
    await user.click(screen.getByRole("button", { name: "ユーザーを登録" }));

    expect(onError).toHaveBeenCalledWith("このメールアドレスは既に許可リストに登録されています");
  });
});
