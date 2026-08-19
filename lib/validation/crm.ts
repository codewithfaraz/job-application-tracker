import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const optionalUrl = z
  .string()
  .trim()
  .max(2_048)
  .optional()
  .transform((value, context) => {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      return parsed.toString();
    } catch {
      context.addIssue({ code: "custom", message: "Enter a valid web address." });
      return z.NEVER;
    }
  });

export const contactSchema = z.object({
  applicationId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter the contact's name.").max(120),
  role: optionalText(120),
  email: z
    .string()
    .trim()
    .max(320)
    .optional()
    .transform((value, context) => {
      if (!value) return null;
      const result = z.email().safeParse(value);
      if (!result.success) {
        context.addIssue({ code: "custom", message: "Enter a valid email." });
        return z.NEVER;
      }
      return value;
    }),
  phone: optionalText(60),
  linkedinUrl: optionalUrl,
  notes: optionalText(5_000),
});

export const eventTypes = [
  "recruiter_call",
  "screening",
  "technical_interview",
  "behavioral_interview",
  "system_design",
  "technical_assessment",
  "final_interview",
  "follow_up",
  "other",
] as const;

export const applicationEventSchema = z
  .object({
    applicationId: z.string().uuid(),
    eventId: z.string().uuid().optional(),
    type: z.enum(eventTypes),
    title: z.string().trim().min(1, "Enter an event title.").max(160),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z
      .union([z.iso.datetime({ offset: true }), z.literal("")])
      .optional()
      .transform((value) => value || null),
    meetingUrl: optionalUrl,
    location: optionalText(240),
    notes: optionalText(5_000),
  })
  .superRefine((value, context) => {
    if (value.endsAt && new Date(value.endsAt) < new Date(value.startsAt)) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after the start time.",
      });
    }
  });

export const noteSchema = z.object({
  applicationId: z.string().uuid(),
  noteId: z.string().uuid().optional(),
  body: z.string().trim().min(1, "Write a note first.").max(20_000),
});
