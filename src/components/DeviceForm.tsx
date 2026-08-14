import { Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useDeviceForm } from "../hooks/useDeviceForm";
import type { DeviceCreated, ParkingLot } from "../api/types";

type Props = {
  parkingLots: ParkingLot[];
  onCreated: (device: DeviceCreated) => void;
  onError: (message: string) => void;
};

export function DeviceForm({ parkingLots, onCreated, onError }: Props) {
  const {
    deviceCode,
    setDeviceCode,
    name,
    setName,
    parkingLotId,
    setParkingLotId,
    submitting,
    canSubmit,
    handleSubmit,
  } = useDeviceForm({ onCreated, onError });

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
          label="デバイスコード"
          value={deviceCode}
          onChange={(e) => setDeviceCode(e.target.value)}
          placeholder="trapa-dev1"
          required
          size="small"
        />
        <TextField
          label="表示名（任意）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="第一駐車場 入口カメラ"
          size="small"
        />
        <TextField
          select
          label="設置先の駐車場"
          value={parkingLotId}
          onChange={(e) => setParkingLotId(e.target.value)}
          required
          size="small"
          sx={{ minWidth: 180 }}
          disabled={parkingLots.length === 0}
        >
          {parkingLots.map((lot) => (
            <MenuItem key={lot.id} value={lot.id}>
              {lot.name}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={submitting || !canSubmit}>
          {submitting ? "登録中…" : "デバイスを登録"}
        </Button>
        {parkingLots.length === 0 && (
          <Typography variant="caption" color="warning.main" sx={{ width: "100%" }}>
            先に駐車場を登録してください
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
