import { CalendarCheck } from "lucide-react";
import Link from "next/link";

import { DayChangeRefresh } from "@/components/analytics/day-change-refresh";
import { cn } from "@/components/ui/cn";
import type { AppliedToday } from "@/lib/analytics/types";

export function AppliedTodayPanel({
  appliedToday,
  timezone,
  className,
}: {
  appliedToday: AppliedToday;
  timezone: string;
  className?: string;
}) {
  return (
    <section
      aria-label="Applied today"
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-[#f4f6f4] text-cobalt [&_svg]:size-5"
        >
          <CalendarCheck />
        </span>
        <div>
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Today · {formatLocalDate(appliedToday.date)}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold leading-tight text-evergreen-deep">
            {appliedTodayMessage(appliedToday.count)}
          </p>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Resets at midnight ({timezone}).{" "}
        <Link href="/settings" className="font-semibold text-cobalt hover:underline">
          Change timezone
        </Link>
      </p>
      <DayChangeRefresh date={appliedToday.date} timeZone={timezone} />
    </section>
  );
}

function appliedTodayMessage(count: number) {
  if (count === 0) return "You haven't applied to any jobs yet today";
  return `You've applied to ${count} ${count === 1 ? "job" : "jobs"} today`;
}

/** Formats a `YYYY-MM-DD` calendar date that is already in the profile timezone. */
function formatLocalDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
