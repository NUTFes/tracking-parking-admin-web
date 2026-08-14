import { Alert, AppBar, Box, Button, Chip, Container, Snackbar, Stack, Toolbar, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { ApiKeyReveal } from "./components/ApiKeyReveal";
import { DeviceForm } from "./components/DeviceForm";
import { DeviceTable } from "./components/DeviceTable";
import { ParkingLotForm } from "./components/ParkingLotForm";
import { ParkingLotTable } from "./components/ParkingLotTable";
import { useDashboard } from "./hooks/useDashboard";

export function Dashboard() {
  const {
    user,
    logout,
    health,
    serverOnline,
    parkingLots,
    devices,
    revealedDevice,
    dismissRevealedDevice,
    notice,
    notifyError,
    dismissNotice,
    handleRestart,
    handleDeviceCreated,
    handleParkingLotUpdate,
    handleParkingLotDelete,
    handleParkingLotReset,
    handleParkingLotResetAll,
    handleDeviceUpdate,
    handleDeviceDelete,
  } = useDashboard();

  return (
    <>
      <AppBar position="static" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ py: 1.5 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
              Tracking-Parking 管理コンソール
            </Typography>
            <Typography variant="caption" color="text.secondary">
              駐車場・エッジデバイスの登録、再起動などの管理操作
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Chip
              size="small"
              variant="outlined"
              color={serverOnline ? "success" : "error"}
              label={health.loading ? "サーバー確認中…" : serverOnline ? "サーバー正常稼働中" : "サーバー応答なし"}
            />
            {user && (
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            )}
            <Button size="small" startIcon={<LogoutIcon />} onClick={() => logout()}>
              ログアウト
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={5}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              駐車場管理
            </Typography>
            <ParkingLotForm onCreated={parkingLots.refresh} onError={notifyError} />
            {parkingLots.error && <Alert severity="error">{parkingLots.error}</Alert>}
            <ParkingLotTable
              parkingLots={parkingLots.data ?? []}
              onUpdate={handleParkingLotUpdate}
              onDelete={handleParkingLotDelete}
              onReset={handleParkingLotReset}
              onResetAll={handleParkingLotResetAll}
              onError={notifyError}
            />
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              デバイス管理
            </Typography>
            <DeviceForm parkingLots={parkingLots.data ?? []} onCreated={handleDeviceCreated} onError={notifyError} />
            {revealedDevice && <ApiKeyReveal device={revealedDevice} onDismiss={dismissRevealedDevice} />}
            {devices.error && <Alert severity="error">{devices.error}</Alert>}
            <DeviceTable
              devices={devices.data ?? []}
              parkingLots={parkingLots.data ?? []}
              onRestart={handleRestart}
              onUpdate={handleDeviceUpdate}
              onDelete={handleDeviceDelete}
              onError={notifyError}
            />
          </Stack>
        </Stack>
      </Container>

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={dismissNotice}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={dismissNotice} sx={{ width: "100%" }}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
