import { z } from "zod";

const MAX_JOB_DESCRIPTION_LENGTH = 250_000;
const MAX_NOTES_LENGTH = 25_000;
const MAX_SALARY = 1_000_000_000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const workModes = ["remote", "hybrid", "onsite", "unknown"] as const;
const employmentTypes = [
  "full-time",
  "part-time",
  "contract",
  "internship",
  "temporary",
  "unknown",
] as const;
const salaryPeriods = ["hour", "day", "month", "year"] as const;

function blankToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function optionalTrimmedText(max: number, message: string) {
  return z.preprocess(
    blankToNull,
    z.string().trim().max(max, message).nullable(),
  );
}

function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T,
  message: string,
) {
  return z.preprocess(blankToNull, z.enum(values, { error: message }).nullable());
}

function optionalNumber(message: string) {
  return z.preprocess(
    (value) => {
      const normalized = blankToNull(value);
      if (normalized === null) return null;
      if (typeof normalized !== "string") return normalized;

      const parsed = Number(normalized.trim());
      return Number.isFinite(parsed) ? parsed : normalized;
    },
    z
      .number({ error: message })
      .finite(message)
      .min(0, "Salary cannot be negative.")
      .max(MAX_SALARY, "Salary is too large.")
      .nullable(),
  );
}

function isValidDateParts(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/**
 * Converts HTML date/datetime-local values and ISO timestamps to a UTC ISO
 * timestamp. Date-only values are anchored at midnight UTC so a date rendered
 * in UTC remains the date the user entered.
 */
export function normalizeApplicationDateTime(
  value: string,
): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (dateOnlyMatch) {
    const [, yearValue, monthValue, dayValue] = dateOnlyMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);

    if (!isValidDateParts(year, month, day)) return null;

    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }

  const dateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      normalized,
    );

  if (!dateTimeMatch) return null;

  const [
    ,
    yearValue,
    monthValue,
    dayValue,
    hourValue,
    minuteValue,
    secondValue,
    ,
    timezoneValue,
  ] = dateTimeMatch;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue ?? "0");

  if (
    !isValidDateParts(year, month, day) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  if (timezoneValue && timezoneValue !== "Z") {
    const [offsetHours, offsetMinutes] = timezoneValue.slice(1).split(":");
    if (Number(offsetHours) > 23 || Number(offsetMinutes) > 59) return null;
  }

  const localDateTime = timezoneValue ? normalized : `${normalized}Z`;
  const timestamp = Date.parse(localDateTime);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

const requiredId = (message: string) =>
  z.string().trim().uuid({ message });

const optionalId = (message: string) =>
  z.preprocess(blankToNull, z.string().trim().uuid({ message }).nullable());

const optionalUrl = z.preprocess(
  blankToNull,
  z
    .string()
    .trim()
    .max(2_048, "Job URL must be 2,048 characters or fewer.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Enter a valid http:// or https:// URL.")
    .nullable(),
);

const optionalAppliedAt = z.preprocess(
  blankToNull,
  z
    .string()
    .trim()
    .transform((value, context) => {
      const normalized = normalizeApplicationDateTime(value);

      if (!normalized) {
        context.addIssue({
          code: "custom",
          message: "Enter a valid application date.",
        });
        return z.NEVER;
      }

      return normalized;
    })
    .nullable(),
);

const checkbox = z.preprocess(
  (value) =>
    value === true ||
    (typeof value === "string" &&
      ["1", "on", "true", "yes"].includes(value.toLowerCase())),
  z.boolean(),
);

const applicationFieldsShape = {
  companyName: z
    .string()
    .trim()
    .min(1, "Enter a company name.")
    .max(160, "Company name must be 160 characters or fewer."),
  jobTitle: z
    .string()
    .trim()
    .min(1, "Enter a position title.")
    .max(200, "Position title must be 200 characters or fewer."),
  jobUrl: optionalUrl,
  sourceId: requiredId("Choose where you found the role."),
  channelId: requiredId("Choose how you applied."),
  stageId: requiredId("Choose a stage."),
  location: optionalTrimmedText(
    240,
    "Location must be 240 characters or fewer.",
  ),
  workMode: optionalEnum(workModes, "Choose a valid work mode."),
  employmentType: optionalEnum(
    employmentTypes,
    "Choose a valid employment type.",
  ),
  seniority: optionalTrimmedText(
    120,
    "Seniority must be 120 characters or fewer.",
  ),
  salaryMin: optionalNumber("Enter a valid minimum salary."),
  salaryMax: optionalNumber("Enter a valid maximum salary."),
  salaryCurrency: z.preprocess(
    (value) => {
      const normalized = blankToNull(value);
      return typeof normalized === "string"
        ? normalized.trim().toUpperCase()
        : normalized;
    },
    z
      .string()
      .regex(/^[A-Z]{3}$/, "Use a three-letter currency code, such as USD.")
      .nullable(),
  ),
  salaryPeriod: optionalEnum(
    salaryPeriods,
    "Choose a valid salary period.",
  ),
  appliedAt: optionalAppliedAt,
  resumeId: optionalId("Choose a valid resume."),
  rawJobDescription: z
    .string()
    .max(
      MAX_JOB_DESCRIPTION_LENGTH,
      "Job description must be 250,000 characters or fewer.",
    ),
  notes: z
    .string()
    .max(MAX_NOTES_LENGTH, "Notes must be 25,000 characters or fewer."),
};

type ApplicationFieldValues = z.infer<z.ZodObject<typeof applicationFieldsShape>>;

function validateApplicationFields(
  values: ApplicationFieldValues,
  context: z.RefinementCtx,
) {
  if (
    values.salaryMin !== null &&
    values.salaryMax !== null &&
    values.salaryMax < values.salaryMin
  ) {
    context.addIssue({
      code: "custom",
      path: ["salaryMax"],
      message: "Maximum salary must be at least the minimum salary.",
    });
  }

  if (
    values.appliedAt &&
    Date.parse(values.appliedAt) > Date.now() + FIVE_MINUTES_MS
  ) {
    context.addIssue({
      code: "custom",
      path: ["appliedAt"],
      message: "Application date cannot be in the future.",
    });
  }
}

export const createApplicationSchema = z
  .object({
    ...applicationFieldsShape,
    confirmDuplicate: checkbox,
  })
  .superRefine(validateApplicationFields);

export const updateApplicationSchema = z
  .object({
    id: requiredId("Application identifier is invalid."),
    ...applicationFieldsShape,
  })
  .superRefine(validateApplicationFields);

export const applicationIdSchema = z.object({
  id: requiredId("Application identifier is invalid."),
});

export const deleteApplicationSchema = applicationIdSchema.extend({
  confirmDelete: checkbox,
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export type ApplicationActionState = {
  status: "idle" | "error" | "duplicate" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  duplicateId?: string;
};

export const INITIAL_APPLICATION_ACTION_STATE: ApplicationActionState = {
  status: "idle",
};

export function applicationFieldErrors(
  error: z.ZodError,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;

    errors[field] = [...(errors[field] ?? []), issue.message];
  }

  return errors;
}
