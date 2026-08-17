import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("openがfalseの場合、内容を描画しないことを確認する", () => {
    render(
      <ConfirmDialog
        open={false}
        title="削除の確認"
        description="本当に削除しますか？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText("削除の確認")).not.toBeInTheDocument();
  });

  it("openがtrueの場合、タイトル・説明文・デフォルトの確認ラベル（削除）を表示することを確認する", () => {
    render(
      <ConfirmDialog
        open={true}
        title="削除の確認"
        description="本当に削除しますか？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("削除の確認")).toBeInTheDocument();
    expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("confirmLabel/confirmColorを指定した場合、そのラベルで表示されることを確認する", () => {
    render(
      <ConfirmDialog
        open={true}
        title="リセットの確認"
        description="台数をリセットしますか？"
        confirmLabel="リセット"
        confirmColor="warning"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "リセット" })).toBeInTheDocument();
  });

  it("確認ボタンを押すとonConfirmが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open={true} title="t" description="d" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("キャンセルボタンを押すとonCancelが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open={true} title="t" description="d" onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
