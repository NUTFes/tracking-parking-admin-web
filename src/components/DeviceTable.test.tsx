import { render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceTable } from "./DeviceTable";
import type { Device, ParkingLot } from "../api/types";

const lots: ParkingLot[] = [
  {
    id: 1,
    name: "第一駐車場",
    capacity: 10,
    current_count: 0,
    system_count: 0,
    has_device: true,
    created_at: "2026-08-15T00:00:00",
  },
  {
    id: 2,
    name: "第二駐車場",
    capacity: 20,
    current_count: 0,
    system_count: 0,
    has_device: false,
    created_at: "2026-08-15T00:00:00",
  },
];

function device(overrides: Partial<Device> = {}): Device {
  return {
    id: 1,
    device_code: "trapa-dev1",
    name: "入口カメラ",
    parking_lot_id: 1,
    last_status: "ok",
    last_seen_at: "2026-08-15T00:00:00+09:00",
    online: true,
    created_at: "2026-08-15T00:00:00+09:00",
    ...overrides,
  };
}

// The action icons in this table are Tooltip-only (no aria-label), so their
// accessible name is empty — locate them via the MUI icon's data-testid
// instead of role/name.
function iconButton(container: HTMLElement, testId: string): HTMLElement {
  const icon = within(container).getByTestId(testId);
  const button = icon.closest("button");
  if (!button) throw new Error(`icon ${testId} has no button ancestor`);
  return button;
}

function renderTable(props: Partial<Parameters<typeof DeviceTable>[0]> = {}) {
  return render(
    <DeviceTable
      devices={props.devices ?? [device()]}
      parkingLots={props.parkingLots ?? lots}
      onCommand={props.onCommand ?? vi.fn()}
      onUpdate={props.onUpdate ?? vi.fn()}
      onDelete={props.onDelete ?? vi.fn()}
      onError={props.onError ?? vi.fn()}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DeviceTable", () => {
  it("デバイスが1件もない場合、その旨のメッセージを表示することを確認する", () => {
    renderTable({ devices: [] });

    expect(screen.getByText("登録済みのデバイスがありません")).toBeInTheDocument();
  });

  it("デバイス名・デバイスコード・駐車場名・オンライン状態を表示することを確認する", () => {
    renderTable();

    expect(screen.getByText("入口カメラ")).toBeInTheDocument();
    expect(screen.getByText("trapa-dev1")).toBeInTheDocument();
    expect(screen.getByText("第一駐車場")).toBeInTheDocument();
    expect(screen.getByText("オンライン")).toBeInTheDocument();
  });

  it("表示名がnullの場合、デバイスコードを名前として表示することを確認する", () => {
    renderTable({ devices: [device({ name: null })] });

    expect(screen.getAllByText("trapa-dev1").length).toBeGreaterThanOrEqual(1);
  });

  it("紐づく駐車場が一覧に見つからない場合、駐車場名欄が「-」になることを確認する", () => {
    renderTable({ devices: [device({ parking_lot_id: 999 })] });

    const row = screen.getByText("入口カメラ").closest("tr")!;
    expect(within(row).getByText("-")).toBeInTheDocument();
  });

  it("オフラインのデバイスは集計開始・停止・再起動ボタンが無効であることを確認する", () => {
    const { container } = renderTable({ devices: [device({ online: false })] });

    expect(iconButton(container, "PlayCircleOutlinedIcon")).toBeDisabled();
    expect(iconButton(container, "PauseCircleOutlinedIcon")).toBeDisabled();
    expect(iconButton(container, "RestartAltIcon")).toBeDisabled();
  });

  it("再起動ボタン押下→確認ダイアログでの確定でonCommandが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onCommand });

    await user.click(iconButton(container, "RestartAltIcon"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("デバイスの再起動")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "再起動" }));

    expect(onCommand).toHaveBeenCalledWith(1, "restart");
  });

  it("確認ダイアログでキャンセルした場合、onCommandが呼ばれないことを確認する", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();
    const { container } = renderTable({ onCommand });

    await user.click(iconButton(container, "RestartAltIcon"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    expect(onCommand).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
  });

  it("削除ボタン押下→確認ダイアログでの確定でonDeleteが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onDelete });

    await user.click(iconButton(container, "DeleteIcon"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("デバイスの削除")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("編集ボタンを押すと編集フォームに切り替わり、保存でonUpdateが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onUpdate });

    await user.click(iconButton(container, "EditIcon"));

    const codeInput = screen.getByPlaceholderText("デバイスコード");
    await user.clear(codeInput);
    await user.type(codeInput, "trapa-dev2");
    await user.click(iconButton(container, "CheckIcon"));

    expect(onUpdate).toHaveBeenCalledWith(1, { device_code: "trapa-dev2", name: "入口カメラ", parking_lot_id: 1 });
  });

  it("編集中に表示名を変更して保存すると、新しい表示名が送信されることを確認する", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onUpdate });

    await user.click(iconButton(container, "EditIcon"));
    const nameInput = screen.getByPlaceholderText("表示名（任意）");
    await user.clear(nameInput);
    await user.type(nameInput, "出口カメラ");
    await user.click(iconButton(container, "CheckIcon"));

    expect(onUpdate).toHaveBeenCalledWith(1, { device_code: "trapa-dev1", name: "出口カメラ", parking_lot_id: 1 });
  });

  it("編集中に設置先の駐車場を変更して保存すると、新しいparking_lot_idが送信されることを確認する", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onUpdate });

    await user.click(iconButton(container, "EditIcon"));
    // The edit-mode parking-lot select has no label — it's the only
    // combobox present once editing starts.
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "第二駐車場" }));
    await user.click(iconButton(container, "CheckIcon"));

    expect(onUpdate).toHaveBeenCalledWith(1, { device_code: "trapa-dev1", name: "入口カメラ", parking_lot_id: 2 });
  });

  it("オンラインのデバイスで集計開始ボタン押下→確認するとonCommandがstart_countingで呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onCommand });

    await user.click(iconButton(container, "PlayCircleOutlinedIcon"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "集計開始" }));

    expect(onCommand).toHaveBeenCalledWith(1, "start_counting");
  });

  it("オンラインのデバイスで集計停止ボタン押下→確認するとonCommandがstop_countingで呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTable({ onCommand });

    await user.click(iconButton(container, "PauseCircleOutlinedIcon"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "集計停止" }));

    expect(onCommand).toHaveBeenCalledWith(1, "stop_counting");
  });

  it("編集中にキャンセルすると、変更を保存せず編集前の表示に戻ることを確認する", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const { container } = renderTable({ onUpdate });

    await user.click(iconButton(container, "EditIcon"));
    await user.click(iconButton(container, "CloseIcon"));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText("入口カメラ")).toBeInTheDocument();
  });
});
