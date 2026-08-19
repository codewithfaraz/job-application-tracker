import { ShieldCheck } from "lucide-react";

import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings } from "@/lib/data/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="border-b border-border pb-7">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
          Case desk / Settings
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
          Workspace settings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Control how dates and deterministic no-response insights are calculated.
        </p>
      </header>

      <Card className="mt-7">
        <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border">
          <div>
            <CardTitle>Profile &amp; tracking</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              These values are private to your account.
            </p>
          </div>
          <ShieldCheck aria-label="Protected by row-level security" className="size-5 text-evergreen" />
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          <ProfileSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
