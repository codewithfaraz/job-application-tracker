"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  createCalendarFormatter,
  localDateKey,
} from "@/lib/analytics/calendar";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Re-renders the current route once the calendar date in `timeZone` moves
 * past `date`, so day-based counts reset at local midnight in an open tab.
 */
export function DayChangeRefresh({
  date,
  timeZone,
}: {
  date: string;
  timeZone: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const formatter = createCalendarFormatter(timeZone);
    const check = () => {
      if (document.visibilityState !== "visible") return;
      if (localDateKey(Date.now(), formatter) > date) router.refresh();
    };

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [date, router, timeZone]);

  return null;
}
