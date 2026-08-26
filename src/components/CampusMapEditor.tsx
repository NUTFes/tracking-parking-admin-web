import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import type { ParkingLot } from "../api/types";

type Props = {
  parkingLots: ParkingLot[];
  onPositionChange: (lotId: number, xPercent: number, yPercent: number) => void;
};

type Position = { x: number; y: number };

type OccupancyColor = "error" | "warning" | "success" | "primary";

// Same thresholds/labels as web's and manager's getOccupancyColor — kept
// as a local copy here rather than a shared package (this repo already
// duplicates the CampusMap component itself across all three frontends).
function getOccupancyColor(lot: Pick<ParkingLot, "capacity" | "current_count">): OccupancyColor {
  if (lot.capacity <= 0) return "primary";
  const ratio = lot.current_count / lot.capacity;
  if (ratio >= 0.95) return "error";
  if (ratio >= 0.8) return "warning";
  return "success";
}

const PIN_LABELS: Record<OccupancyColor, string> = {
  success: "空",
  warning: "混",
  error: "満",
  primary: "-",
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function CampusMapEditor({ parkingLots, onPositionChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<number, Position>>({});
  const draggingId = useRef<number | null>(null);

  // Seed local state only for lots not already tracked — once a pin is
  // known locally it stays locally-owned, so a 5s poll tick never yanks it
  // back mid-drag (or right after a drop, before the next poll reflects the
  // just-saved value). A brand-new lot picks up its server-defaulted
  // (centered) position here, which is how its pin first appears.
  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const lot of parkingLots) {
        if (!(lot.id in next) && lot.x_percent != null && lot.y_percent != null) {
          next[lot.id] = { x: lot.x_percent, y: lot.y_percent };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [parkingLots]);

  const handlePointerDown = (lotId: number, event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingId.current = lotId;
  };

  const handlePointerMove = (lotId: number, event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingId.current !== lotId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    setPositions((prev) => ({ ...prev, [lotId]: { x, y } }));
  };

  const handlePointerUp = (lotId: number, event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    draggingId.current = null;
    // Guaranteed set: this handler only ever runs on a pin that's already
    // rendered, and a pin only renders once its lot has a `positions` entry.
    const pos = positions[lotId];
    onPositionChange(lotId, Math.round(pos.x * 10) / 10, Math.round(pos.y * 10) / 10);
  };

  const positionedLots = parkingLots.filter((lot) => lot.id in positions);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        width: "100%",
        mb: 2,
        borderRadius: 3,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        lineHeight: 0,
      }}
    >
      <Box
        component="img"
        src="/campus-map.png"
        alt="キャンパスマップ"
        draggable={false}
        sx={{ display: "block", width: "100%", height: "auto" }}
      />

      {positionedLots.map((lot) => {
        const pos = positions[lot.id];
        const occupancyColor = getOccupancyColor(lot);
        const color = `${occupancyColor}.main`;
        const label = PIN_LABELS[occupancyColor];
        return (
          <Tooltip key={lot.id} title={lot.name} placement="top">
            <Box
              onPointerDown={(e) => handlePointerDown(lot.id, e)}
              onPointerMove={(e) => handlePointerMove(lot.id, e)}
              onPointerUp={(e) => handlePointerUp(lot.id, e)}
              role="button"
              aria-label={`${lot.name}のピン`}
              sx={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -100%)",
                width: { xs: 34, sm: 40 },
                height: { xs: 42, sm: 50 },
                cursor: "grab",
                touchAction: "none",
                userSelect: "none",
                "&:active": { cursor: "grabbing" },
              }}
            >
              <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                <Box
                  sx={{
                    width: { xs: 34, sm: 40 },
                    height: { xs: 34, sm: 40 },
                    borderRadius: "50%",
                    bgcolor: color,
                    border: "2px solid white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography sx={{ color: "common.white", fontWeight: 700, fontSize: { xs: 14, sm: 16 }, lineHeight: 1 }}>
                    {label}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: { xs: "6px solid transparent", sm: "7px solid transparent" },
                    borderRight: { xs: "6px solid transparent", sm: "7px solid transparent" },
                    borderTop: { xs: "8px solid", sm: "10px solid" },
                    borderTopColor: color,
                  }}
                />
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
