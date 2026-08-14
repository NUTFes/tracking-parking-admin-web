import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useApiKeyReveal } from "../hooks/useApiKeyReveal";
import type { DeviceCreated } from "../api/types";

type Props = {
  device: DeviceCreated;
  onDismiss: () => void;
};

export function ApiKeyReveal({ device, onDismiss }: Props) {
  const { copied, handleCopy } = useApiKeyReveal(device);

  return (
    <Alert severity="warning" variant="outlined" onClose={onDismiss} sx={{ borderRadius: 3 }}>
      <AlertTitle sx={{ fontWeight: 700 }}>「{device.device_code}」のAPIキーが発行されました</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        このAPIキーは今だけ表示されます。エッジデバイスの設定に使用してください。一度閉じると二度と表示できません（サーバーにはハッシュ値のみ保存されます）。
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "action.hover",
          borderRadius: 2,
          p: 1,
        }}
      >
        <Box component="code" sx={{ flex: 1, fontSize: 13, wordBreak: "break-all" }}>
          {device.api_key}
        </Box>
        <Button size="small" variant="outlined" startIcon={<ContentCopyIcon fontSize="small" />} onClick={handleCopy}>
          {copied ? "コピーしました" : "コピー"}
        </Button>
      </Box>
    </Alert>
  );
}
