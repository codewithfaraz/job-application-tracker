import { describe, expect, it } from "vitest";

import { createCalendarFormatter, localDateKey } from "./calendar";

describe("localDateKey", () => {
  const instant = Date.parse("2026-01-04T20:00:00.000Z");

  it("returns the zero-padded calendar date in the formatter's timezone", () => {
    expect(localDateKey(instant, createCalendarFormatter("UTC"))).toBe("2026-01-04");
    expect(localDateKey(instant, createCalendarFormatter("Asia/Karachi"))).toBe("2026-01-05");
    expect(localDateKey(instant, createCalendarFormatter("America/Los_Angeles"))).toBe("2026-01-04");
  });

  it("falls back to UTC for an unknown timezone", () => {
    expect(localDateKey(instant, createCalendarFormatter("Not/A_Zone"))).toBe("2026-01-04");
  });
});
