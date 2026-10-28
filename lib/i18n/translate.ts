import { en, type MessageKey } from "./messages/en";
import { tl, tlOptions } from "./messages/tl";
import { ceb, cebOptions } from "./messages/ceb";
import type { Language } from "./languages";

export type { MessageKey };
export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;
// Translates one of the stored English answer options ("Facebook",
// "Needed medical attention"…) for display; unknown text passes through.
export type TranslateOption = (english: string) => string;

const MESSAGES: Record<Language, Record<MessageKey, string>> = { en, tl, ceb };
const OPTIONS: Record<Language, Record<string, string>> = { en: {}, tl: tlOptions, ceb: cebOptions };

export function createTranslator(lang: Language): { t: Translate; tOption: TranslateOption } {
  const messages = MESSAGES[lang] ?? en;
  const options = OPTIONS[lang] ?? {};
  return {
    t: (key, vars) => {
      let text: string = messages[key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
    tOption: (english) => options[english] ?? english,
  };
}
