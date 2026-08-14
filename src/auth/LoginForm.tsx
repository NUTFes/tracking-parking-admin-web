import { GoogleLogin } from "@react-oauth/google";
import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginForm() {
  const { error, submitting, handleGoogleCredential, handleGoogleError } = useLoginForm();

  return (
    <Box sx={{ maxWidth: 360, mx: "auto", mt: 12 }}>
      <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 3 }}>
        Tracking-Parking 管理コンソール
      </Typography>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary" align="center">
              許可された実行委員のGoogleアカウントでログインしてください
            </Typography>
            <GoogleLogin
              onSuccess={(credential) => handleGoogleCredential(credential.credential)}
              onError={handleGoogleError}
            />
            {submitting && (
              <Typography variant="caption" color="text.secondary">
                ログイン中…
              </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
