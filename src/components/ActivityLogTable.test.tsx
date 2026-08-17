import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityLogTable } from "./ActivityLogTable";
import type { ParkingActivity, ParkingLot } from "../api/types";

const lots: ParkingLot[] = [
  {
    id: 1,
    name: "第一駐車場",
    capacity: 10,
    current_count: 3,
    system_count: 3,
    has_device: true,
    created_at: "2026-08-15T00:00:00+09:00",
  },
];

function activity(overrides: Partial<ParkingActivity> = {}): ParkingActivity {
  return {
    id: 1,
    parking_lot_id: 1,
    activity_type: "manual_adjustment",
    delta: 2,
    count_after: 5,
    actor_label: "24.k.tanaka",
    note: null,
    created_at: "2026-08-15T10:00:00+09:00",
    ...overrides,
  };
}

describe("ActivityLogTable", () => {
  it("活動ログが1件もない場合、その旨のメッセージを表示することを確認する", () => {
    render(<ActivityLogTable activities={[]} parkingLots={lots} />);

    expect(screen.getByText("活動ログがありません")).toBeInTheDocument();
  });

  it("駐車場名・種別・対象・実行者・増減・変更後の値を表示することを確認する", () => {
    render(<ActivityLogTable activities={[activity()]} parkingLots={lots} />);

    expect(screen.getByText("第一駐車場")).toBeInTheDocument();
    expect(screen.getByText("手動調整")).toBeInTheDocument();
    expect(screen.getByText("人力")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("24.k.tanaka")).toBeInTheDocument();
  });

  it("増減がマイナスの場合、符号付きにせずそのまま表示することを確認する", () => {
    render(<ActivityLogTable activities={[activity({ delta: -3 })]} parkingLots={lots} />);

    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  it("メモがnullの場合、「-」を表示することを確認する", () => {
    render(<ActivityLogTable activities={[activity({ note: null })]} parkingLots={lots} />);

    const cells = screen.getAllByText("-");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("メモがある場合、その内容を表示することを確認する", () => {
    render(<ActivityLogTable activities={[activity({ note: "出庫の記録漏れ" })]} parkingLots={lots} />);

    expect(screen.getByText("出庫の記録漏れ")).toBeInTheDocument();
  });

  it("対応する駐車場が見つからない場合、#IDの形式でフォールバック表示することを確認する", () => {
    render(<ActivityLogTable activities={[activity({ parking_lot_id: 999 })]} parkingLots={lots} />);

    expect(screen.getByText("#999")).toBeInTheDocument();
  });

  it("entry/exit/system_resetはシステム集計側の活動として表示することを確認する", () => {
    render(<ActivityLogTable activities={[activity({ activity_type: "entry" })]} parkingLots={lots} />);

    expect(screen.getByText("入庫")).toBeInTheDocument();
    expect(screen.getByText("システム")).toBeInTheDocument();
  });

  it("未知のactivity_type（APIレスポンスがユニオン型の想定外だった場合）は、種別を生の値のまま・対象を「-」として表示することを確認する", () => {
    render(
      <ActivityLogTable
        activities={[activity({ activity_type: "unknown_type" as ParkingActivity["activity_type"] })]}
        parkingLots={lots}
      />,
    );

    expect(screen.getByText("unknown_type")).toBeInTheDocument();
    // Falls back to "-" for both the unmapped target column and the null note column.
    expect(screen.getAllByText("-")).toHaveLength(2);
  });
});
