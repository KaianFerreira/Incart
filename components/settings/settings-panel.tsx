"use client"

import { useState, type FormEvent } from "react"
import { Settings, KeyRound, AlertCircle, ExternalLink, Trash2, X } from "lucide-react"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function isValidKeyFormat(key: string): boolean {
  return key.startsWith("sk-ant-")
}

export function SettingsPanel() {
  const apiKey = useSettingsStore((s) => s.apiKey)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const clearApiKey = useSettingsStore((s) => s.clearApiKey)
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleOpen() {
    setInput("")
    setError(null)
    setSaved(false)
    setOpen(true)
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) { setError(t.settings.keyErrorEmpty); return }
    if (!isValidKeyFormat(trimmed)) { setError(t.settings.keyErrorFormat); return }
    setError(null)
    setApiKey(trimmed)
    setInput("")
    setSaved(true)
  }

  function handleClear() {
    clearApiKey()
    setOpen(false)
  }

  const maskedKey = apiKey
    ? apiKey.slice(0, 10) + "..." + apiKey.slice(-4)
    : ""

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={t.settings.title}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "shrink-0 text-muted-foreground hover:text-foreground"
        )}
      >
        <Settings className="size-4" aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t.settings.title}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">{t.settings.title}</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-foreground")}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-5 p-5">
            {/* Current key */}
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">{t.settings.currentKey}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{maskedKey}</p>
            </div>

            {/* Replace key form */}
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-api-key"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <KeyRound className="size-3.5" aria-hidden />
                  {t.settings.replaceKeyLabel}
                </label>
                <input
                  id="settings-api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-ant-..."
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (error) setError(null); if (saved) setSaved(false) }}
                  className={cn(
                    "w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono text-foreground shadow-sm outline-none transition",
                    "placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    error ? "border-destructive" : "border-border"
                  )}
                />
                {error && (
                  <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                    <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                    {error}
                  </p>
                )}
                {saved && <p className="text-xs text-emerald-600 dark:text-emerald-400">{t.settings.savedMessage}</p>}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {t.settings.getKey}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
              <button type="submit" className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full")}>
                {t.settings.saveKey}
              </button>
            </form>

            {/* Danger zone */}
            <div className="border-t border-border pt-4">
              <button
                onClick={handleClear}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                )}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {t.settings.removeKey}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
