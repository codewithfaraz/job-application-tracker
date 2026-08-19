import { z } from "zod";

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const settingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(120, "Display name must be 120 characters or fewer.")
    .transform((value) => value || null),
  timezone: z
    .string()
    .trim()
    .min(1, "Choose a timezone.")
    .max(120)
    .refine(isValidTimeZone, "Choose a valid IANA timezone."),
  noResponseDays: z.coerce
    .number()
    .int()
    .min(1, "Use at least one day.")
    .max(365, "Use 365 days or fewer."),
});
