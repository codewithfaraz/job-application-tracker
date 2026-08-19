import { FileText, LockKeyhole } from "lucide-react";

import { ResumeActions } from "@/components/resumes/resume-actions";
import { ResumeUploadForm } from "@/components/resumes/resume-upload-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getResumesPageData } from "@/lib/data/resumes";

export const metadata = { title: "Resumes" };

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function ResumesPage() {
  const { userId, resumes } = await getResumesPageData();

  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <header className="border-b border-border pb-7">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
          Case desk / Documents
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
          Resume library
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Keep immutable versions so every application can point to the exact file you submitted.
        </p>
      </header>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(20rem,0.7fr)_minmax(0,1.3fr)]">
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle>Add a resume</CardTitle>
              <LockKeyhole aria-label="Private storage" className="size-5 text-evergreen" />
            </div>
          </CardHeader>
          <CardContent>
            <ResumeUploadForm userId={userId} />
          </CardContent>
        </Card>

        <section aria-labelledby="resume-list-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="resume-list-heading" className="font-display text-xl font-semibold text-evergreen-deep">
              Stored versions
            </h2>
            <Badge variant="neutral">{resumes.length} total</Badge>
          </div>

          {resumes.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-input bg-paper p-8 text-center">
              <div>
                <FileText aria-hidden="true" className="mx-auto size-7 text-cobalt" />
                <h3 className="mt-4 font-display text-2xl font-semibold text-evergreen-deep">
                  No resumes yet
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Upload the first version you use for applications. Files stay private by default.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {resumes.map((resume) => (
                <article key={resume.id} className="rounded-lg border border-border bg-paper p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-xl font-semibold text-evergreen-deep">
                        {resume.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {resume.originalFilename}
                      </p>
                    </div>
                    <Badge variant={resume.archivedAt ? "neutral" : "success"}>
                      {resume.archivedAt ? "Archived" : "Active"}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Size</dt>
                      <dd className="mt-1 font-medium text-foreground">{formatBytes(resume.fileSizeBytes)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Applications</dt>
                      <dd className="mt-1 font-medium text-foreground">{resume.applicationCount}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">AI-ready text</dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {resume.hasExtractedText ? "Available" : "Not added"}
                      </dd>
                    </div>
                  </dl>
                  <ResumeActions
                    resumeId={resume.id}
                    archived={Boolean(resume.archivedAt)}
                    applicationCount={resume.applicationCount}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
