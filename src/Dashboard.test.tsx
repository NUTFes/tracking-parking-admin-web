import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import { api, authApi } from "./api/client";
import { AuthProvider } from "./auth/AuthContext";
import { setAccessToken } from "./api/authToken";
import type { AdminUser, Device, HealthStatus, ParkingActivity, ParkingLot } from "./api/types";

const HEALTH_OK: HealthStatus = { status: "ok", database: "ok", timestamp: "2026-08-15T00:00:00+09:00" };

function mockDashboardEndpoints(
  overrides: Partial<{
    health: HealthStatus;
    parkingLots: ParkingLot[];
    devices: Device[];
    activities: ParkingActivity[];
    adminUsers: AdminUser[];
  }> = {},
) {
  vi.spyOn(api, "health").mockResolvedValue(overrides.health ?? HEALTH_OK);
  vi.spyOn(api, "listParkingLots").mockResolvedValue(overrides.parkingLots ?? []);
  vi.spyOn(api, "listDevices").mockResolvedValue(overrides.devices ?? []);
  vi.spyOn(api, "listAllActivities").mockResolvedValue(overrides.activities ?? []);
  vi.spyOn(api, "listAdminUsers").mockResolvedValue(overrides.adminUsers ?? []);
}

function renderDashboard() {
  return render(
    <AuthProvider>
      <Dashboard />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(authApi, "bootstrap").mockImplementation(async () => {
    setAccessToken("admin-token");
    return true;
  });
  vi.spyOn(authApi, "me").mockResolvedValue({ id: 1, email: "25.m.kitano.nutfes@gmail.com" });
});

afterEach(() => {
  vi.restoreAllMocks();
  setAccessToken(null);
});

describe("Dashboard", () => {
  it("駐車場管理・デバイス管理・ユーザー管理・活動ログの各セクションを表示することを確認する", async () => {
    mockDashboardEndpoints();
    renderDashboard();

    expect(await screen.findByText("駐車場管理")).toBeInTheDocument();
    expect(screen.getByText("デバイス管理")).toBeInTheDocument();
    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
    expect(screen.getByText("活動ログ")).toBeInTheDocument();
  });

  it("ログイン中のユーザーのメールアドレスを表示することを確認する", async () => {
    mockDashboardEndpoints();
    renderDashboard();

    expect(await screen.findByText("25.m.kitano.nutfes@gmail.com")).toBeInTheDocument();
  });

  it("サーバーが正常な場合、正常稼働中のチップを表示することを確認する", async () => {
    mockDashboardEndpoints({ health: HEALTH_OK });
    renderDashboard();

    expect(await screen.findByText("サーバー正常稼働中")).toBeInTheDocument();
  });

  it("サーバーがok以外の場合、応答なしのチップを表示することを確認する", async () => {
    mockDashboardEndpoints({
      health: { status: "degraded", database: "error", timestamp: "2026-08-15T00:00:00+09:00" },
    });
    renderDashboard();

    expect(await screen.findByText("サーバー応答なし")).toBeInTheDocument();
  });

  it("駐車場一覧の取得に失敗した場合、エラーアラートを表示することを確認する", async () => {
    vi.spyOn(api, "health").mockResolvedValue(HEALTH_OK);
    vi.spyOn(api, "listParkingLots").mockRejectedValue(new Error("接続できません"));
    vi.spyOn(api, "listDevices").mockResolvedValue([]);
    vi.spyOn(api, "listAllActivities").mockResolvedValue([]);
    vi.spyOn(api, "listAdminUsers").mockResolvedValue([]);
    renderDashboard();

    expect(await screen.findByText("接続できません")).toBeInTheDocument();
  });

  it("デバイス一覧・許可ユーザー一覧・活動ログの取得に失敗した場合、それぞれエラーアラートを表示することを確認する", async () => {
    vi.spyOn(api, "health").mockResolvedValue(HEALTH_OK);
    vi.spyOn(api, "listParkingLots").mockResolvedValue([]);
    vi.spyOn(api, "listDevices").mockRejectedValue(new Error("デバイス一覧を取得できません"));
    vi.spyOn(api, "listAllActivities").mockRejectedValue(new Error("活動ログを取得できません"));
    vi.spyOn(api, "listAdminUsers").mockRejectedValue(new Error("許可ユーザー一覧を取得できません"));
    renderDashboard();

    expect(await screen.findByText("デバイス一覧を取得できません")).toBeInTheDocument();
    expect(screen.getByText("活動ログを取得できません")).toBeInTheDocument();
    expect(screen.getByText("許可ユーザー一覧を取得できません")).toBeInTheDocument();
  });

  it("新規デバイス登録後、APIキー表示（一度きり）が現れ、閉じると消えることを確認する", async () => {
    const user = userEvent.setup();
    const lot: ParkingLot = {
      id: 1,
      name: "第一駐車場",
      capacity: 10,
      current_count: 0,
      system_count: 0,
      has_device: false,
      created_at: "2026-08-15T00:00:00",
    };
    mockDashboardEndpoints({ parkingLots: [lot] });
    const created = { id: 1, device_code: "trapa-dev1", name: null, parking_lot_id: 1, api_key: "secret-key" };
    vi.spyOn(api, "createDevice").mockResolvedValue(created);
    renderDashboard();
    await screen.findByText("第一駐車場");

    await user.type(screen.getByLabelText(/デバイスコード/), "trapa-dev1");
    await user.click(screen.getByLabelText(/設置先の駐車場/));
    await user.click(await screen.findByRole("option", { name: "第一駐車場" }));
    await user.click(screen.getByRole("button", { name: "デバイスを登録" }));

    expect(await screen.findByText("secret-key")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("secret-key")).not.toBeInTheDocument();
  });

  it("駐車場登録に失敗すると、グローバル通知（Snackbar）にエラーメッセージが表示されることを確認する", async () => {
    const user = userEvent.setup();
    mockDashboardEndpoints();
    vi.spyOn(api, "createParkingLot").mockRejectedValue(new Error("capacity must be non-negative"));
    renderDashboard();
    await screen.findByText("駐車場管理");

    await user.type(screen.getByLabelText(/駐車場名/), "第一駐車場");
    await user.type(screen.getByLabelText(/収容台数/), "1");
    await user.click(screen.getByRole("button", { name: "駐車場を登録" }));

    expect(await screen.findByText("capacity must be non-negative")).toBeInTheDocument();
  });

  it("ログアウトボタンを押すとauthApi.logoutが呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    mockDashboardEndpoints();
    const logoutSpy = vi.spyOn(authApi, "logout").mockResolvedValue(undefined);
    renderDashboard();
    await screen.findByText("駐車場管理");

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
  });
});
