import { describe, expect, it } from "vitest";
import { createAppTheme } from "./theme";

describe("createAppTheme", () => {
  it("lightモードでは指定したpalette.modeとprimary色になることを確認する", () => {
    const theme = createAppTheme("light");

    expect(theme.palette.mode).toBe("light");
    expect(theme.palette.primary.main).toBe("#2a78d6");
  });

  it("darkモードではlightモードと異なるprimary/背景色になることを確認する", () => {
    const theme = createAppTheme("dark");

    expect(theme.palette.mode).toBe("dark");
    expect(theme.palette.primary.main).toBe("#3987e5");
    expect(theme.palette.background.default).toBe("#0d0d0d");
  });
});
