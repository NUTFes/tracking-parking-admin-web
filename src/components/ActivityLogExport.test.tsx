import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { ActivityLogExport } from "./ActivityLogExport";

beforeEach(() => {
  // jsdom doesn't implement object URLs.
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ActivityLogExport", () => {
  it("日付を指定してダウンロードすると、その範囲でAPIが呼ばれファイルが保存されることを確認する", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "exportActivitiesCsv").mockResolvedValue(new Blob(["csv"]));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ActivityLogExport onError={vi.fn()} />);

    await user.type(screen.getByLabelText("開始日"), "2026-09-01");
    await user.type(screen.getByLabelText("終了日"), "2026-09-03");
    await user.click(screen.getByRole("button", { name: "CSVダウンロード" }));

    expect(spy).toHaveBeenCalledWith({ startDate: "2026-09-01", endDate: "2026-09-03" });
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect((clickSpy.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      "activities_2026-09-01_2026-09-03.csv",
    );
  });

  it("日付未指定でも全期間としてダウンロードできることを確認する", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(api, "exportActivitiesCsv").mockResolvedValue(new Blob(["csv"]));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ActivityLogExport onError={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "CSVダウンロード" }));

    expect(spy).toHaveBeenCalledWith({ startDate: "", endDate: "" });
  });

  it("開始日が終了日より後の場合、エラーを表示しボタンが無効になることを確認する", async () => {
    const user = userEvent.setup();
    render(<ActivityLogExport onError={vi.fn()} />);

    await user.type(screen.getByLabelText("開始日"), "2026-09-05");
    await user.type(screen.getByLabelText("終了日"), "2026-09-01");

    expect(screen.getByText("開始日以降の日付を指定してください")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CSVダウンロード" })).toBeDisabled();
  });

  it("ダウンロードに失敗した場合、onErrorがエラーメッセージ付きで呼ばれることを確認する", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "exportActivitiesCsv").mockRejectedValue(new Error("認証が必要です"));
    const onError = vi.fn();
    render(<ActivityLogExport onError={onError} />);

    await user.click(screen.getByRole("button", { name: "CSVダウンロード" }));

    expect(onError).toHaveBeenCalledWith("認証が必要です");
  });
});
