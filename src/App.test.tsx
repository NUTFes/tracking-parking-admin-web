import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api, authApi } from "./api/client";
import { setAccessToken } from "./api/authToken";
import type { AdminUser, Device, HealthStatus, ParkingActivity, ParkingLot } from "./api/types";

// See auth/LoginForm.test.tsx for why GoogleLogin is stubbed out.
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div>mock-google-login</div>,
}));

const HEALTH_OK: HealthStatus = { status: "ok", database: "ok", timestamp: "2026-08-15T00:00:00+09:00" };

function mockDashboardEndpoints() {
  vi.spyOn(api, "health").mockResolvedValue(HEALTH_OK);
  vi.spyOn(api, "listParkingLots").mockResolvedValue([] as ParkingLot[]);
  vi.spyOn(api, "listDevices").mockResolvedValue([] as Device[]);
  vi.spyOn(api, "listAllActivities").mockResolvedValue([] as ParkingActivity[]);
  vi.spyOn(api, "listAdminUsers").mockResolvedValue([] as AdminUser[]);
}

afterEach(() => {
  vi.restoreAllMocks();
  setAccessToken(null);
});

describe("App", () => {
  it("bootstrap中はローディング表示になることを確認する", () => {
    vi.spyOn(authApi, "bootstrap").mockReturnValue(new Promise(() => {})); // never resolves

    render(<App />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("未認証の場合、ログインフォームを表示することを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockResolvedValue(false);

    render(<App />);

    expect(await screen.findByText("Tracking-Parking 管理コンソール")).toBeInTheDocument();
    expect(screen.getByText("mock-google-login")).toBeInTheDocument();
  });

  it("認証済みの場合、管理コンソール（Dashboard）を表示することを確認する", async () => {
    vi.spyOn(authApi, "bootstrap").mockImplementation(async () => {
      setAccessToken("admin-token");
      return true;
    });
    vi.spyOn(authApi, "me").mockResolvedValue({ id: 1, email: "25.m.kitano.nutfes@gmail.com" });
    mockDashboardEndpoints();

    render(<App />);

    expect(await screen.findByText("Tracking-Parking 管理コンソール")).toBeInTheDocument();
    expect(screen.getByText("駐車場管理")).toBeInTheDocument();
  });
});
