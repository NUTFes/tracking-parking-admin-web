import { Box, CircularProgress } from "@mui/material";
import { Dashboard } from "./Dashboard";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginForm } from "./auth/LoginForm";

function Gate() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
