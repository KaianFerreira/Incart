"use client"

import { useState, type FormEvent } from "react"
import { ShoppingCart, ExternalLink, KeyRound, AlertCircle } from "lucide-react"
import { useSettingsStore } from "@/store/useSettingsStore"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function isValidKeyFormat(key: string): boolean {
  return key.startsWith("sk-ant-")
}

export function ApiKeySetup() {
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) {
      setError("Please enter your API key.")
      return
    }
    if (!isValidKeyFormat(trimmed)) {
      setError("Key should start with sk-ant-… — double-check it from console.anthropic.com.")
      return
    }
    setError(null)
    setApiKey(trimmed)
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <ShoppingCart className="size-7 text-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome to CheckCart
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Point your camera at any shelf price tag. The AI reads and logs
              the price so you can compare before you reach the checkout.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How it works</p>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>Snap a photo of a shelf label in the supermarket.</li>
            <li>Two AI agents extract and verify the price from the image.</li>
            <li>The item is added to your in-app cart for easy comparison.</li>
          </ol>
        </div>

        {/* Key input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="api-key-input"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              <KeyRound className="size-3.5" aria-hidden />
              Your Anthropic API key
            </label>
            <input
              id="api-key-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (error) setError(null)
              }}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono text-foreground shadow-sm outline-none transition",
                "placeholder:text-muted-foreground/60",
                "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                error ? "border-destructive" : "border-border"
              )}
            />
            {error && (
              <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Your key is stored only in your browser and never sent to our
              servers — it goes directly to Anthropic.{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
              >
                Get a key
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </p>
          </div>

          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "w-full"
            )}
          >
            Save key &amp; get started
          </button>
        </form>
      </div>
    </div>
  )
}
