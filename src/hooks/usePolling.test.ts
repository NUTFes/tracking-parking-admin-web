import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "./usePolling";

afterEach(() => {
  vi.useRealTimers();
});

describe("usePolling", () => {
  it("マウント時に即座にフェッチが実行され、結果がdataに反映されることを確認する", async () => {
    const fetcher = vi.fn().mockResolvedValue("first");
    const { result } = renderHook(() => usePolling(fetcher, 1000));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("first");
    expect(result.current.error).toBeNull();
  });

  it("フェッチが失敗した場合、errorにメッセージがセットされ、dataはnullのままであることを確認する", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => usePolling(fetcher, 1000));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("network down");
    expect(result.current.data).toBeNull();
  });

  it("成功後に再度失敗した場合でも、直前に取得済みのdataは残ったままerrorだけがセットされることを確認する", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("first").mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => usePolling(fetcher, 1000));
    await waitFor(() => expect(result.current.data).toBe("first"));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.data).toBe("first");
  });

  it("refresh()を呼ぶと即座に再フェッチされることを確認する", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");
    const { result } = renderHook(() => usePolling(fetcher, 1000));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it("指定した間隔ごとに自動で再フェッチされることを確認する", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue("value");
    renderHook(() => usePolling(fetcher, 1000));

    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("アンマウントするとインターバルがクリアされ、それ以降フェッチされなくなることを確認する", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue("value");
    const { unmount } = renderHook(() => usePolling(fetcher, 1000));
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    unmount();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
