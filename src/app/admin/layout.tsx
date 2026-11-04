import Link from "next/link";
import { Suspense } from "react";
import { t } from "@/i18n";
import { AdminNav } from "@/components/admin/admin-nav";
import { getParent } from "@/server/parent";
import { SignOutButton } from "@/components/admin/sign-in-button";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="font-display text-heading-sm">
          {t("app.name")} <span className="text-coral-emphasis">{t("admin.title")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-control px-3 py-2 text-body-sm font-medium hover:underline">
            {t("admin.openDashboard")}
          </Link>
          <Suspense>
            <SignedInMenu />
          </Suspense>
        </div>
      </header>
      <AdminNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function SignedInMenu() {
  const parent = await getParent();
  if (!parent) return null;
  return (
    <>
      <span className="hidden text-body-sm text-slate sm:inline">{parent.email}</span>
      <SignOutButton />
    </>
  );
}
