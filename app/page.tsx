import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { RouteSpine } from "@/components/layout/route-spine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const sampleRoute = [
  {
    label: "Found",
    value: "LinkedIn",
    detail: "Jun 17",
    state: "complete" as const,
  },
  {
    label: "Applied",
    value: "Careers page",
    detail: "Jun 18",
    state: "complete" as const,
  },
  {
    label: "Current",
    value: "Technical interview",
    detail: "Round 3",
    state: "current" as const,
  },
];

export default function Home() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-18 w-full max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link
            href="/"
            aria-label="Job CRM home"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
          >
            <BrandMark />
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#how-it-works"
              className="hidden rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:text-evergreen focus-visible:ring-2 focus-visible:ring-cobalt sm:inline-flex"
            >
              How it works
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Start tracking</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid w-full max-w-[90rem] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(32rem,1.12fr)] lg:items-center lg:gap-16 lg:px-10 lg:py-28">
          <div className="max-w-2xl">
            <Badge variant="success">Private application workspace</Badge>
            <h1 className="mt-7 max-w-2xl font-display text-[clamp(3rem,7vw,5.9rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-evergreen-deep">
              Every application, still in context.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Keep the posting, resume, people, interviews, and every stage change in one quiet desk—ready when the recruiter calls weeks later.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create your desk <span aria-hidden="true">→</span>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">View the workspace</Link>
              </Button>
            </div>
            <div className="mt-7 flex items-start gap-3 border-l-2 border-cobalt pl-4">
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                No job-page scraping. AI only reads text you paste, and only when you ask it to.
              </p>
            </div>
          </div>

          <div className="relative pt-4 lg:pt-0">
            <div className="absolute left-5 top-0 z-10 rounded-t-md border border-b-0 border-border bg-paper px-3 py-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-cobalt lg:-top-4">
              Active case file
            </div>
            <article className="rounded-lg border border-border bg-paper">
              <header className="flex flex-col gap-5 border-b border-border px-5 pb-6 pt-9 sm:flex-row sm:items-start sm:justify-between sm:px-7 lg:px-8">
                <div>
                  <p className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    CF-024 · Updated today
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-evergreen-deep sm:text-4xl">
                    Backend Platform Engineer
                  </h2>
                  <p className="mt-2 text-base font-semibold text-evergreen">
                    Northstar Systems
                  </p>
                </div>
                <Badge variant="warning">Technical interview</Badge>
              </header>

              <div className="px-5 py-7 sm:px-7 lg:px-8">
                <RouteSpine steps={sampleRoute} />

                <Separator className="my-7" />

                <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
                  {[
                    ["Applied", "18 Jun 2026"],
                    ["Resume", "Backend · v4"],
                    ["Next event", "Tue · 3:00 PM"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-card px-4 py-4">
                      <dt className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-evergreen-deep">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 rounded-md border border-border bg-[#f4f6f4] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Original job description
                    </p>
                    <span className="font-mono text-[0.58rem] text-muted-foreground">
                      Preserved
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground/75">
                    Build dependable platform services in TypeScript and PostgreSQL, partner with product teams, and improve the systems engineers use to ship with confidence…
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-paper">
          <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
            <div>
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
                The application route
              </p>
              <h2 className="mt-4 max-w-lg font-display text-4xl font-semibold leading-[1.04] text-evergreen-deep sm:text-5xl">
                More useful than one status dropdown.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Where you found a role, where you applied, and where the conversation stands are different facts. Job CRM keeps the route intact.
              </p>
            </div>
            <div className="self-end rounded-lg border border-border bg-[#f5f7f5] p-6 sm:p-8">
              <RouteSpine
                label="Example application route"
                steps={sampleRoute.map((step) => ({ ...step, detail: undefined }))}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[90rem] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div className="grid overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3 md:gap-px">
            {[
              {
                marker: "Record /",
                title: "Recover the exact details",
                body: "Search company or role and pull up the original posting, submitted resume, contacts, notes, and compensation.",
              },
              {
                marker: "History /",
                title: "Keep every stage change",
                body: "A chronological route shows how each application moved—not just the latest label attached to it.",
              },
              {
                marker: "Assist /",
                title: "Use AI on purpose",
                body: "Extract a pasted job description, compare a resume, or prepare for an interview. Tracking works without it.",
              },
            ].map((item) => (
              <article key={item.marker} className="border-b border-border bg-card p-6 last:border-b-0 md:border-b-0 md:p-8">
                <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-cobalt">
                  {item.marker}
                </p>
                <h3 className="mt-7 font-display text-2xl font-semibold text-evergreen-deep">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <BrandMark />
          <p>Built for one job search at a time.</p>
        </div>
      </footer>
    </div>
  );
}
