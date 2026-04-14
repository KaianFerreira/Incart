"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ShoppingCart, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCartStore } from "@/store/useCartStore"
import { cn } from "@/lib/utils"

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function CartList({ className }: { className?: string }) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const total = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 font-[family-name:var(--font-geist-sans)]",
        className
      )}
    >
      {items.length === 0 ? (
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-14 text-center shadow-sm"
          )}
        >
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background shadow-sm">
            <ShoppingCart
              className="size-7 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Cart is empty</p>
            <p className="max-w-[240px] text-xs text-muted-foreground">
              Scanned items will appear here with prices in Brazilian Real.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.98 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
                  mass: 0.85,
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatBrl(item.price)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.id)}
                >
                  <Trash className="size-4" aria-hidden />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Card
        className={cn(
          "border-2 border-foreground/15 bg-foreground text-background shadow-md"
        )}
      >
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <span className="text-sm font-semibold tracking-tight">Total</span>
          <span className="text-lg font-semibold tabular-nums tracking-tight">
            {formatBrl(total)}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
