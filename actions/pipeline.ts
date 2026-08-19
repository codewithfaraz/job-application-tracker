"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const transitionSchema = z.object({
  applicationId: z.string().uuid(),
  toStageId: z.string().uuid(),
  notes: z.string().trim().max(1_000).optional(),
});

export type TransitionApplicationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialTransitionApplicationState: TransitionApplicationState = {
  status: "idle",
};

export async function transitionApplicationStageAction(
  _previousState: TransitionApplicationState,
  formData: FormData,
): Promise<TransitionApplicationState> {
  const parsed = transitionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    toStageId: formData.get("toStageId"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose a valid stage and try again.",
    };
  }

  const { userId } = await requireVerifiedIdentity("/pipeline");
  const supabase = await createClient();

  const { data: ownedApplication, error: ownershipError } = await supabase
    .from("applications")
    .select("id, current_stage_id")
    .eq("id", parsed.data.applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownershipError || !ownedApplication) {
    return { status: "error", message: "Application not found." };
  }

  if (ownedApplication.current_stage_id === parsed.data.toStageId) {
    return { status: "error", message: "That application is already here." };
  }

  const { error } = await supabase.rpc("transition_application_stage", {
    p_application_id: parsed.data.applicationId,
    p_to_stage_id: parsed.data.toStageId,
    p_notes: parsed.data.notes ?? null,
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    return {
      status: "error",
      message: normalizedMessage.includes("move the record to applied")
        ? "Move this case to Applied before advancing it further."
        : normalizedMessage.includes("chronological")
          ? "The new stage must come after the latest timeline entry."
          : "We could not update this stage. Please try again.",
    };
  }

  revalidatePath("/pipeline");
  revalidatePath("/applications");
  revalidatePath(`/applications/${parsed.data.applicationId}`);

  return { status: "success", message: "Stage updated." };
}
