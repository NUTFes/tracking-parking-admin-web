import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
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
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import type { ParkingLot, ResetTarget } from "../api/types";
import { useParkingLotTable } from "../hooks/useParkingLotTable";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  parkingLots: ParkingLot[];
  onUpdate: (lotId: number, input: { name: string; capacity: number }) => Promise<void>;
  onDelete: (lotId: number) => Promise<void>;
  onReset: (lotId: number, input: { count: number; target: ResetTarget; note?: string }) => Promise<void>;
  onResetAll: (target: ResetTarget) => Promise<void>;
  onError: (message: string) => void;
};

const RESET_ALL_LABEL: Record<ResetTarget, string> = {
  current: "人力集計",
  system: "システム集計",
};

export function ParkingLotTable({ parkingLots, onUpdate, onDelete, onReset, onResetAll, onError }: Props) {
  const {
    editingId,
    editName,
    setEditName,
    editCapacity,
    setEditCapacity,
    pendingId,
    deleteTarget,
    startEdit,
    cancelEdit,
    saveEdit,
    requestDelete,
    cancelDelete,
    confirmDelete,
    resetTarget,
    resetField,
    setResetField,
    resetCount,
    setResetCount,
    resetNote,
    setResetNote,
    requestReset,
    cancelReset,
    confirmReset,
    resetAllTarget,
    requestResetAll,
    cancelResetAll,
    confirmResetAll,
  } = useParkingLotTable({ onUpdate, onDelete, onReset, onResetAll, onError });

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small" aria-label="駐車場一覧">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>駐車場名</TableCell>
              <TableCell>収容台数</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  現在の駐車台数（人力）
                  <Tooltip title="全駐車場の人力集計を0にリセット">
                    <span>
                      <IconButton size="small" disabled={parkingLots.length === 0} onClick={() => requestResetAll("current")}>
                        <RestartAltIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  システム集計
                  <Tooltip title="全駐車場のシステム集計を0にリセット">
                    <span>
                      <IconButton size="small" disabled={parkingLots.length === 0} onClick={() => requestResetAll("system")}>
                        <RestartAltIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {parkingLots.map((lot) => {
              const isEditing = editingId === lot.id;
              const isPending = pendingId === lot.id;
              return (
                <TableRow key={lot.id} hover>
                  <TableCell sx={{ color: "text.secondary" }}>{lot.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {isEditing ? (
                      <TextField
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        size="small"
                        sx={{ width: 180 }}
                      />
                    ) : (
                      lot.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        type="number"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        size="small"
                        sx={{ width: 100 }}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    ) : (
                      lot.capacity
                    )}
                  </TableCell>
                  <TableCell>{lot.current_count}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {lot.has_device ? lot.system_count : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {isEditing ? (
                      <>
                        <Tooltip title="保存">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={isPending || !editName.trim() || !editCapacity}
                              onClick={() => saveEdit(lot.id)}
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
                      </>
                    ) : (
                      <>
                        <Tooltip title="台数をリセット">
                          <span>
                            <IconButton
                              size="small"
                              disabled={pendingId !== null}
                              onClick={() => requestReset(lot)}
                            >
                              <RestartAltIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="編集">
                          <span>
                            <IconButton size="small" disabled={pendingId !== null} onClick={() => startEdit(lot)}>
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
                              onClick={() => requestDelete(lot)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {parkingLots.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 4 }}>
                  登録済みの駐車場がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={resetTarget !== null} onClose={cancelReset}>
        <DialogTitle>駐車台数のリセット</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <FormControl size="small">
              <FormLabel id="reset-field-label">対象</FormLabel>
              <RadioGroup
                row
                aria-labelledby="reset-field-label"
                value={resetField}
                onChange={(e) => setResetField(e.target.value as ResetTarget)}
              >
                <FormControlLabel value="current" control={<Radio size="small" />} label="人力集計" />
                <FormControlLabel value="system" control={<Radio size="small" />} label="システム集計" />
              </RadioGroup>
            </FormControl>
            <TextField
              label="リセット後の台数"
              type="number"
              value={resetCount}
              onChange={(e) => setResetCount(e.target.value)}
              autoFocus
              size="small"
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="理由（任意）"
              value={resetNote}
              onChange={(e) => setResetNote(e.target.value)}
              placeholder="実車確認による補正"
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelReset}>キャンセル</Button>
          <Button
            onClick={confirmReset}
            variant="contained"
            disabled={!resetCount || pendingId === resetTarget?.id}
          >
            リセット
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={resetAllTarget !== null}
        title="全駐車場の一括リセット"
        description={
          resetAllTarget
            ? `全ての駐車場の「${RESET_ALL_LABEL[resetAllTarget]}」を0にリセットします。よろしいですか？`
            : ""
        }
        confirmLabel="リセット"
        confirmColor="warning"
        onConfirm={confirmResetAll}
        onCancel={cancelResetAll}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="駐車場の削除"
        description={`「${deleteTarget?.name}」を削除しますか？`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
