import { Button, Paper, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAdminUserForm } from "../hooks/useAdminUserForm";
import type { AdminUser } from "../api/types";

type Props = {
  onCreated: (user: AdminUser) => void;
  onError: (message: string) => void;
};

export function AdminUserForm({ onCreated, onError }: Props) {
  const { email, setEmail, submitting, canSubmit, handleSubmit } = useAdminUserForm({ onCreated, onError });

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack
        component="form"
        onSubmit={handleSubmit}
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "flex-end" }}
      >
        <TextField
          label="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="25.m.kitano.nutfes@gmail.com"
          required
          size="small"
          sx={{ minWidth: 280 }}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={submitting || !canSubmit}>
          {submitting ? "登録中…" : "ユーザーを登録"}
        </Button>
      </Stack>
    </Paper>
  );
}
