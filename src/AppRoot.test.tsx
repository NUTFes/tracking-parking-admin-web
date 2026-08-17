import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoot } from "./AppRoot";
import { authApi } from "./api/client";

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  GoogleLogin: () => <div>mock-google-login</div>,
}));

beforeEach(() => {
  vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppRoot", () => {
  it("未認証状態でも異常なく描画できることを確認する", async () => {
    render(<AppRoot />);

    expect(await screen.findByText("Tracking-Parking 管理コンソール")).toBeInTheDocument();
  });

  it("OSがダークモード設定の場合でも異常なく描画できることを確認する", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);

    render(<AppRoot />);

    expect(await screen.findByText("Tracking-Parking 管理コンソール")).toBeInTheDocument();
  });
});
