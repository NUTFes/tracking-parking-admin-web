import { Button, Paper, Stack, TextField } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useActivityLogExport } from "../hooks/useActivityLogExport";

type Props = {
  onError: (message: string) => void;
};

export function ActivityLogExport({ onError }: Props) {
  const { startDate, setStartDate, endDate, setEndDate, downloading, rangeInvalid, handleSubmit } =
    useActivityLogExport({ onError });

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack
        component="form"
        onSubmit={handleSubmit}
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "flex-start" }}
      >
        <TextField
          label="開始日"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="終了日"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          size="small"
          error={rangeInvalid}
          helperText={rangeInvalid ? "開始日以降の日付を指定してください" : "未指定の場合は全期間"}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={downloading || rangeInvalid}
          sx={{ height: 40 }}
        >
          {downloading ? "ダウンロード中…" : "CSVダウンロード"}
        </Button>
      </Stack>
    </Paper>
  );
}
