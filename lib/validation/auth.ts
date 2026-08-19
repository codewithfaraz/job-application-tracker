import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address.")
    .max(254, "Email addresses must be 254 characters or fewer."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(1024, "Password is too long."),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(80, "Name must be 80 characters or fewer.")
      .optional(),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .email("Enter a valid email address.")
      .max(254, "Email addresses must be 254 characters or fewer."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use 72 characters or fewer."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    next: z.string().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type AuthFieldName =
  | "displayName"
  | "email"
  | "password"
  | "confirmPassword";

export type AuthFieldErrors = Partial<Record<AuthFieldName, string[]>>;

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: AuthFieldErrors;
};

export function authFieldErrors(error: z.ZodError): AuthFieldErrors {
  const fieldErrors: AuthFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field !== "displayName" &&
      field !== "email" &&
      field !== "password" &&
      field !== "confirmPassword"
    ) {
      continue;
    }

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}
