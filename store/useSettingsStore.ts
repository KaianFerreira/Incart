import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Locale } from "@/lib/i18n/translations"

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "pt"
  const lang = navigator.language?.toLowerCase() ?? ""
  return lang.startsWith("pt") ? "pt" : "en"
}

type SettingsState = {
  apiKey: string
  locale: Locale
  setApiKey: (key: string) => void
  clearApiKey: () => void
  setLocale: (locale: Locale) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      locale: detectLocale(),
      setApiKey: (key) => set({ apiKey: key.trim() }),
      clearApiKey: () => set({ apiKey: "" }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "incart-settings",
    }
  )
)
