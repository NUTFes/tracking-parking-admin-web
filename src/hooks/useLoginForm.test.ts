import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../api/client";
import { AuthProvider } from "../auth/AuthContext";
import { useLoginForm } from "./useLoginForm";

beforeEach(() => {
  // AuthProvider bootstraps a session via a real fetch() on mount — stub it
  // so this test never depends on a real backend being reachable.
  vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderLoginFormHook() {
  return renderHook(() => useLoginForm(), { wrapper: AuthProvider });
}

describe("useLoginForm", () => {
  it("idTokenが未定義の場合、専用のエラーメッセージをセットしログインを試みないことを確認する", async () => {
    const loginSpy = vi.spyOn(authApi, "loginWithGoogle");
    const { result } = renderLoginFormHook();

    await act(async () => {
      await result.current.handleGoogleCredential(undefined);
    });

    expect(result.current.error).toBe("Googleからの応答が不正です");
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("ログインに成功した場合、エラーが出ずsubmittingがfalseに戻ることを確認する", async () => {
    vi.spyOn(authApi, "loginWithGoogle").mockResolvedValue(undefined);
    const { result } = renderLoginFormHook();

    await act(async () => {
      await result.current.handleGoogleCredential("valid-id-token");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it("ログインに失敗した場合、許可リストの確認を促すエラーメッセージを表示することを確認する", async () => {
    vi.spyOn(authApi, "loginWithGoogle").mockRejectedValue(
      new Error("このGoogleアカウントは管理者として許可されていません"),
    );
    const { result } = renderLoginFormHook();

    await act(async () => {
      await result.current.handleGoogleCredential("rejected-id-token");
    });

    expect(result.current.error).toBe("このGoogleアカウントではログインできません（許可リストを確認してください）");
  });

  it("handleGoogleErrorを呼ぶと、Googleサインイン失敗のエラーメッセージをセットすることを確認する", () => {
    const { result } = renderLoginFormHook();

    act(() => {
      result.current.handleGoogleError();
    });

    expect(result.current.error).toBe("Googleサインインに失敗しました");
  });
});
