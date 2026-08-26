import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampusMapEditor } from "./CampusMapEditor";
import type { ParkingLot } from "../api/types";

function lot(overrides: Partial<ParkingLot> = {}): ParkingLot {
  return {
    id: 1,
    name: "第一駐車場",
    capacity: 10,
    current_count: 0,
    system_count: 0,
    has_device: false,
    x_percent: 20,
    y_percent: 30,
    created_at: "2026-08-15T00:00:00",
    ...overrides,
  };
}

// jsdom has no layout engine, so pins are positioned purely from this mock.
const MAP_RECT = { left: 0, top: 0, width: 1000, height: 500 } as DOMRect;

beforeEach(() => {
  // jsdom doesn't implement the Pointer Capture API at all.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(MAP_RECT);
});

describe("CampusMapEditor", () => {
  it("位置が設定されている駐車場のピンを表示することを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);

    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });
    expect(pin).toBeInTheDocument();
    expect(pin).toHaveStyle({ left: "20%", top: "30%" });
  });

  it("位置が未設定（null）の駐車場はピンを表示しないことを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot({ x_percent: null, y_percent: null })]} onPositionChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "第一駐車場のピン" })).not.toBeInTheDocument();
  });

  it("空いている駐車場のピンには「空」ラベルが表示されることを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot({ capacity: 10, current_count: 2 })]} onPositionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "第一駐車場のピン" })).toHaveTextContent("空");
  });

  it("混雑している駐車場のピンには「混」ラベルが表示されることを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot({ capacity: 10, current_count: 8 })]} onPositionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "第一駐車場のピン" })).toHaveTextContent("混");
  });

  it("満車の駐車場のピンには「満」ラベルが表示されることを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot({ capacity: 10, current_count: 10 })]} onPositionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "第一駐車場のピン" })).toHaveTextContent("満");
  });

  it("収容台数が0の駐車場のピンには「-」ラベルが表示されることを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot({ capacity: 0, current_count: 0 })]} onPositionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "第一駐車場のピン" })).toHaveTextContent("-");
  });

  it("ピンをドラッグすると、離した時点の座標でonPositionChangeが呼ばれることを確認する", () => {
    const onPositionChange = vi.fn();
    render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={onPositionChange} />);
    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 600, clientY: 400 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 600, clientY: 400 });

    // x = 600/1000*100 = 60, y = 400/500*100 = 80
    expect(onPositionChange).toHaveBeenCalledWith(1, 60, 80);
  });

  it("ドラッグ中はピンの表示位置がポインタに追従することを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);
    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 300, clientY: 100 });

    expect(pin).toHaveStyle({ left: "30%", top: "20%" });
  });

  it("マップ範囲外までドラッグしても0〜100%にクランプされることを確認する", () => {
    const onPositionChange = vi.fn();
    render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={onPositionChange} />);
    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: -500, clientY: 5000 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: -500, clientY: 5000 });

    expect(onPositionChange).toHaveBeenCalledWith(1, 0, 100);
  });

  it("ドラッグ（pointerdown）を経ないpointermoveでは座標が変化しないことを確認する", () => {
    render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);
    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });

    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 900, clientY: 450 });

    expect(pin).toHaveStyle({ left: "20%", top: "30%" });
  });

  it("新しく増えた駐車場は初期位置（サーバー側の既定値）のままピンが現れることを確認する", () => {
    const { rerender } = render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);

    rerender(
      <CampusMapEditor
        parkingLots={[lot(), lot({ id: 2, name: "第二駐車場", x_percent: 50, y_percent: 50 })]}
        onPositionChange={vi.fn()}
      />,
    );

    const newPin = screen.getByRole("button", { name: "第二駐車場のピン" });
    expect(newPin).toHaveStyle({ left: "50%", top: "50%" });
  });

  it("マップのサイズが0（レイアウト前など）の場合はドラッグ移動を無視することを確認する", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    } as DOMRect);
    render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);
    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 600, clientY: 400 });

    expect(pin).toHaveStyle({ left: "20%", top: "30%" });
  });

  it("ドラッグ中にポーリングでparkingLotsが更新されても、ドラッグ中のピン位置が上書きされないことを確認する", () => {
    const { rerender } = render(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);
    const pin = screen.getByRole("button", { name: "第一駐車場のピン" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 300, clientY: 100 });
    expect(pin).toHaveStyle({ left: "30%", top: "20%" });

    // A poll tick resolves mid-drag with the still-old server position.
    rerender(<CampusMapEditor parkingLots={[lot()]} onPositionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "第一駐車場のピン" })).toHaveStyle({ left: "30%", top: "20%" });
  });
});
