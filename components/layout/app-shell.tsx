import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppNav } from "@/components/layout/app-nav";
import { BrandMark } from "@/components/layout/brand-mark";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AppShellProps = {
  children: ReactNode;
  accountSlot?: ReactNode;
};

function DefaultAccountSlot() {
  return (
    <Link
      href="/settings"
      className="flex items-center gap-3 rounded-md p-2 outline-none transition-colors hover:bg-paper focus-visible:ring-2 focus-visible:ring-cobalt"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-md border border-border bg-paper font-mono text-[0.62rem] font-semibold text-evergreen"
      >
        ME
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-evergreen-deep">
          Personal workspace
        </span>
        <span className="mt-0.5 block font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
          Account
        </span>
      </span>
    </Link>
  );
}

function AppShell({ children, accountSlot }: AppShellProps) {
  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-border bg-[#e9edeb] lg:flex">
        <div className="px-6 py-6">
          <Link
            href="/dashboard"
            aria-label="Job CRM dashboard"
            className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-4 focus-visible:ring-offset-[#e9edeb]"
          >
            <BrandMark />
          </Link>
        </div>
        <form action="/applications" method="get" className="relative px-4 pb-5">
          <label htmlFor="global-application-search" className="sr-only">
            Search applications
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-7 top-3 size-4 text-muted-foreground"
          />
          <Input
            id="global-application-search"
            name="q"
            type="search"
            placeholder="Company or role…"
            className="bg-paper pl-9"
          />
        </form>
        <Separator />
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <AppNav />
        </div>
        <div className="px-4 pb-4">
          <Separator className="mb-3" />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              {accountSlot ?? <DefaultAccountSlot />}
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="min-h-svh lg:pl-[17rem]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:hidden">
          <Link
            href="/dashboard"
            aria-label="Job CRM dashboard"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
          >
            <BrandMark />
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link href="/applications" aria-label="Search applications">
                <Search aria-hidden="true" />
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </header>
        <div className="sticky top-16 z-10 border-b border-border bg-background/95 backdrop-blur-sm lg:hidden">
          <AppNav mode="mobile" />
        </div>

        <main id="main-content" className="mx-auto w-full max-w-[100rem] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export { AppShell };
export type { AppShellProps };
