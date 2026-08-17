import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("online=trueの場合、「オンライン」と表示することを確認する", () => {
    render(<StatusBadge online={true} />);

    expect(screen.getByText("オンライン")).toBeInTheDocument();
  });

  it("online=falseの場合、「オフライン」と表示することを確認する", () => {
    render(<StatusBadge online={false} />);

    expect(screen.getByText("オフライン")).toBeInTheDocument();
  });
});
