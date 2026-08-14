import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

export function useLoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
    } catch {
      setError("ユーザー名またはパスワードが正しくありません");
    } finally {
      setSubmitting(false);
    }
  };

  return { username, setUsername, password, setPassword, error, submitting, handleSubmit };
}
