"use client";

import { Building2, ExternalLink } from "lucide-react";
import { useActionState } from "react";

import {
  initialCompanyActionState,
  updateCompanyAction,
} from "@/actions/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CompanyEditor({
  applicationId,
  company,
}: {
  applicationId: string;
  company: {
    name: string;
    website: string | null;
    industry: string | null;
    location: string | null;
    notes: string | null;
  };
}) {
  const [state, action, pending] = useActionState(
    updateCompanyAction,
    initialCompanyActionState,
  );

  return (
    <section className="rounded-lg border border-border bg-paper p-5 sm:p-6" aria-labelledby="company-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-cobalt"><Building2 className="size-4" /> Company file</p>
          <h2 id="company-heading" className="mt-2 font-display text-2xl font-semibold text-evergreen-deep">{company.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{[company.industry, company.location].filter(Boolean).join(" · ") || "No company details yet"}</p>
        </div>
        {company.website ? <Button asChild size="sm" variant="outline"><a href={company.website} target="_blank" rel="noreferrer">Website <ExternalLink /></a></Button> : null}
      </div>
      {company.notes ? <p className="mt-4 whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground">{company.notes}</p> : null}

      <details className="mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-evergreen-deep outline-none focus-visible:underline">Edit company details</summary>
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <Field label="Website" name="website" type="url" defaultValue={company.website ?? ""} error={state.fieldErrors?.website?.[0]} />
          <Field label="Industry" name="industry" defaultValue={company.industry ?? ""} error={state.fieldErrors?.industry?.[0]} />
          <Field label="Company location" name="location" defaultValue={company.location ?? ""} error={state.fieldErrors?.location?.[0]} />
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="company-notes">Company notes</Label><Textarea id="company-notes" name="notes" defaultValue={company.notes ?? ""} rows={4} maxLength={10_000} /></div>
          {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-xs sm:col-span-2 ${state.status === "error" ? "text-rose" : "text-evergreen"}`}>{state.message}</p> : null}
          <Button size="sm" variant="evergreen" disabled={pending} className="w-fit">{pending ? "Saving…" : "Save company"}</Button>
        </form>
      </details>
    </section>
  );
}

function Field({ label, name, error, ...props }: { label: string; name: string; error?: string } & React.ComponentProps<typeof Input>) {
  const id = `company-${name}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} aria-invalid={Boolean(error)} {...props} />{error ? <p className="text-xs text-rose">{error}</p> : null}</div>;
}
