import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import type { AdminUser } from "../api/types";

type Options = {
  onCreated: (user: AdminUser) => void;
  onError: (message: string) => void;
};

export function useAdminUserForm({ onCreated, onError }: Options) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = email.trim() !== "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const user = await api.createAdminUser({ email: email.trim() });
      setEmail("");
      onCreated(user);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return { email, setEmail, submitting, canSubmit, handleSubmit };
}
