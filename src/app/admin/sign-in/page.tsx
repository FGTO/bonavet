import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/admin/sign-in-button";
import { t } from "@/i18n";
import { isAuthConfigured } from "@/server/config";
import { getAuth } from "@/server/auth";
import { getParent } from "@/server/parent";
import { headers } from "next/headers";

export default function SignInPage() {
  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-feature bg-paper-white p-8 shadow-card">
      <h1 className="font-display text-heading">{t("admin.signInTitle")}</h1>
      <Suspense>
        <SignInBody />
      </Suspense>
    </div>
  );
}

async function SignInBody() {
  if (!isAuthConfigured()) {
    return <p className="mt-4 rounded-control bg-butter-yellow/60 p-4 text-body">{t("admin.notConfigured")}</p>;
  }
  if (await getParent()) redirect("/admin");
  // Signed in with Google, but not a Parent of any Household.
  const session = await getAuth().api.getSession({ headers: await headers() });
  return (
    <>
      <p className="mt-2 text-body text-slate">{t("admin.signInIntro")}</p>
      {session && (
        <p role="alert" className="mt-4 text-body-sm font-semibold text-coral-emphasis">
          {t("admin.notParent", { email: session.user.email })}
        </p>
      )}
      <div className="mt-6">
        <SignInButton />
      </div>
    </>
  );
}
