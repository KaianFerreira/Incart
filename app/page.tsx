"use client"

import { useEffect, useState } from "react"
import { CameraCapture } from "@/components/scanner/camera-capture"
import { CartList } from "@/components/scanner/cart-list"
import { ClearCartButton } from "@/components/scanner/clear-cart-button"
import { ApiKeySetup } from "@/components/onboarding/api-key-setup"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { LocaleToggle } from "@/components/ui/locale-toggle"
import { BudgetInput } from "@/components/cart/budget-input"
import { CategoryBreakdown } from "@/components/cart/category-breakdown"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useTranslation } from "@/lib/i18n/useTranslation"

export default function Home() {
  const apiKey = useSettingsStore((s) => s.apiKey)
  const { t } = useTranslation()

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  if (!hydrated) return null

  if (!apiKey) {
    return (
      <div className="flex min-h-full flex-col bg-background">
        <div className="flex justify-end px-4 pt-4">
          <LocaleToggle />
        </div>
        <ApiKeySetup />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-6">
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t.page.title}
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t.page.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              <LocaleToggle />
              <SettingsPanel />
            </div>
          </header>
          <CameraCapture />
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {t.page.cartTitle}
            </h2>
            <ClearCartButton />
          </div>
          <BudgetInput />
          <CartList className="min-h-[min(40vh,320px)]" />
          <CategoryBreakdown />
        </section>
      </div>

      <footer className="mt-auto border-t border-border/60 py-6">
        <p className="text-center text-xs text-muted-foreground">
          {t.page.footer}
        </p>
      </footer>
    </div>
  )
}
