import {
  IconButton,
  Paper,
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
import type { ParkingLot } from "../api/types";
import { useParkingLotTable } from "../hooks/useParkingLotTable";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  parkingLots: ParkingLot[];
  onUpdate: (lotId: number, input: { name: string; capacity: number }) => Promise<void>;
  onDelete: (lotId: number) => Promise<void>;
  onError: (message: string) => void;
};

export function ParkingLotTable({ parkingLots, onUpdate, onDelete, onError }: Props) {
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
  } = useParkingLotTable({ onUpdate, onDelete, onError });

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>駐車場名</TableCell>
              <TableCell>収容台数</TableCell>
              <TableCell>現在の駐車台数</TableCell>
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
                <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 4 }}>
                  登録済みの駐車場がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
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
