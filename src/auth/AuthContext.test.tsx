import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../api/client";
import { getAccessToken, setAccessToken } from "../api/authToken";
import { AuthProvider, useAuth } from "./AuthContext";
import type { AuthUser } from "../api/types";

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

afterEach(() => {
  vi.restoreAllMocks();
  setAccessToken(null);
});

describe("AuthContext", () => {
  it("useAuthはAuthProviderの外で使うとエラーを投げることを確認する", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider");
  });

  it("マウント直後はisBootstrappingがtrueで、bootstrap完了後にfalseへ変わることを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
    const { result } = renderAuth();

    expect(result.current.isBootstrapping).toBe(true);

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
  });

  it("bootstrapでアクセストークンが取得できた場合、isAuthenticatedがtrueになりユーザー情報を取得することを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockImplementation(async () => {
      setAccessToken("admin-token");
      return true;
    });
    const user: AuthUser = { id: 1, email: "25.m.kitano.nutfes@gmail.com" };
    vi.spyOn(authApi, "me").mockResolvedValue(user);
    const { result } = renderAuth();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await waitFor(() => expect(result.current.user).toEqual(user));
  });

  it("ユーザー情報の取得に失敗しても、クラッシュせずuserはnullのままであることを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockImplementation(async () => {
      setAccessToken("admin-token");
      return true;
    });
    vi.spyOn(authApi, "me").mockRejectedValue(new Error("network error"));
    const { result } = renderAuth();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("アクセストークンがnullに変わると、isAuthenticatedがfalseになりuserもクリアされることを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockImplementation(async () => {
      setAccessToken("admin-token");
      return true;
    });
    vi.spyOn(authApi, "me").mockResolvedValue({ id: 1, email: "25.m.kitano.nutfes@gmail.com" });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => setAccessToken(null));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("loginWithGoogleはauthApi.loginWithGoogleを呼ぶことを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
    const spy = vi.spyOn(authApi, "loginWithGoogle").mockResolvedValue(undefined);
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.loginWithGoogle("google-id-token");
    });

    expect(spy).toHaveBeenCalledWith("google-id-token");
  });

  it("logoutはauthApi.logoutを呼ぶことを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
    const spy = vi.spyOn(authApi, "logout").mockResolvedValue(undefined);
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("マウント時点で既にアクセストークンが存在する場合、isAuthenticatedが最初からtrueであることを確認する", () => {
    setAccessToken("already-there");
    vi.spyOn(authApi, "bootstrap").mockResolvedValue(true);
    vi.spyOn(authApi, "me").mockResolvedValue({ id: 1, email: "25.m.kitano.nutfes@gmail.com" });

    const { result } = renderAuth();

    expect(result.current.isAuthenticated).toBe(true);
    expect(getAccessToken()).toBe("already-there");
  });
});
