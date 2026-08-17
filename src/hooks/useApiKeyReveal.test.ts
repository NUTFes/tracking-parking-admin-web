import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useApiKeyReveal } from "./useApiKeyReveal";
import type { DeviceCreated } from "../api/types";

const device: DeviceCreated = {
  id: 1,
  device_code: "trapa-dev1",
  name: null,
  parking_lot_id: 1,
  api_key: "secret-key-123",
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useApiKeyReveal", () => {
  it("handleCopyを呼ぶとAPIキーがクリップボードにコピーされ、copiedがtrueになることを確認する", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { result } = renderHook(() => useApiKeyReveal(device));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(writeText).toHaveBeenCalledWith("secret-key-123");
    expect(result.current.copied).toBe(true);
  });

  it("コピーから2秒後、copiedが自動的にfalseへ戻ることを確認する", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const { result } = renderHook(() => useApiKeyReveal(device));

    await act(async () => {
      await result.current.handleCopy();
    });
    expect(result.current.copied).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.copied).toBe(false);
  });
});
