import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#3987e5" : "#2a78d6" },
      success: { main: "#0ca30c" },
      error: { main: dark ? "#e66767" : "#d03b3b" },
      warning: { main: "#fab219" },
      background: {
        default: dark ? "#0d0d0d" : "#f9f9f7",
        paper: dark ? "#1a1a19" : "#fcfcfb",
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    components: {
      MuiAppBar: {
        defaultProps: { color: "transparent", elevation: 0 },
      },
    },
  });
}
