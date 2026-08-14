import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import type { DeviceCreated } from "../api/types";

type Options = {
  onCreated: (device: DeviceCreated) => void;
  onError: (message: string) => void;
};

export function useDeviceForm({ onCreated, onError }: Options) {
  const [deviceCode, setDeviceCode] = useState("");
  const [name, setName] = useState("");
  const [parkingLotId, setParkingLotId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = deviceCode.trim() !== "" && parkingLotId !== "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const device = await api.createDevice({
        device_code: deviceCode.trim(),
        name: name.trim() || undefined,
        parking_lot_id: Number(parkingLotId),
      });
      setDeviceCode("");
      setName("");
      onCreated(device);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    deviceCode,
    setDeviceCode,
    name,
    setName,
    parkingLotId,
    setParkingLotId,
    submitting,
    canSubmit,
    handleSubmit,
  };
}
