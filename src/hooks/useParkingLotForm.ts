import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";

type Options = {
  onCreated: () => void;
  onError: (message: string) => void;
};

export function useParkingLotForm({ onCreated, onError }: Options) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = name.trim() !== "" && capacity !== "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await api.createParkingLot({ name: name.trim(), capacity: Number(capacity) });
      setName("");
      setCapacity("");
      onCreated();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return { name, setName, capacity, setCapacity, submitting, canSubmit, handleSubmit };
}
