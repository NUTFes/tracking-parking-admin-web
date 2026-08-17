import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { useDeviceForm } from "./useDeviceForm";
import type { DeviceCreated } from "../api/types";

function fakeEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDeviceForm", () => {
  it("デバイスコードと設置先が両方入力されるまでcanSubmitがfalseのままであることを確認する", () => {
    const { result } = renderHook(() => useDeviceForm({ onCreated: vi.fn(), onError: vi.fn() }));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setDeviceCode("trapa-dev1"));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setParkingLotId("1"));
    expect(result.current.canSubmit).toBe(true);
  });

  it("送信に成功すると、トリムしたデバイスコード・表示名を送信しフォームをリセットしonCreatedを呼ぶことを確認する", async () => {
    const created: DeviceCreated = {
      id: 1,
      device_code: "trapa-dev1",
      name: "入口カメラ",
      parking_lot_id: 1,
      api_key: "key",
    };
    const spy = vi.spyOn(api, "createDevice").mockResolvedValue(created);
    const onCreated = vi.fn();
    const { result } = renderHook(() => useDeviceForm({ onCreated, onError: vi.fn() }));

    act(() => {
      result.current.setDeviceCode("  trapa-dev1  ");
      result.current.setName("  入口カメラ  ");
      result.current.setParkingLotId("1");
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).toHaveBeenCalledWith({ device_code: "trapa-dev1", name: "入口カメラ", parking_lot_id: 1 });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.deviceCode).toBe("");
    expect(result.current.name).toBe("");
  });

  it("表示名を入力しなかった場合、nameを省略して送信することを確認する", async () => {
    const spy = vi.spyOn(api, "createDevice").mockResolvedValue({} as DeviceCreated);
    const { result } = renderHook(() => useDeviceForm({ onCreated: vi.fn(), onError: vi.fn() }));

    act(() => {
      result.current.setDeviceCode("trapa-dev1");
      result.current.setParkingLotId("1");
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).toHaveBeenCalledWith({ device_code: "trapa-dev1", name: undefined, parking_lot_id: 1 });
  });

  it("canSubmitがfalseの場合、送信してもAPIを呼ばないことを確認する", async () => {
    const spy = vi.spyOn(api, "createDevice");
    const { result } = renderHook(() => useDeviceForm({ onCreated: vi.fn(), onError: vi.fn() }));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("送信に失敗した場合、onErrorが呼ばれフォームの入力内容は保持されることを確認する", async () => {
    vi.spyOn(api, "createDevice").mockRejectedValue(new Error("device_code already exists"));
    const onError = vi.fn();
    const { result } = renderHook(() => useDeviceForm({ onCreated: vi.fn(), onError }));

    act(() => {
      result.current.setDeviceCode("trapa-dev1");
      result.current.setParkingLotId("1");
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(onError).toHaveBeenCalledWith("device_code already exists");
    expect(result.current.deviceCode).toBe("trapa-dev1");
  });
});
