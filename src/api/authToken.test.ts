import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, onAccessTokenChange, setAccessToken } from "./authToken";

afterEach(() => {
  setAccessToken(null);
});

describe("authToken", () => {
  it("初期状態、および明示的にnullをセットした場合、getAccessTokenがnullを返すことを確認する", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("setAccessTokenでセットした値をgetAccessTokenで取得できることを確認する", () => {
    setAccessToken("token-abc");

    expect(getAccessToken()).toBe("token-abc");
  });

  it("setAccessTokenを呼ぶと、登録済みのリスナーに新しいトークンが通知されることを確認する", () => {
    const listener = vi.fn();
    onAccessTokenChange(listener);

    setAccessToken("token-xyz");

    expect(listener).toHaveBeenCalledWith("token-xyz");
  });

  it("onAccessTokenChangeが返す解除関数を呼ぶと、以後リスナーが呼ばれなくなることを確認する", () => {
    const listener = vi.fn();
    const unsubscribe = onAccessTokenChange(listener);

    unsubscribe();
    setAccessToken("token-after-unsubscribe");

    expect(listener).not.toHaveBeenCalled();
  });

  it("複数のリスナーを登録した場合、全員に通知されることを確認する", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    onAccessTokenChange(listenerA);
    onAccessTokenChange(listenerB);

    setAccessToken("token-broadcast");

    expect(listenerA).toHaveBeenCalledWith("token-broadcast");
    expect(listenerB).toHaveBeenCalledWith("token-broadcast");
  });
});
