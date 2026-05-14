"use client"

import { useSettingsStore } from "@/store/useSettingsStore"
import type { Locale } from "@/lib/i18n/translations"
import { cn } from "@/lib/utils"

export function LocaleToggle() {
  const locale = useSettingsStore((s) => s.locale)
  const setLocale = useSettingsStore((s) => s.setLocale)

  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
      {(["pt", "en"] as Locale[]).map((loc, i) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            locale === loc
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            i === 0 && "rounded-r-none",
            i === 1 && "rounded-l-none"
          )}
          aria-pressed={locale === loc}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
