import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminUserTable } from "./AdminUserTable";
import type { AdminUser } from "../api/types";

const user: AdminUser = { id: 1, email: "25.m.kitano.nutfes@gmail.com", created_at: "2026-08-15T00:00:00+09:00" };

function renderTable(props: Partial<Parameters<typeof AdminUserTable>[0]> = {}) {
  return render(
    <AdminUserTable
      users={props.users ?? [user]}
      onDelete={props.onDelete ?? vi.fn()}
      onError={props.onError ?? vi.fn()}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminUserTable", () => {
  it("許可ユーザーが1件もない場合、その旨のメッセージを表示することを確認する", () => {
    renderTable({ users: [] });

    expect(screen.getByText("許可ユーザーが登録されていません")).toBeInTheDocument();
  });

  it("メールアドレスを表示することを確認する", () => {
    renderTable();

    expect(screen.getByText("25.m.kitano.nutfes@gmail.com")).toBeInTheDocument();
  });

  it("削除ボタン押下→確認ダイアログでの確定でonDeleteが呼ばれることを確認する", async () => {
    const userEventSetup = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderTable({ onDelete });

    const icon = screen.getByTestId("DeleteIcon");
    const button = icon.closest("button");
    if (!button) throw new Error("no button ancestor");
    await userEventSetup.click(button);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("許可ユーザーの削除")).toBeInTheDocument();
    expect(within(dialog).getByText(/25\.m\.kitano\.nutfes@gmail\.com/)).toBeInTheDocument();
    await userEventSetup.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("削除に失敗した場合、onErrorが呼ばれることを確認する（例：最後の管理者アカウント）", async () => {
    const userEventSetup = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error("最後の管理者アカウントは削除できません"));
    const onError = vi.fn();
    renderTable({ onDelete, onError });

    const button = screen.getByTestId("DeleteIcon").closest("button");
    if (!button) throw new Error("no button ancestor");
    await userEventSetup.click(button);
    const dialog = await screen.findByRole("dialog");
    await userEventSetup.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(onError).toHaveBeenCalledWith("最後の管理者アカウントは削除できません");
  });
});
