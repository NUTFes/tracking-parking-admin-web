import {
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import type { CommandType, Device, ParkingLot } from "../api/types";
import { COMMAND_LABELS } from "../api/types";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import { useDeviceTable } from "../hooks/useDeviceTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatusBadge } from "./StatusBadge";

type Props = {
  devices: Device[];
  parkingLots: ParkingLot[];
  onCommand: (deviceId: number, commandType: CommandType) => Promise<void>;
  onUpdate: (deviceId: number, input: { device_code: string; name: string; parking_lot_id: number }) => Promise<void>;
  onDelete: (deviceId: number) => Promise<void>;
  onError: (message: string) => void;
};

const COMMAND_DIALOG: Record<CommandType, { title: string; confirmColor: "primary" | "warning" | "error" }> = {
  restart: { title: "デバイスの再起動", confirmColor: "primary" },
  start_counting: { title: "集計の開始", confirmColor: "primary" },
  stop_counting: { title: "集計の停止", confirmColor: "warning" },
};

export function DeviceTable({ devices, parkingLots, onCommand, onUpdate, onDelete, onError }: Props) {
  const {
    pendingId,
    editingId,
    editDeviceCode,
    setEditDeviceCode,
    editName,
    setEditName,
    editParkingLotId,
    setEditParkingLotId,
    commandTarget,
    deleteTarget,
    requestCommand,
    cancelCommand,
    confirmCommand,
    startEdit,
    cancelEdit,
    saveEdit,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useDeviceTable({ onCommand, onUpdate, onDelete, onError });
  const lotNameById = new Map(parkingLots.map((lot) => [lot.id, lot.name]));

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>デバイス</TableCell>
              <TableCell>駐車場</TableCell>
              <TableCell>状態</TableCell>
              <TableCell>最終通信</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => {
              const isEditing = editingId === device.id;
              const isPending = pendingId === device.id;
              return (
                <TableRow key={device.id} hover>
                  {isEditing ? (
                    <>
                      <TableCell>
                        <Stack spacing={1}>
                          <TextField
                            value={editDeviceCode}
                            onChange={(e) => setEditDeviceCode(e.target.value)}
                            placeholder="デバイスコード"
                            size="small"
                          />
                          <TextField
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="表示名（任意）"
                            size="small"
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          value={editParkingLotId}
                          onChange={(e) => setEditParkingLotId(e.target.value)}
                          size="small"
                          sx={{ minWidth: 140 }}
                        >
                          {parkingLots.map((lot) => (
                            <MenuItem key={lot.id} value={lot.id}>
                              {lot.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell align="right">
                        <Tooltip title="保存">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={isPending || !editDeviceCode.trim() || !editParkingLotId}
                              onClick={() => saveEdit(device.id)}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="キャンセル">
                          <span>
                            <IconButton size="small" disabled={isPending} onClick={cancelEdit}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <span style={{ fontWeight: 600 }}>{device.name ?? device.device_code}</span>
                          <Chip label={device.device_code} size="small" variant="outlined" sx={{ width: "fit-content" }} />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {lotNameById.get(device.parking_lot_id) ?? "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge online={device.online} />
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{formatRelativeTime(device.last_seen_at)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={device.online ? "集計開始" : "デバイスがオフラインのため送信できません"}>
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={pendingId !== null || !device.online}
                              onClick={() => requestCommand(device, "start_counting")}
                            >
                              <PlayCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={device.online ? "集計停止" : "デバイスがオフラインのため送信できません"}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={pendingId !== null || !device.online}
                              onClick={() => requestCommand(device, "stop_counting")}
                            >
                              <PauseCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={device.online ? "再起動" : "デバイスがオフラインのため送信できません"}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={pendingId !== null || !device.online}
                              onClick={() => requestCommand(device, "restart")}
                            >
                              <RestartAltIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="編集">
                          <span>
                            <IconButton size="small" disabled={pendingId !== null} onClick={() => startEdit(device)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="削除">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={pendingId !== null}
                              onClick={() => requestDelete(device)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 4 }}>
                  登録済みのデバイスがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={commandTarget !== null}
        title={commandTarget ? COMMAND_DIALOG[commandTarget.commandType].title : ""}
        description={
          commandTarget
            ? `${commandTarget.device.device_code} に${COMMAND_LABELS[commandTarget.commandType]}を送信しますか？`
            : ""
        }
        confirmLabel={commandTarget ? COMMAND_LABELS[commandTarget.commandType] : ""}
        confirmColor={commandTarget ? COMMAND_DIALOG[commandTarget.commandType].confirmColor : "primary"}
        onConfirm={confirmCommand}
        onCancel={cancelCommand}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="デバイスの削除"
        description={`${deleteTarget?.device_code} を削除しますか？（入出庫履歴・コマンド履歴も削除されます）`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
