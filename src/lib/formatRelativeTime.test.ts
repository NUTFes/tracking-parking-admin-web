import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

const RTF = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
const NOW = new Date("2026-08-15T12:00:00+09:00").getTime();

afterEach(() => {
  vi.useRealTimers();
});

describe("formatRelativeTime", () => {
  it("nullの場合は「未通信」を返すことを確認する", () => {
    expect(formatRelativeTime(null)).toBe("未通信");
  });

  it("数十秒前の場合、秒単位でフォーマットすることを確認する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(new Date(NOW - 30 * 1000).toISOString())).toBe(RTF.format(-30, "second"));
  });

  it("数分前の場合、分単位でフォーマットすることを確認する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(new Date(NOW - 5 * 60 * 1000).toISOString())).toBe(RTF.format(-5, "minute"));
  });

  it("数時間前の場合、時間単位でフォーマットすることを確認する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(new Date(NOW - 3 * 60 * 60 * 1000).toISOString())).toBe(RTF.format(-3, "hour"));
  });

  it("数日前の場合、日単位でフォーマットすることを確認する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString())).toBe(RTF.format(-2, "day"));
  });

  it("1秒未満の差の場合でも、秒単位で（「たった今」相当として）フォーマットすることを確認する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(new Date(NOW).toISOString())).toBe(RTF.format(0, "second"));
  });

  it("未来の日時を渡した場合、「後」の表現になることを確認する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(new Date(NOW + 10 * 60 * 1000).toISOString())).toBe(RTF.format(10, "minute"));
  });
});
