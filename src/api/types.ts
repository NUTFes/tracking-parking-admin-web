export type ResetTarget = "current" | "system";

export type ParkingLot = {
  id: number;
  name: string;
  capacity: number;
  current_count: number;
  system_count: number;
  has_device: boolean;
  created_at: string;
};

export type Device = {
  id: number;
  device_code: string;
  name: string | null;
  parking_lot_id: number;
  last_status: string | null;
  last_seen_at: string | null;
  online: boolean;
  created_at: string;
};

export type DeviceCreated = {
  id: number;
  device_code: string;
  name: string | null;
  parking_lot_id: number;
  // Returned exactly once, at creation time — the server only ever stores its hash.
  api_key: string;
};

export type CommandStatus = "pending" | "delivered" | "completed" | "failed";
export type CommandType = "restart" | "start_counting" | "stop_counting";

export const COMMAND_LABELS: Record<CommandType, string> = {
  restart: "再起動",
  start_counting: "集計開始",
  stop_counting: "集計停止",
};

export type DeviceCommand = {
  id: number;
  device_id: number;
  command_type: CommandType;
  status: CommandStatus;
  requested_by: string | null;
  result_message: string | null;
  created_at: string;
  delivered_at: string | null;
  completed_at: string | null;
};

export type ParkingActivity = {
  id: number;
  parking_lot_id: number;
  activity_type: "entry" | "exit" | "manual_adjustment" | "reset" | "system_reset";
  delta: number;
  count_after: number;
  actor_label: string;
  note: string | null;
  created_at: string;
};

export type HealthStatus = {
  status: string;
  database: string;
  timestamp: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type AuthUser = {
  id: number;
  email: string;
};
