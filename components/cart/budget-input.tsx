"use client"

import { useState, type FormEvent } from "react"
import { Target, Pencil, X } from "lucide-react"
import { useCartStore } from "@/store/useCartStore"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function BudgetInput() {
  const { t } = useTranslation()
  const budgetTarget = useCartStore((s) => s.budgetTarget)
  const setBudgetTarget = useCartStore((s) => s.setBudgetTarget)
  const items = useCartStore((s) => s.items)

  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState("")

  const total = items
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + i.price * Math.max(1, Math.floor(i.quantity ?? 1)), 0)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleaned = input.replace(",", ".").trim()
    const value = parseFloat(cleaned)
    if (!isNaN(value) && value > 0) {
      setBudgetTarget(value)
      setEditing(false)
      setInput("")
    }
  }

  function handleRemove() {
    setBudgetTarget(null)
    setEditing(false)
    setInput("")
  }

  if (!budgetTarget && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-1.5 text-muted-foreground hover:text-foreground"
        )}
      >
        <Target className="size-3.5" aria-hidden />
        {t.cart.budgetSet}
      </button>
    )
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            placeholder={t.cart.budgetPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
          {t.cart.budgetSet}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}
          aria-label="Cancel"
        >
          <X className="size-4" aria-hidden />
        </button>
      </form>
    )
  }

  // budgetTarget is guaranteed non-null here (early returns handle the null cases above)
  const target = budgetTarget as number
  const pct = Math.min(100, (total / target) * 100)
  const over = total > target
  const remaining = Math.abs(target - total)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="size-3.5 shrink-0" aria-hidden />
          <span>
            {formatBrl(total)}{" "}
            <span className="text-muted-foreground/60">/ {formatBrl(target)}</span>
          </span>
          {over && (
            <span className="font-medium text-destructive">
              (+{formatBrl(remaining)} {t.cart.budgetOver})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setInput(String(target)); setEditing(true) }}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-6 text-muted-foreground hover:text-foreground")}
            aria-label={t.cart.budgetEdit}
          >
            <Pencil className="size-3" aria-hidden />
          </button>
          <button
            onClick={handleRemove}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-6 text-muted-foreground hover:text-destructive")}
            aria-label={t.cart.budgetRemove}
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            over ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
