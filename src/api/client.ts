import { getAccessToken, setAccessToken } from "./authToken";
import type {
  AuthUser,
  Device,
  DeviceCommand,
  DeviceCreated,
  HealthStatus,
  ParkingLot,
  ResetTarget,
  TokenResponse,
} from "./types";

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;

let refreshInFlight: Promise<boolean> | null = null;

// Exchanges the HttpOnly refresh-token cookie (sent automatically by the
// browser via credentials:"include") for a new access token. Deduplicated so
// concurrent 401s from several in-flight requests trigger only one call.
async function performRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          setAccessToken(null);
          return false;
        }
        const data = (await res.json()) as TokenResponse;
        setAccessToken(data.access_token);
        return true;
      })
      .catch(() => {
        setAccessToken(null);
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Server errors come back as {"detail": "..."} (our handlers) or, for request
// validation failures, {"detail": [{msg: "...", ...}, ...]} (FastAPI/Pydantic
// default). Either way we want just the human-readable sentence(s), not the
// raw JSON envelope, in messages shown to the admin.
async function extractErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const detail = JSON.parse(body).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((e: { msg?: string }) => e.msg).filter(Boolean);
      if (messages.length > 0) return messages.join(" / ");
    }
  } catch {
    // Body wasn't JSON — fall through to a generic message below.
  }
  return body || `エラーが発生しました（${response.status}）`;
}

async function request<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "include" });

  // Access token expired mid-session: refresh once from the cookie and retry.
  // Never applies to /auth/* itself, to avoid recursing into the refresh flow.
  if (response.status === 401 && allowRetry && !path.startsWith("/auth/")) {
    const refreshed = await performRefresh();
    if (refreshed) return request<T>(path, init, false);
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  loginWithGoogle: async (idToken: string): Promise<void> => {
    const data = await request<TokenResponse>(
      "/auth/google",
      { method: "POST", body: JSON.stringify({ id_token: idToken }) },
      false,
    );
    setAccessToken(data.access_token);
  },

  logout: async (): Promise<void> => {
    try {
      await request("/auth/logout", { method: "POST" }, false);
    } finally {
      setAccessToken(null);
    }
  },

  me: () => request<AuthUser>("/auth/me"),

  // Attempts to re-establish a session from the HttpOnly refresh cookie on
  // page load — the access token itself never survives a reload (authToken.ts).
  bootstrap: () => performRefresh(),
};

export const api = {
  health: () => request<HealthStatus>("/health"),

  listParkingLots: () => request<ParkingLot[]>("/parking-lots"),
  createParkingLot: (input: { name: string; capacity: number }) =>
    request<ParkingLot>("/parking-lots", { method: "POST", body: JSON.stringify(input) }),
  updateParkingLot: (lotId: number, input: { name?: string; capacity?: number }) =>
    request<ParkingLot>(`/parking-lots/${lotId}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteParkingLot: (lotId: number) => request<void>(`/parking-lots/${lotId}`, { method: "DELETE" }),
  resetParkingLot: (lotId: number, input: { count: number; target: ResetTarget; note?: string }) =>
    request<ParkingLot>(`/parking-lots/${lotId}/reset`, { method: "POST", body: JSON.stringify(input) }),
  resetAllParkingLots: (input: { target: ResetTarget; note?: string }) =>
    request<ParkingLot[]>("/parking-lots/reset-all", { method: "POST", body: JSON.stringify(input) }),

  listDevices: () => request<Device[]>("/devices"),
  createDevice: (input: { device_code: string; name?: string; parking_lot_id: number }) =>
    request<DeviceCreated>("/devices", { method: "POST", body: JSON.stringify(input) }),
  updateDevice: (deviceId: number, input: { device_code?: string; name?: string; parking_lot_id?: number }) =>
    request<Device>(`/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteDevice: (deviceId: number) => request<void>(`/devices/${deviceId}`, { method: "DELETE" }),

  queueRestart: (deviceId: number, requestedBy: string) =>
    request<DeviceCommand>(`/devices/${deviceId}/commands`, {
      method: "POST",
      body: JSON.stringify({ command_type: "restart", requested_by: requestedBy }),
    }),
  listCommands: (deviceId: number) => request<DeviceCommand[]>(`/devices/${deviceId}/commands`),
};
