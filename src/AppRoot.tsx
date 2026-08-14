import { useMemo } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import App from "./App.tsx";
import { createAppTheme } from "./theme";

export function AppRoot() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => createAppTheme(prefersDark ? "dark" : "light"), [prefersDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}
