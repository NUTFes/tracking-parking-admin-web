import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { ParkingLotForm } from "./ParkingLotForm";
import type { ParkingLot } from "../api/types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ParkingLotForm", () => {
  it("名前と収容台数を入力するまで登録ボタンが無効であることを確認する", async () => {
    const user = userEvent.setup();
    render(<ParkingLotForm onCreated={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: "駐車場を登録" })).toBeDisabled();

    await user.type(screen.getByLabelText(/駐車場名/), "第一駐車場");
    await user.type(screen.getByLabelText(/収容台数/), "20");

    expect(screen.getByRole("button", { name: "駐車場を登録" })).toBeEnabled();
  });

  it("フォーム送信でAPIが呼ばれ、成功後onCreatedが呼ばれ入力がリセットされることを確認する", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "createParkingLot").mockResolvedValue({} as ParkingLot);
    const onCreated = vi.fn();
    render(<ParkingLotForm onCreated={onCreated} onError={vi.fn()} />);

    await user.type(screen.getByLabelText(/駐車場名/), "第一駐車場");
    await user.type(screen.getByLabelText(/収容台数/), "20");
    await user.click(screen.getByRole("button", { name: "駐車場を登録" }));

    expect(spy).toHaveBeenCalledWith({ name: "第一駐車場", capacity: 20 });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/駐車場名/)).toHaveValue("");
  });

  it("登録に失敗した場合、onErrorがエラーメッセージ付きで呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createParkingLot").mockRejectedValue(new Error("capacity must be non-negative"));
    const onError = vi.fn();
    render(<ParkingLotForm onCreated={vi.fn()} onError={onError} />);

    await user.type(screen.getByLabelText(/駐車場名/), "第一駐車場");
    await user.type(screen.getByLabelText(/収容台数/), "1");
    await user.click(screen.getByRole("button", { name: "駐車場を登録" }));

    expect(onError).toHaveBeenCalledWith("capacity must be non-negative");
  });
});
