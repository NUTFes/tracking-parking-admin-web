import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginForm() {
  const { username, setUsername, password, setPassword, error, submitting, handleSubmit } = useLoginForm();

  return (
    <Box sx={{ maxWidth: 360, mx: "auto", mt: 12 }}>
      <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 3 }}>
        トラパ 管理コンソール
      </Typography>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="ユーザー名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                fullWidth
                size="small"
              />
              <TextField
                label="パスワード"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                fullWidth
                size="small"
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" disabled={submitting} size="large">
                {submitting ? "ログイン中…" : "ログイン"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
