import { afterEach, describe, expect, it, vi } from "vitest";
import { api, authApi } from "./client";
import { getAccessToken, setAccessToken } from "./authToken";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function errorResponse(status: number, detail: unknown): Response {
  return { ok: false, status, text: async () => JSON.stringify({ detail }) } as unknown as Response;
}

function noBodyResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => "" } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe("request()", () => {
  it("アクセストークンがある場合、Authorizationヘッダーを付与することを確認する", async () => {
    setAccessToken("my-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await api.listParkingLots();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer my-token");
  });

  it("アクセストークンがない場合、Authorizationヘッダーを付与しないことを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await api.listParkingLots();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("401を受け取ったら1回だけリフレッシュを試み、成功すれば元のリクエストを自動でリトライすることを確認する", async () => {
    setAccessToken("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(401, "invalid or expired access token"))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "new-token", token_type: "bearer", expires_in: 900 }))
      .mockResolvedValueOnce(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.listParkingLots();

    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:8000/api/v1/auth/refresh");
    expect(getAccessToken()).toBe("new-token");
  });

  it("リフレッシュも失敗した場合、アクセストークンをクリアし元のエラーを投げることを確認する（無限リトライしない）", async () => {
    setAccessToken("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(401, "invalid or expired access token"))
      .mockResolvedValueOnce(errorResponse(401, "refresh token invalid or expired"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow("invalid or expired access token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBeNull();
  });

  it("/auth/配下のエンドポイントで401が返ってもリフレッシュを試みないことを確認する（無限再帰の回避）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(401, "invalid credentials"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.me()).rejects.toThrow("invalid credentials");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("同時に複数のリクエストが401になっても、実際のリフレッシュ通信は1回だけになることを確認する（重複排除）", async () => {
    setAccessToken("expired-token");
    const callsPerPath: Record<string, number> = {};
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const path = url.replace("http://localhost:8000/api/v1", "");
      callsPerPath[path] = (callsPerPath[path] ?? 0) + 1;
      if (path === "/auth/refresh") {
        return Promise.resolve(
          jsonResponse(200, { access_token: "new-token", token_type: "bearer", expires_in: 900 }),
        );
      }
      // First hit per data endpoint is the stale-token 401; the retry after
      // refresh (second hit) succeeds.
      return Promise.resolve(callsPerPath[path] === 1 ? errorResponse(401, "expired") : jsonResponse(200, []));
    });
    vi.stubGlobal("fetch", fetchMock);

    const [lots, devices] = await Promise.all([api.listParkingLots(), api.listDevices()]);

    expect(lots).toEqual([]);
    expect(devices).toEqual([]);
    expect(callsPerPath["/auth/refresh"]).toBe(1);
  });

  it("リフレッシュのfetch自体が例外を投げた場合も、アクセストークンをクリアして失敗扱いにすることを確認する", async () => {
    setAccessToken("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(401, "invalid or expired access token"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow("invalid or expired access token");
    expect(getAccessToken()).toBeNull();
  });

  it("204レスポンスの場合、bodyを読まずundefinedを返すことを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(noBodyResponse(204));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.deleteParkingLot(1)).resolves.toBeUndefined();
  });

  it("detailが配列だが有効なmsgが1件もない場合、生のレスポンスボディにフォールバックすることを確認する", async () => {
    const body = [{}, { msg: "" }];
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(422, body));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow(JSON.stringify({ detail: body }));
  });

  it("detailが文字列でも配列でもない場合、生のレスポンスボディにフォールバックすることを確認する", async () => {
    const body = { code: "internal_error" };
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(500, body));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow(JSON.stringify({ detail: body }));
  });

  it("detailがバリデーションエラー配列の場合、msgを' / 'で連結したメッセージにすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      errorResponse(422, [{ msg: "capacity is required" }, { msg: "name is required" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow("capacity is required / name is required");
  });

  it("レスポンスボディがJSONとして解釈できない場合、生のボディにフォールバックすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      { ok: false, status: 500, text: async () => "Internal Server Error" } as unknown as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow("Internal Server Error");
  });

  it("レスポンスボディが空の場合、ステータスコードを含む汎用メッセージにフォールバックすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      { ok: false, status: 500, text: async () => "" } as unknown as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listParkingLots()).rejects.toThrow("エラーが発生しました（500）");
  });
});

