import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ApplicationNotFound() {
  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <EmptyState
        eyebrow="Case file not found"
        title="This application is unavailable"
        description="It may have been deleted, or it may belong to another workspace."
        icon={<FileQuestion aria-hidden="true" className="size-5" strokeWidth={2} />}
        action={<Button asChild><Link href="/applications">Back to applications</Link></Button>}
        className="min-h-[32rem]"
      />
    </div>
  );
}
