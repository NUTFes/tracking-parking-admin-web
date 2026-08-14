import { useMemo } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import { createAppTheme } from "./theme";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export function AppRoot() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => createAppTheme(prefersDark ? "dark" : "light"), [prefersDark]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
