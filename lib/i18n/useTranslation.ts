import { useSettingsStore } from "@/store/useSettingsStore"
import { translations } from "./translations"

export function useTranslation() {
  const locale = useSettingsStore((s) => s.locale)
  const t = translations[locale]
  return { t, locale }
}
