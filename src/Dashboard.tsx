import { Alert, AppBar, Box, Button, Chip, Container, Slide, Snackbar, Stack, Toolbar, Typography } from "@mui/material";
import type { SlideProps } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { ActivityLogTable } from "./components/ActivityLogTable";
import { AdminUserForm } from "./components/AdminUserForm";
import { AdminUserTable } from "./components/AdminUserTable";
import { ApiKeyReveal } from "./components/ApiKeyReveal";
import { DeviceForm } from "./components/DeviceForm";
import { DeviceTable } from "./components/DeviceTable";
import { ParkingLotForm } from "./components/ParkingLotForm";
import { ParkingLotTable } from "./components/ParkingLotTable";
import { useDashboard } from "./hooks/useDashboard";

function SlideFromRight(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

export function Dashboard() {
  const {
    user,
    logout,
    health,
    serverOnline,
    parkingLots,
    devices,
    activities,
    adminUsers,
    revealedDevice,
    dismissRevealedDevice,
    notice,
    notifyError,
    dismissNotice,
    commandNotice,
    dismissCommandNotice,
    handleDeviceCommand,
    handleDeviceCreated,
    handleParkingLotUpdate,
    handleParkingLotDelete,
    handleParkingLotReset,
    handleParkingLotResetAll,
    handleDeviceUpdate,
    handleDeviceDelete,
    handleAdminUserCreated,
    handleAdminUserDelete,
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
              onCommand={handleDeviceCommand}
              onUpdate={handleDeviceUpdate}
              onDelete={handleDeviceDelete}
              onError={notifyError}
            />
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              ユーザー管理
            </Typography>
            <AdminUserForm onCreated={handleAdminUserCreated} onError={notifyError} />
            {adminUsers.error && <Alert severity="error">{adminUsers.error}</Alert>}
            <AdminUserTable
              users={adminUsers.data ?? []}
              onDelete={handleAdminUserDelete}
              onError={notifyError}
            />
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              活動ログ
            </Typography>
            {activities.error && <Alert severity="error">{activities.error}</Alert>}
            <ActivityLogTable activities={activities.data ?? []} parkingLots={parkingLots.data ?? []} />
          </Stack>
        </Stack>
      </Container>

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={dismissNotice}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        slots={{ transition: SlideFromRight }}
      >
        <Alert severity="error" variant="filled" onClose={dismissNotice} sx={{ width: "100%" }}>
          {notice}
        </Alert>
      </Snackbar>

      <Snackbar
        open={commandNotice !== null}
        onClose={dismissCommandNotice}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        slots={{ transition: SlideFromRight }}
      >
        <Alert
          severity={commandNotice?.severity ?? "info"}
          variant="filled"
          onClose={dismissCommandNotice}
          sx={{ width: "100%" }}
        >
          {commandNotice?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
