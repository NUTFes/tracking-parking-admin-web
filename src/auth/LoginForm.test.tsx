import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CredentialResponse } from "@react-oauth/google";
import { authApi } from "../api/client";
import { AuthProvider } from "./AuthContext";
import { LoginForm } from "./LoginForm";

// @react-oauth/google renders a real Google-hosted iframe widget — replace
// it with plain buttons that trigger the same onSuccess/onError callbacks
// LoginForm wires up, so LoginForm's own logic can be tested in isolation.
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (credential: CredentialResponse) => void;
    onError: () => void;
  }) => (
    <div>
      <button onClick={() => onSuccess({ credential: "valid-id-token" })}>mock-google-success</button>
      <button onClick={() => onSuccess({})}>mock-google-success-no-credential</button>
      <button onClick={onError}>mock-google-error</button>
    </div>
  ),
}));

beforeEach(() => {
  // AuthProvider bootstraps a session via a real fetch() on mount — stub it
  // so this test never depends on a real backend being reachable.
  vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderLoginForm() {
  return render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>,
  );
}

describe("LoginForm", () => {
  it("タイトルと案内文を表示し、初期状態ではエラーを表示しないことを確認する", () => {
    renderLoginForm();

    expect(screen.getByText("Tracking-Parking 管理コンソール")).toBeInTheDocument();
    expect(screen.getByText("許可された実行委員のGoogleアカウントでログインしてください")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ログインに成功した場合、エラーを表示しないことを確認する", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, "loginWithGoogle").mockResolvedValue(undefined);
    renderLoginForm();

    await user.click(screen.getByText("mock-google-success"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ログインに失敗した場合（許可リスト外など）、エラーメッセージを表示することを確認する", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, "loginWithGoogle").mockRejectedValue(new Error("unauthorized"));
    renderLoginForm();

    await user.click(screen.getByText("mock-google-success"));

    expect(await screen.findByText("このGoogleアカウントではログインできません（許可リストを確認してください）")).toBeInTheDocument();
  });

  it("Googleからcredentialが返らなかった場合、専用のエラーメッセージを表示することを確認する", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByText("mock-google-success-no-credential"));

    expect(await screen.findByText("Googleからの応答が不正です")).toBeInTheDocument();
  });

  it("Googleサインイン自体が失敗した場合、専用のエラーメッセージを表示することを確認する", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByText("mock-google-error"));

    expect(await screen.findByText("Googleサインインに失敗しました")).toBeInTheDocument();
  });
});
