import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Not using Vitest's `globals: true` (tests import describe/it/expect/vi
// explicitly), so @testing-library/react's own auto-cleanup — which only
// registers itself when it detects a *global* `afterEach` — never kicks in.
// Register it here instead, once, for every test file.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia — needed by AppRoot's
// useMediaQuery("(prefers-color-scheme: dark)"). Default to "no preference
// detected" (matches: false) unless a test stubs it with something else.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
