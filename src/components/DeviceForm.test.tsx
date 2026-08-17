import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { DeviceForm } from "./DeviceForm";
import type { DeviceCreated, ParkingLot } from "../api/types";

const lots: ParkingLot[] = [
  {
    id: 1,
    name: "第一駐車場",
    capacity: 10,
    current_count: 0,
    system_count: 0,
    has_device: false,
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DeviceForm", () => {
  it("駐車場が1件も登録されていない場合、案内メッセージを表示し設置先の選択を無効にすることを確認する", () => {
    render(<DeviceForm parkingLots={[]} onCreated={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByText("先に駐車場を登録してください")).toBeInTheDocument();
    expect(screen.getByLabelText(/設置先の駐車場/)).toHaveAttribute("aria-disabled", "true");
  });

  it("デバイスコード・設置先の両方を入力するまで登録ボタンが無効であることを確認する", async () => {
    const user = userEvent.setup();
    render(<DeviceForm parkingLots={lots} onCreated={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "デバイスを登録" })).toBeDisabled();

    await user.type(screen.getByLabelText(/デバイスコード/), "trapa-dev1");
    expect(screen.getByRole("button", { name: "デバイスを登録" })).toBeDisabled();

    await user.click(screen.getByLabelText(/設置先の駐車場/));
    await user.click(await screen.findByRole("option", { name: "第一駐車場" }));

    expect(screen.getByRole("button", { name: "デバイスを登録" })).toBeEnabled();
  });

  it("フォーム送信でAPIが呼ばれ、成功後onCreatedが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const created: DeviceCreated = { id: 1, device_code: "trapa-dev1", name: null, parking_lot_id: 1, api_key: "key" };
    const spy = vi.spyOn(api, "createDevice").mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<DeviceForm parkingLots={lots} onCreated={onCreated} onError={vi.fn()} />);

    await user.type(screen.getByLabelText(/デバイスコード/), "trapa-dev1");
    await user.click(screen.getByLabelText(/設置先の駐車場/));
    await user.click(await screen.findByRole("option", { name: "第一駐車場" }));
    await user.click(screen.getByRole("button", { name: "デバイスを登録" }));

    expect(spy).toHaveBeenCalledWith({ device_code: "trapa-dev1", name: undefined, parking_lot_id: 1 });
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it("表示名を入力した場合、送信データに含まれることを確認する", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "createDevice").mockResolvedValue({} as DeviceCreated);
    render(<DeviceForm parkingLots={lots} onCreated={vi.fn()} onError={vi.fn()} />);

    await user.type(screen.getByLabelText(/デバイスコード/), "trapa-dev1");
    await user.type(screen.getByLabelText("表示名（任意）"), "入口カメラ");
    await user.click(screen.getByLabelText(/設置先の駐車場/));
    await user.click(await screen.findByRole("option", { name: "第二駐車場" }));
    await user.click(screen.getByRole("button", { name: "デバイスを登録" }));

    expect(spy).toHaveBeenCalledWith({ device_code: "trapa-dev1", name: "入口カメラ", parking_lot_id: 2 });
  });
});
