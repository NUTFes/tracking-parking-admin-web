import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";

type Options = {
  onError: (message: string) => void;
};

// Built client-side rather than read from Content-Disposition, which a
// cross-origin fetch can't see unless the API exposes that header via CORS.
function exportFilename(startDate: string, endDate: string): string {
  return `activities_${startDate || "all"}_${endDate || "all"}.csv`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useActivityLogExport({ onError }: Options) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState(false);
  // YYYY-MM-DD strings compare correctly as plain strings.
  const rangeInvalid = startDate !== "" && endDate !== "" && startDate > endDate;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (rangeInvalid) return;

    setDownloading(true);
    try {
      const blob = await api.exportActivitiesCsv({ startDate, endDate });
      saveBlob(blob, exportFilename(startDate, endDate));
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return { startDate, setStartDate, endDate, setEndDate, downloading, rangeInvalid, handleSubmit };
}
