import { Check, CircleHelp, MessageSquareText, Target } from "lucide-react";

import type { InterviewPrep } from "@/lib/ai/schemas";

function InterviewPrepArtifact({ data }: { data: InterviewPrep }) {
  return (
    <div className="space-y-7">
      <div className="border-l-2 border-cobalt pl-4">
        <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Role brief
        </p>
        <p className="mt-2 text-sm leading-7 text-foreground">{data.roleSummary}</p>
      </div>

      <section aria-labelledby="focus-areas-heading">
        <h4 id="focus-areas-heading" className="flex items-center gap-2 font-display text-lg font-semibold text-evergreen-deep">
          <Target aria-hidden="true" className="size-4 text-cobalt" strokeWidth={2} />
          Focus areas
        </h4>
        {data.focusAreas.length > 0 ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {data.focusAreas.map((area) => (
              <article key={area.topic} className="rounded-md border border-border bg-paper p-4">
                <h5 className="text-sm font-semibold text-evergreen-deep">{area.topic}</h5>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{area.whyItMatters}</p>
                <p className="mt-3 border-l-2 border-cobalt-soft pl-3 text-xs leading-5 text-foreground">
                  {area.jobDescriptionEvidence}
                </p>
                {area.preparationSteps.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-xs leading-5">
                    {area.preparationSteps.map((step) => (
                      <li key={step} className="flex gap-2">
                        <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-evergreen" strokeWidth={2} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        ) : <EmptyArtifactCopy>No focus areas were identified.</EmptyArtifactCopy>}
      </section>

      <section aria-labelledby="likely-questions-heading">
        <h4 id="likely-questions-heading" className="flex items-center gap-2 font-display text-lg font-semibold text-evergreen-deep">
          <MessageSquareText aria-hidden="true" className="size-4 text-cobalt" strokeWidth={2} />
          Likely questions
        </h4>
        {data.likelyQuestions.length > 0 ? (
          <div className="mt-3 border-t border-border">
            {data.likelyQuestions.map((item, index) => (
              <details key={item.question} className="group border-b border-border py-3">
                <summary className="flex cursor-pointer list-none items-start gap-3 text-sm font-semibold text-evergreen-deep outline-none focus-visible:underline focus-visible:decoration-cobalt focus-visible:underline-offset-4 [&::-webkit-details-marker]:hidden">
                  <span className="mt-0.5 font-mono text-[0.6rem] text-cobalt">Q{String(index + 1).padStart(2, "0")}</span>
                  <span>{item.question}</span>
                </summary>
                <div className="ml-8 mt-3 grid gap-3 text-xs leading-5 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-evergreen-deep">Why it may come up</p>
                    <p className="mt-1 text-muted-foreground">{item.whyItMayBeAsked}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-evergreen-deep">Answer framework</p>
                    <p className="mt-1 text-muted-foreground">{item.answerFramework}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : <EmptyArtifactCopy>No likely questions were generated.</EmptyArtifactCopy>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <PrepList title="Questions to ask" values={data.questionsToAsk} />
        <PrepList title="Technical topics" values={data.technicalTopics} />
        <PrepList title="Company unknowns" values={data.companySpecificUnknowns} />
        <PrepList title="Day-of checklist" values={data.dayOfChecklist} checklist />
      </div>

      {data.storiesToPrepare.length > 0 ? (
        <section aria-labelledby="stories-heading">
          <h4 id="stories-heading" className="flex items-center gap-2 font-display text-lg font-semibold text-evergreen-deep">
            <CircleHelp aria-hidden="true" className="size-4 text-cobalt" strokeWidth={2} />
            Stories to prepare
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.storiesToPrepare.map((story) => (
              <article key={`${story.theme}-${story.prompt}`} className="rounded-md border border-border bg-[#f4f6f4] p-4">
                <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-cobalt">{story.theme}</p>
                <p className="mt-2 text-sm leading-6">{story.prompt}</p>
                {story.resumeEvidence ? (
                  <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                    Resume evidence: {story.resumeEvidence}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PrepList({ title, values, checklist = false }: { title: string; values: string[]; checklist?: boolean }) {
  return (
    <section className="rounded-md border border-border bg-[#f4f6f4] p-4">
      <h5 className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{title}</h5>
      {values.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {values.map((value) => (
            <li key={value} className="flex gap-2">
              <span aria-hidden="true" className={checklist ? "mt-1.5 size-3.5 shrink-0 rounded-sm border border-input bg-paper" : "mt-[0.65rem] size-1 shrink-0 rounded-full bg-cobalt"} />
              <span>{value}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-xs text-muted-foreground">None identified.</p>}
    </section>
  );
}

function EmptyArtifactCopy({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md border border-dashed border-input p-4 text-xs text-muted-foreground">{children}</p>;
}

export { InterviewPrepArtifact };
