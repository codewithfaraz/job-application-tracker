"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  initialSettingsActionState,
  updateSettingsAction,
} from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const commonTimezones = [
  "UTC",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

export function ProfileSettingsForm({
  settings,
}: {
  settings: {
    display_name: string | null;
    timezone: string;
    no_response_days: number;
    email: string | null;
  };
}) {
  const [state, action, pending] = useActionState(
    updateSettingsAction,
    initialSettingsActionState,
  );
  const timezones = commonTimezones.includes(settings.timezone)
    ? commonTimezones
    : [settings.timezone, ...commonTimezones];

  return (
    <form action={action} className="space-y-6">
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-md border p-3 text-sm ${state.status === "success" ? "border-evergreen/25 bg-mint-soft text-evergreen" : "border-rose/30 bg-rose-soft text-rose"}`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="settings-email">Account email</Label>
        <Input id="settings-email" value={settings.email ?? "Unavailable"} disabled />
        <p className="text-xs text-muted-foreground">Managed by Supabase Auth.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          name="displayName"
          defaultValue={settings.display_name ?? ""}
          maxLength={120}
          aria-invalid={Boolean(state.fieldErrors?.displayName)}
        />
        <FieldError errors={state.fieldErrors?.displayName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={settings.timezone}
          className="flex h-10 w-full rounded-md border border-input bg-paper px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
          aria-invalid={Boolean(state.fieldErrors?.timezone)}
        >
          {timezones.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.timezone} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="no-response-days">No-response threshold</Label>
        <div className="flex items-center gap-3">
          <Input
            id="no-response-days"
            name="noResponseDays"
            type="number"
            min={1}
            max={365}
            defaultValue={settings.no_response_days}
            className="max-w-28"
            aria-invalid={Boolean(state.fieldErrors?.noResponseDays)}
          />
          <span className="text-sm text-muted-foreground">days after applying</span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          This labels a case “No response yet” in analytics. It never changes the actual stage.
        </p>
        <FieldError errors={state.fieldErrors?.noResponseDays} />
      </div>

      <Button type="submit" variant="evergreen" disabled={pending}>
        <Save aria-hidden="true" /> {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-rose">{errors[0]}</p>;
}
