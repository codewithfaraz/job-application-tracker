import { NextResponse } from "next/server";

import { getVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { RESUME_BUCKET } from "@/lib/validation/resume";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getVerifiedIdentity();
  if (!identity) {
    return NextResponse.redirect(new URL("/login?returnTo=/resumes", request.url));
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("storage_path, original_filename")
    .eq("id", id)
    .eq("user_id", identity.userId)
    .maybeSingle();

  if (!resume) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(resume.storage_path, 60, {
      download: resume.original_filename,
    });

  if (error || !data.signedUrl) {
    return NextResponse.json(
      { error: "Resume download is unavailable." },
      { status: 503 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
