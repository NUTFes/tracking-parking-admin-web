import { useState } from "react";
import type { DeviceCreated } from "../api/types";

export function useApiKeyReveal(device: DeviceCreated) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(device.api_key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return { copied, handleCopy };
}
