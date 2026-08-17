import { IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import type { AdminUser } from "../api/types";
import { useAdminUserTable } from "../hooks/useAdminUserTable";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  users: AdminUser[];
  onDelete: (userId: number) => Promise<void>;
  onError: (message: string) => void;
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("ja-JP");
}

export function AdminUserTable({ users, onDelete, onError }: Props) {
  const { pendingId, deleteTarget, requestDelete, cancelDelete, confirmDelete } = useAdminUserTable({
    onDelete,
    onError,
  });

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small" aria-label="許可ユーザー一覧">
          <TableHead>
            <TableRow>
              <TableCell>メールアドレス</TableCell>
              <TableCell>登録日時</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{user.email}</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{formatDateTime(user.created_at)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="削除">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={pendingId !== null}
                        onClick={() => requestDelete(user)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: "text.secondary", py: 4 }}>
                  許可ユーザーが登録されていません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="許可ユーザーの削除"
        description={`「${deleteTarget?.email}」を許可リストから削除しますか？（このアカウントはログインできなくなります）`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
