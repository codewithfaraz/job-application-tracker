export function createCalendarFormatter(timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
}

export function localDateParts(
  timestamp: number,
  formatter: Intl.DateTimeFormat,
) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(timestamp)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/** The calendar date (`YYYY-MM-DD`) of `timestamp` in the formatter's timezone. */
export function localDateKey(
  timestamp: number,
  formatter: Intl.DateTimeFormat,
) {
  const { year, month, day } = localDateParts(timestamp, formatter);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
