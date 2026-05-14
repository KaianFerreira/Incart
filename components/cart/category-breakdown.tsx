"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useCartStore } from "@/store/useCartStore"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { CATEGORY_VALUES, type Category } from "@/lib/categories"
import { cn } from "@/lib/utils"

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

const CATEGORY_ICONS: Record<Category, string> = {
  LATICINIOS:  "🥛",
  BEBIDAS:     "🥤",
  HORTIFRUTI:  "🥦",
  CARNES:      "🥩",
  PADARIA:     "🍞",
  HIGIENE:     "🧴",
  LIMPEZA:     "🧹",
  CONGELADOS:  "🧊",
  MERCEARIA:   "🛒",
  OUTROS:      "📦",
}

export function CategoryBreakdown() {
  const { t } = useTranslation()
  const items = useCartStore((s) => s.items)
  const [open, setOpen] = useState(false)

  const completedItems = items.filter((i) => i.status === "completed")
  if (completedItems.length === 0) return null

  const grouped = CATEGORY_VALUES.reduce<
    Record<Category, { subtotal: number; count: number }>
  >(
    (acc, cat) => {
      acc[cat] = { subtotal: 0, count: 0 }
      return acc
    },
    {} as Record<Category, { subtotal: number; count: number }>
  )

  for (const item of completedItems) {
    const cat = item.category ?? "OUTROS"
    grouped[cat].subtotal += item.price * Math.max(1, Math.floor(item.quantity ?? 1))
    grouped[cat].count += 1
  }

  const activeCategories = CATEGORY_VALUES.filter((c) => grouped[c].count > 0)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground"
        aria-expanded={open}
      >
        <span>{t.cart.byCategory}</span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        )}
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {activeCategories.map((cat) => {
            const { subtotal, count } = grouped[cat]
            const label = t.categories[cat]
            const icon = CATEGORY_ICONS[cat]
            const pctOfTotal =
              completedItems.reduce(
                (s, i) => s + i.price * Math.max(1, Math.floor(i.quantity ?? 1)),
                0
              ) > 0
                ? (subtotal /
                    completedItems.reduce(
                      (s, i) =>
                        s + i.price * Math.max(1, Math.floor(i.quantity ?? 1)),
                      0
                    )) *
                  100
                : 0

            return (
              <li key={cat} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-base leading-none" aria-hidden>
                  {icon}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {label}
                      <span className="ml-1.5 text-muted-foreground/70">
                        ({count})
                      </span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {formatBrl(subtotal)}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-300"
                      style={{ width: `${pctOfTotal}%` }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
