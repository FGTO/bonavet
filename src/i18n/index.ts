import { sv } from "./sv";

/**
 * Minimal dictionary-based i18n. All UI text goes through `t()` so a second
 * language (en.ts with the same keys) can be added without touching components.
 */
export type MessageKey = keyof typeof sv;
export type Messages = Record<MessageKey, string>;

const dictionaries = { sv } satisfies Record<string, Messages>;
export type Locale = keyof typeof dictionaries;
export const DEFAULT_LOCALE: Locale = "sv";

export function t(key: MessageKey, vars?: Record<string, string | number>, locale: Locale = DEFAULT_LOCALE): string {
  let text: string = dictionaries[locale][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

/** BCP-47 tag used for Intl date formatting. */
export const INTL_LOCALE: Record<Locale, string> = { sv: "sv-SE" };
