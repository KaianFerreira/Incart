"use client"

import { useEffect, useState } from "react"
import { CameraCapture } from "@/components/scanner/camera-capture"
import { CartList } from "@/components/scanner/cart-list"
import { ClearCartButton } from "@/components/scanner/clear-cart-button"
import { ApiKeySetup } from "@/components/onboarding/api-key-setup"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { useSettingsStore } from "@/store/useSettingsStore"

export default function Home() {
  const apiKey = useSettingsStore((s) => s.apiKey)

  // Zustand persist hydrates after mount - avoid a flash by waiting one tick.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  if (!hydrated) return null

  if (!apiKey) {
    return <ApiKeySetup />
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-6">
          <header className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Scan &amp; verify prices
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
                Point your camera at a shelf label or receipt. Your cart builds
                below so you can compare before checkout.
              </p>
            </div>
            <SettingsPanel />
          </header>
          <CameraCapture />
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Cart
            </h2>
            <ClearCartButton />
          </div>
          <CartList className="min-h-[min(40vh,320px)]" />
        </section>
      </div>

      <footer className="mt-auto border-t border-border/60 py-6">
        <p className="text-center text-xs text-muted-foreground">
          Incart - AI-powered price verification
        </p>
      </footer>
    </div>
  )
}
