import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeyReveal } from "./ApiKeyReveal";
import type { DeviceCreated } from "../api/types";

const device: DeviceCreated = {
  id: 1,
  device_code: "trapa-dev1",
  name: null,
  parking_lot_id: 1,
  api_key: "secret-key-123",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ApiKeyReveal", () => {
  it("デバイスコードとAPIキーを表示することを確認する", () => {
    render(<ApiKeyReveal device={device} onDismiss={vi.fn()} />);

    expect(screen.getByText(/trapa-dev1/)).toBeInTheDocument();
    expect(screen.getByText("secret-key-123")).toBeInTheDocument();
  });

  it("コピーボタンを押すとクリップボードにコピーされ、ボタンの表示が変わることを確認する", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ApiKeyReveal device={device} onDismiss={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "コピー" }));

    expect(writeText).toHaveBeenCalledWith("secret-key-123");
    expect(await screen.findByRole("button", { name: "コピーしました" })).toBeInTheDocument();
  });

  it("閉じるボタンを押すとonDismissが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ApiKeyReveal device={device} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
