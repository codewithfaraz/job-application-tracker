import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(320px,0.82fr)_minmax(520px,1.18fr)]">
        <aside className="relative hidden overflow-hidden border-r border-border bg-[#e9edeb] px-10 py-9 lg:flex lg:flex-col xl:px-14 xl:py-12">
          <Link
            className="inline-flex w-fit items-center gap-3 text-[14px] font-semibold tracking-[-0.02em]"
            href="/"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-md border border-border bg-paper"
            >
              <span className="size-2.5 rounded-sm bg-evergreen" />
            </span>
            Job Search CRM
          </Link>

          <div className="my-auto max-w-[430px] py-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              A durable search record
            </p>
            <p className="mt-5 font-display text-[36px] leading-[1.12] tracking-[-0.035em] text-evergreen-deep xl:text-[44px]">
              Remember the role when the recruiter calls.
            </p>
            <p className="mt-5 max-w-[36ch] text-[14px] leading-6 text-muted-foreground">
              Keep the original job description, submitted resume, contacts,
              and every stage change together.
            </p>

            <div className="mt-12 border-y border-border py-5">
              {[
                ["Saved", "Original role captured"],
                ["Applied", "Source and resume recorded"],
                ["Interview", "Context ready when it matters"],
              ].map(([stage, detail], index) => (
                <div
                  className="grid grid-cols-[18px_72px_1fr] items-center gap-3 py-2 text-[11px]"
                  key={stage}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-[2px] ${
                      index === 2 ? "bg-cobalt" : "bg-[#a7b2ac]"
                    }`}
                  />
                  <span className="font-mono uppercase tracking-[0.08em] text-evergreen">
                    {stage}
                  </span>
                  <span className="text-muted-foreground">{detail}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            Private by default. Your records remain scoped to your account.
          </p>
        </aside>

        <section className="flex min-h-screen items-center justify-center bg-paper px-5 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-[430px]">
            <Link
              className="mb-12 inline-flex items-center gap-3 text-[14px] font-semibold tracking-[-0.02em] lg:hidden"
              href="/"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-md border border-border bg-white"
              >
                <span className="size-2.5 rounded-sm bg-evergreen" />
              </span>
              Job Search CRM
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
