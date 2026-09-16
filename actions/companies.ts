"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { CompanyActionState } from "@/lib/action-states";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const companySchema = z.object({
  applicationId: z.string().uuid(),
  website: z
    .string()
    .trim()
    .max(2_048)
    .transform((value, context) => {
      if (!value) return null;
      try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        return parsed.toString();
      } catch {
        context.addIssue({ code: "custom", message: "Enter a valid website." });
        return z.NEVER;
      }
    }),
  industry: z.string().trim().max(160).transform((value) => value || null),
  location: z.string().trim().max(240).transform((value) => value || null),
  notes: z.string().trim().max(10_000).transform((value) => value || null),
});

export async function updateCompanyAction(
  _previousState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = companySchema.safeParse({
    applicationId: formData.get("applicationId"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the company details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const supabase = await createClient();
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("company_id")
    .eq("id", parsed.data.applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (applicationError || !application) {
    return { status: "error", message: "Application not found." };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      website: parsed.data.website,
      industry: parsed.data.industry,
      location: parsed.data.location,
      notes: parsed.data.notes,
    })
    .eq("id", application.company_id)
    .eq("user_id", userId);
  if (error) return { status: "error", message: "Company details could not be saved." };

  revalidatePath(`/applications/${parsed.data.applicationId}`);
  revalidatePath("/applications");
  return { status: "success", message: "Company details saved." };
}
