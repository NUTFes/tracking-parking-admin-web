import { render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParkingLotTable } from "./ParkingLotTable";
import type { ParkingLot } from "../api/types";

function lot(overrides: Partial<ParkingLot> = {}): ParkingLot {
  return {
    id: 1,
    name: "第一駐車場",
    capacity: 10,
    current_count: 3,
    system_count: 5,
    has_device: true,
    created_at: "2026-08-15T00:00:00+09:00",
    ...overrides,
  };
}

// The action icons in this table are Tooltip-only (no aria-label), so locate
// them via the MUI icon's data-testid rather than role/name.
function rowIconButton(row: HTMLElement, testId: string): HTMLElement {
  const icon = within(row).getByTestId(testId);
  const button = icon.closest("button");
  if (!button) throw new Error(`icon ${testId} has no button ancestor`);
  return button;
}

// The two reset-all icons (人力/システム) sit in the table header, in that
// column order — before any row-level RestartAltIcon in DOM order.
function headerResetAllButton(target: "current" | "system"): HTMLElement {
  const icons = screen.getAllByTestId("RestartAltIcon");
  const icon = target === "current" ? icons[0] : icons[1];
  const button = icon.closest("button");
  if (!button) throw new Error("reset-all icon has no button ancestor");
  return button;
}

function renderTable(props: Partial<Parameters<typeof ParkingLotTable>[0]> = {}) {
  return render(
    <ParkingLotTable
      parkingLots={props.parkingLots ?? [lot()]}
      onUpdate={props.onUpdate ?? vi.fn()}
      onDelete={props.onDelete ?? vi.fn()}
      onReset={props.onReset ?? vi.fn()}
      onResetAll={props.onResetAll ?? vi.fn()}
      onError={props.onError ?? vi.fn()}
    />,
  );
}

function getRow(name: string): HTMLElement {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error(`no row found for ${name}`);
  return row;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ParkingLotTable", () => {
  it("駐車場が1件もない場合、その旨のメッセージを表示することを確認する", () => {
    renderTable({ parkingLots: [] });

    expect(screen.getByText("登録済みの駐車場がありません")).toBeInTheDocument();
  });

  it("ID・名前・収容台数・現在台数・システム集計を表示することを確認する", () => {
    renderTable();

    expect(screen.getByText("第一駐車場")).toBeInTheDocument();
    const row = getRow("第一駐車場");
    expect(within(row).getByText("10")).toBeInTheDocument();
    expect(within(row).getByText("3")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
  });

  it("has_deviceがfalseの場合、システム集計欄が「-」になることを確認する", () => {
    renderTable({ parkingLots: [lot({ has_device: false })] });

    const row = getRow("第一駐車場");
    expect(within(row).getByText("-")).toBeInTheDocument();
  });

  it("編集ボタンを押すと編集フォームに切り替わり、保存でonUpdateが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    renderTable({ onUpdate });
    const row = getRow("第一駐車場");

    await user.click(rowIconButton(row, "EditIcon"));
    const nameInput = screen.getByDisplayValue("第一駐車場");
    await user.clear(nameInput);
    await user.type(nameInput, "第一駐車場（改）");
    await user.click(rowIconButton(screen.getByDisplayValue("第一駐車場（改）").closest("tr")!, "CheckIcon"));

    expect(onUpdate).toHaveBeenCalledWith(1, { name: "第一駐車場（改）", capacity: 10 });
  });

  it("編集中に収容台数を変更して保存すると、新しい収容台数が送信されることを確認する", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    renderTable({ onUpdate });
    const row = getRow("第一駐車場");

    await user.click(rowIconButton(row, "EditIcon"));
    const capacityInput = screen.getByDisplayValue("10");
    await user.clear(capacityInput);
    await user.type(capacityInput, "15");
    await user.click(rowIconButton(capacityInput.closest("tr")!, "CheckIcon"));

    expect(onUpdate).toHaveBeenCalledWith(1, { name: "第一駐車場", capacity: 15 });
  });

  it("削除ボタン押下→確認ダイアログでの確定でonDeleteが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderTable({ onDelete });
    const row = getRow("第一駐車場");

    await user.click(rowIconButton(row, "DeleteIcon"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("駐車場の削除")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("個別リセットで人力集計の台数を指定して確定すると、対象・台数・メモがonResetに渡されることを確認する", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn().mockResolvedValue(undefined);
    renderTable({ onReset });
    const row = getRow("第一駐車場");

    await user.click(rowIconButton(row, "RestartAltIcon"));
    const countInput = await screen.findByLabelText("リセット後の台数");
    expect(countInput).toHaveValue(3);
    await user.clear(countInput);
    await user.type(countInput, "7");
    await user.type(screen.getByLabelText(/理由/), "実車確認");
    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(onReset).toHaveBeenCalledWith(1, { count: 7, target: "current", note: "実車確認" });
  });

  it("リセット対象をシステムに切り替えると、台数入力欄がsystem_countの値に更新されることを確認する", async () => {
    const user = userEvent.setup();
    renderTable();
    const row = getRow("第一駐車場");

    await user.click(rowIconButton(row, "RestartAltIcon"));
    await user.click(screen.getByRole("radio", { name: "システム集計" }));

    expect(screen.getByLabelText("リセット後の台数")).toHaveValue(5);
  });

  it("一括リセット（人力）で確定すると、targetがcurrentでonResetAllが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn().mockResolvedValue(undefined);
    renderTable({ onResetAll });

    await user.click(headerResetAllButton("current"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/人力集計/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "リセット" }));

    expect(onResetAll).toHaveBeenCalledWith("current");
  });

  it("一括リセット（システム）で確定すると、targetがsystemでonResetAllが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn().mockResolvedValue(undefined);
    renderTable({ onResetAll });

    await user.click(headerResetAllButton("system"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/システム集計/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "リセット" }));

    expect(onResetAll).toHaveBeenCalledWith("system");
  });

  it("一括リセットをキャンセルした場合、onResetAllが呼ばれずダイアログが閉じることを確認する", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn();
    renderTable({ onResetAll });

    await user.click(headerResetAllButton("current"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    expect(onResetAll).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
  });
});
