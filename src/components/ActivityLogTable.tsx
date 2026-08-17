import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import type { ParkingActivity, ParkingLot } from "../api/types";

type Props = {
  activities: ParkingActivity[];
  parkingLots: ParkingLot[];
};

const ACTIVITY_TYPE_LABELS: Record<ParkingActivity["activity_type"], string> = {
  entry: "入庫",
  exit: "出庫",
  manual_adjustment: "手動調整",
  reset: "リセット",
  system_reset: "リセット",
};

// entry/exit/system_reset move system_count (device-detected); the other two
// move current_count (human-counted) — see services/api/docs/db-schema.md.
const ACTIVITY_TARGET_LABELS: Record<ParkingActivity["activity_type"], string> = {
  entry: "システム",
  exit: "システム",
  system_reset: "システム",
  manual_adjustment: "人力",
  reset: "人力",
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("ja-JP");
}

export function ActivityLogTable({ activities, parkingLots }: Props) {
  const lotNameById = new Map(parkingLots.map((lot) => [lot.id, lot.name]));

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, maxHeight: 400, overflow: "auto" }}>
      <Table size="small" stickyHeader aria-label="活動ログ一覧">
        <TableHead>
          <TableRow>
            <TableCell>日時</TableCell>
            <TableCell>駐車場</TableCell>
            <TableCell>種別</TableCell>
            <TableCell>対象</TableCell>
            <TableCell align="right">増減</TableCell>
            <TableCell align="right">変更後</TableCell>
            <TableCell>実行者</TableCell>
            <TableCell>メモ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id} hover>
              <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                {formatDateTime(activity.created_at)}
              </TableCell>
              <TableCell>{lotNameById.get(activity.parking_lot_id) ?? `#${activity.parking_lot_id}`}</TableCell>
              <TableCell>{ACTIVITY_TYPE_LABELS[activity.activity_type] ?? activity.activity_type}</TableCell>
              <TableCell sx={{ color: "text.secondary" }}>
                {ACTIVITY_TARGET_LABELS[activity.activity_type] ?? "-"}
              </TableCell>
              <TableCell align="right" sx={{ color: activity.delta < 0 ? "error.main" : "success.main" }}>
                {activity.delta > 0 ? `+${activity.delta}` : activity.delta}
              </TableCell>
              <TableCell align="right">{activity.count_after}</TableCell>
              <TableCell>{activity.actor_label}</TableCell>
              <TableCell sx={{ color: "text.secondary" }}>{activity.note ?? "-"}</TableCell>
            </TableRow>
          ))}
          {activities.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ color: "text.secondary", py: 4 }}>
                活動ログがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
