"use server";

import { revalidatePath } from "next/cache";

import type { SettingsActionState } from "@/lib/action-states";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation/settings";

export async function updateSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    noResponseDays: formData.get("noResponseDays"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the settings below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await requireVerifiedIdentity("/settings");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      no_response_days: parsed.data.noResponseDays,
    })
    .eq("id", userId);

  if (error) {
    return {
      status: "error",
      message: "Your settings could not be saved. Please try again.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/calendar");
  return { status: "success", message: "Settings saved." };
}
