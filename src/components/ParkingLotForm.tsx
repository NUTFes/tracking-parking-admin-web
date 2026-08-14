import { Button, Paper, Stack, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useParkingLotForm } from "../hooks/useParkingLotForm";

type Props = {
  onCreated: () => void;
  onError: (message: string) => void;
};

export function ParkingLotForm({ onCreated, onError }: Props) {
  const { name, setName, capacity, setCapacity, submitting, canSubmit, handleSubmit } = useParkingLotForm({
    onCreated,
    onError,
  });

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
          label="駐車場名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="第一駐車場"
          required
          size="small"
        />
        <TextField
          label="収容台数"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="50"
          required
          size="small"
          sx={{ width: 120 }}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={submitting || !canSubmit}>
          {submitting ? "登録中…" : "駐車場を登録"}
        </Button>
      </Stack>
    </Paper>
  );
}
