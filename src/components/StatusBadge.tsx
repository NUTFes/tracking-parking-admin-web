import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

type Props = {
  online: boolean;
};

export function StatusBadge({ online }: Props) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={online ? "success" : "error"}
      icon={online ? <CheckCircleIcon /> : <CancelIcon />}
      label={online ? "オンライン" : "オフライン"}
    />
  );
}
