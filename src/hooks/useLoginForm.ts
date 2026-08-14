import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export function useLoginForm() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleCredential = async (idToken: string | undefined) => {
    if (!idToken) {
      setError("Googleからの応答が不正です");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
    } catch {
      setError("このGoogleアカウントではログインできません（許可リストを確認してください）");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Googleサインインに失敗しました");
  };

  return { error, submitting, handleGoogleCredential, handleGoogleError };
}
