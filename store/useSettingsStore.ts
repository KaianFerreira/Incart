import { create } from "zustand"
import { persist } from "zustand/middleware"

type SettingsState = {
  apiKey: string
  setApiKey: (key: string) => void
  clearApiKey: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      setApiKey: (key) => set({ apiKey: key.trim() }),
      clearApiKey: () => set({ apiKey: "" }),
    }),
    {
      name: "incart-settings",
    }
  )
)
