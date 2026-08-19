import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCalendarData } from "@/lib/data/crm";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const { events, timezone } = await getCalendarData();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">Case desk / Calendar</p><h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">Upcoming interviews</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Your internal interview schedule, shown in {timezone}.</p></div>
        <Button asChild variant="outline"><Link href="/applications">Choose an application</Link></Button>
      </header>
      <div className="mt-7">
        {events.length === 0 ? <EmptyState eyebrow="Schedule clear" title="No upcoming interviews" description="Open an application to add a recruiter call, interview, assessment, or follow-up." icon={<CalendarDays />} action={<Button asChild><Link href="/applications">View applications</Link></Button>} /> : (
          <ol className="space-y-3">{events.map((event) => <li key={event.id} className="rounded-lg border border-border bg-paper p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="warning">{event.type.replaceAll("_", " ")}</Badge><time dateTime={event.starts_at} className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{formatter.format(new Date(event.starts_at))}</time></div><h2 className="mt-3 font-display text-2xl font-semibold text-evergreen-deep">{event.title}</h2><p className="mt-1 text-sm text-muted-foreground">{event.companyName} · {event.applicationTitle}</p>{event.location ? <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{event.location}</p> : null}</div><div className="flex shrink-0 flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href={`/applications/${event.application_id}`}>Open case</Link></Button>{event.meeting_url ? <Button asChild size="sm"><a href={event.meeting_url} target="_blank" rel="noreferrer">Join <ExternalLink /></a></Button> : null}</div></div>{event.notes ? <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">{event.notes}</p> : null}</li>)}</ol>
        )}
      </div>
    </div>
  );
}
