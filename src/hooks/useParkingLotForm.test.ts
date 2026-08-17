import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { useParkingLotForm } from "./useParkingLotForm";
import type { ParkingLot } from "../api/types";

function fakeEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useParkingLotForm", () => {
  it("駐車場名と収容台数が両方入力されるまでcanSubmitがfalseのままであることを確認する", () => {
    const { result } = renderHook(() => useParkingLotForm({ onCreated: vi.fn(), onError: vi.fn() }));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setName("第一駐車場"));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setCapacity("20"));
    expect(result.current.canSubmit).toBe(true);
  });

  it("送信に成功すると、トリムした名前と数値化した収容台数を送信しフォームをリセットしonCreatedを呼ぶことを確認する", async () => {
    const spy = vi.spyOn(api, "createParkingLot").mockResolvedValue({} as ParkingLot);
    const onCreated = vi.fn();
    const { result } = renderHook(() => useParkingLotForm({ onCreated, onError: vi.fn() }));

    act(() => {
      result.current.setName("  第一駐車場  ");
      result.current.setCapacity("20");
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).toHaveBeenCalledWith({ name: "第一駐車場", capacity: 20 });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(result.current.name).toBe("");
    expect(result.current.capacity).toBe("");
  });

  it("canSubmitがfalseの場合、送信してもAPIを呼ばないことを確認する", async () => {
    const spy = vi.spyOn(api, "createParkingLot");
    const { result } = renderHook(() => useParkingLotForm({ onCreated: vi.fn(), onError: vi.fn() }));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("送信に失敗した場合、onErrorが呼ばれフォームの入力内容は保持されることを確認する", async () => {
    vi.spyOn(api, "createParkingLot").mockRejectedValue(new Error("capacity must be non-negative"));
    const onError = vi.fn();
    const { result } = renderHook(() => useParkingLotForm({ onCreated: vi.fn(), onError }));

    act(() => {
      result.current.setName("第一駐車場");
      result.current.setCapacity("-5");
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(onError).toHaveBeenCalledWith("capacity must be non-negative");
    expect(result.current.name).toBe("第一駐車場");
  });
});