describe("authApi", () => {
  it("loginWithGoogleはid_tokenを送信し、返ってきたaccess_tokenを保持することを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { access_token: "admin-token", token_type: "bearer", expires_in: 900 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await authApi.loginWithGoogle("google-id-token");

    expect(getAccessToken()).toBe("admin-token");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/auth/google");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ id_token: "google-id-token" }));
  });

  it("loginWithGoogleが失敗した場合、例外を投げアクセストークンはセットされないままであることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(401, "このGoogleアカウントは管理者として許可されていません"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.loginWithGoogle("bad-token")).rejects.toThrow(
      "このGoogleアカウントは管理者として許可されていません",
    );
    expect(getAccessToken()).toBeNull();
  });

  it("logoutはサーバーに通知したうえで、アクセストークンをクリアすることを確認する", async () => {
    setAccessToken("some-token");
    const fetchMock = vi.fn().mockResolvedValue(noBodyResponse(204));
    vi.stubGlobal("fetch", fetchMock);

    await authApi.logout();

    expect(getAccessToken()).toBeNull();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/auth/logout");
    expect(init.method).toBe("POST");
  });

  it("logout先のリクエストが失敗しても、アクセストークンは必ずクリアされることを確認する（finally節）", async () => {
    setAccessToken("some-token");
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(500, "internal error"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.logout()).rejects.toThrow();
    expect(getAccessToken()).toBeNull();
  });

  it("meはログイン中のユーザー情報を取得することを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: 1, email: "25.m.kitano.nutfes@gmail.com" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.me()).resolves.toEqual({ id: 1, email: "25.m.kitano.nutfes@gmail.com" });
  });

  it("bootstrap()はCookieからのリフレッシュに成功した場合trueを返すことを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { access_token: "restored-token", token_type: "bearer", expires_in: 900 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.bootstrap()).resolves.toBe(true);
    expect(getAccessToken()).toBe("restored-token");
  });

  it("bootstrap()はリフレッシュ用Cookieがない等で失敗した場合falseを返すことを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(401, "refresh token missing"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.bootstrap()).resolves.toBe(false);
    expect(getAccessToken()).toBeNull();
  });
});

describe("api", () => {
  it.each([
    ["health", () => api.health(), "/health"],
    ["listParkingLots", () => api.listParkingLots(), "/parking-lots"],
    ["listAllActivities", () => api.listAllActivities(), "/parking-lots/activities"],
    ["listDevices", () => api.listDevices(), "/devices"],
    ["listAdminUsers", () => api.listAdminUsers(), "/admin-users"],
  ] as const)("%sは正しいパスにGETリクエストすることを確認する", async (_name, call, path) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await call();

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:8000/api/v1${path}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("listCommandsはデバイスIDを含むパスにGETすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await api.listCommands(42);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/v1/devices/42/commands");
  });

  it("createParkingLotが名称・収容台数をボディに含めてPOSTすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.createParkingLot({ name: "第一駐車場", capacity: 20 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/parking-lots");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "第一駐車場", capacity: 20 });
  });

  it("updateParkingLotが指定したlotIdにPATCHすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.updateParkingLot(5, { capacity: 30 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/parking-lots/5");
    expect(init.method).toBe("PATCH");
  });

  it("deleteParkingLotがDELETEし、204を正しくvoidとして扱うことを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(noBodyResponse(204));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.deleteParkingLot(5)).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/parking-lots/5");
    expect(init.method).toBe("DELETE");
  });

  it("resetParkingLotが台数・対象・メモをボディに含めてPOSTすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.resetParkingLot(1, { count: 5, target: "current", note: "実車確認" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/parking-lots/1/reset");
    expect(JSON.parse(init.body as string)).toEqual({ count: 5, target: "current", note: "実車確認" });
  });

  it("resetAllParkingLotsが対象をボディに含めてPOSTすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await api.resetAllParkingLots({ target: "system" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/parking-lots/reset-all");
    expect(JSON.parse(init.body as string)).toEqual({ target: "system" });
  });

  it("createDeviceがデバイス情報をボディに含めてPOSTすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.createDevice({ device_code: "trapa-dev1", parking_lot_id: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/devices");
    expect(JSON.parse(init.body as string)).toEqual({ device_code: "trapa-dev1", parking_lot_id: 1 });
  });

  it("updateDeviceが指定したdeviceIdにPATCHすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.updateDevice(3, { name: "新しい名前" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/devices/3");
    expect(init.method).toBe("PATCH");
  });

  it("deleteDeviceがDELETEすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(noBodyResponse(204));
    vi.stubGlobal("fetch", fetchMock);

    await api.deleteDevice(3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/devices/3");
    expect(init.method).toBe("DELETE");
  });

  it("queueCommandがコマンド種別と発行者をボディに含めてPOSTすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.queueCommand(3, "restart", "25.m.kitano.nutfes@gmail.com");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/devices/3/commands");
    expect(JSON.parse(init.body as string)).toEqual({
      command_type: "restart",
      requested_by: "25.m.kitano.nutfes@gmail.com",
    });
  });

  it("createAdminUserがメールアドレスをボディに含めてPOSTすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.createAdminUser({ email: "25.m.kitano.nutfes@gmail.com" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/admin-users");
    expect(JSON.parse(init.body as string)).toEqual({ email: "25.m.kitano.nutfes@gmail.com" });
  });

  it("deleteAdminUserがDELETEすることを確認する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(noBodyResponse(204));
    vi.stubGlobal("fetch", fetchMock);

    await api.deleteAdminUser(9);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/admin-users/9");
    expect(init.method).toBe("DELETE");
  });
});
