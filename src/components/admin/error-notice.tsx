import { t, type MessageKey } from "@/i18n";

/** Shows a validation error passed back via `?error=<key>` after a Server Action redirect. */
export function ErrorNotice({ error, prefix }: { error: string | string[] | undefined; prefix: string }) {
  if (typeof error !== "string" || !/^[a-zA-Z]+$/.test(error)) return null;
  // Unknown keys resolve to undefined, so arbitrary ?error= values render nothing.
  const text: string | undefined = t(`${prefix}.${error}` as MessageKey);
  if (!text) return null;
  return (
    <p role="alert" className="rounded-control bg-coral-emphasis/10 p-3 text-body-sm font-semibold text-coral-emphasis">
      {text}
    </p>
  );
}
