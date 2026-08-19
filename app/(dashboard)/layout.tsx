import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace",
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireVerifiedIdentity("/dashboard");

  return <AppShell>{children}</AppShell>;
}
