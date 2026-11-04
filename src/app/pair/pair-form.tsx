"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/components/ui/styles";
import { t } from "@/i18n";

export function PairForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/screens/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.replace("/");
    else setError(true);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-feature bg-paper-white p-8 shadow-card">
      <h1 className="font-display text-heading">{t("pair.title")}</h1>
      <p className="mt-2 text-body text-slate">{t("pair.intro")}</p>
      <label htmlFor="code" className={`${ui.label} mt-6`}>
        {t("pair.code")}
      </label>
      <input
        id="code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={8}
        placeholder="ABC234"
        className={`${ui.input} font-display text-center text-heading tracking-[0.3em]`}
      />
      {error && (
        <p role="alert" className="mt-2 text-body-sm font-semibold text-coral-emphasis">
          {t("pair.invalid")}
        </p>
      )}
      <button type="submit" disabled={busy || code.trim().length < 6} className={`${ui.primary} mt-6 w-full`}>
        {t("pair.submit")}
      </button>
      <p className="mt-6 rounded-control bg-butter-yellow/60 p-3 text-body-sm">{t("pair.homeScreenHint")}</p>
    </form>
  );
}
