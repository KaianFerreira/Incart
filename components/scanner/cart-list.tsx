"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ImageIcon, Minus, Plus, ShoppingCart, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CartItem, CartItemStatus } from "@/store/useCartStore"
import { useCartStore } from "@/store/useCartStore"
import { cn } from "@/lib/utils"

function CartItemThumbnail({
  item,
  onExpand,
}: {
  item: CartItem
  onExpand?: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const src = item.tempImage

  const setImgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete) setLoaded(true)
  }, [])

  if (!src) {
    return (
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50"
        aria-hidden
      >
        <ImageIcon className="size-5 text-muted-foreground/70" />
      </div>
    )
  }

  const inner = (
    <>
      {item.status === "processing" ? (
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1 bg-background/50 px-0.5 text-center backdrop-blur-[2px]">
          <div
            className="h-6 w-full max-w-[2.5rem] animate-pulse rounded-sm bg-primary/25"
            aria-hidden
          />
          <span className="text-[0.55rem] font-medium leading-tight text-foreground">
            Processing with AI…
          </span>
        </div>
      ) : null}
      {!loaded && item.status !== "processing" ? (
        <div
          className="absolute inset-0 animate-pulse bg-muted-foreground/15"
          aria-hidden
        />
      ) : null}
      <img
        ref={setImgRef}
        src={src}
        alt=""
        width={48}
        height={48}
        className={cn(
          "size-full object-cover transition-opacity duration-150",
          loaded || item.status === "processing"
            ? "opacity-100"
            : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  )

  if (onExpand) {
    return (
      <button
        type="button"
        className={cn(
          "relative size-12 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-border/60 bg-muted p-0 touch-manipulation outline-none",
          "transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        onClick={onExpand}
        aria-label={`Enlarge photo: ${item.name}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
      aria-hidden
    >
      {inner}
    </div>
  )
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}

/** Matches Tailwind `shadow-sm` for motion-controlled box-shadow. */
const CARD_SHADOW_IDLE = "0 1px 2px 0 rgb(0 0 0 / 0.05)"

const SCAN_COMPLETE_GLOW = [
  CARD_SHADOW_IDLE,
  "0 0 0 3px rgba(34, 197, 94, 0.5), 0 0 32px rgba(34, 197, 94, 0.24)",
  "0 0 0 2px rgba(34, 197, 94, 0.22), 0 0 16px rgba(34, 197, 94, 0.12)",
  CARD_SHADOW_IDLE,
] as const

function useScanCompleteCelebration(status: CartItemStatus) {
  const prevRef = useRef<CartItemStatus | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    const prev = prevRef.current
    if (prev === "processing" && status === "completed") {
      setCelebrate(true)
      const id = window.setTimeout(() => setCelebrate(false), 1000)
      prevRef.current = status
      return () => clearTimeout(id)
    }
    prevRef.current = status
  }, [status])

  return celebrate
}

const springTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.85,
}

function CartListRow({
  item,
  mounted,
  onExpand,
  onRemove,
}: {
  item: CartItem
  mounted: boolean
  onExpand: () => void
  onRemove: () => void
}) {
  const celebrate = useScanCompleteCelebration(item.status)

  return (
    <motion.li
      layout
      initial={{
        opacity: 0,
        y: 8,
        scale: 0.98,
        boxShadow: CARD_SHADOW_IDLE,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: celebrate ? [...SCAN_COMPLETE_GLOW] : CARD_SHADOW_IDLE,
      }}
      exit={{ opacity: 0, x: -12, scale: 0.98 }}
      transition={{
        layout: springTransition,
        opacity: springTransition,
        y: springTransition,
        scale: springTransition,
        boxShadow: celebrate
          ? { duration: 1, ease: [0.22, 1, 0.36, 1], times: [0, 0.2, 0.52, 1] }
          : { duration: 0.2 },
      }}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5",
        item.status === "processing" &&
          "border-primary/30 ring-1 ring-primary/15",
        item.status === "error" && "border-destructive/30 bg-destructive/5",
        celebrate && "border-emerald-500/40"
      )}
    >
      {item.status === "processing" ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-40"
          aria-hidden
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      ) : null}
      <CartItemThumbnail item={item} onExpand={onExpand} />
      <div className="relative z-[1] min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium text-foreground",
            item.status === "processing" && "text-muted-foreground",
            item.status === "error" && "text-destructive"
          )}
        >
          {item.name}
        </p>
        {item.status === "completed" ? (
          <>
            <p className="text-xs tabular-nums text-muted-foreground">
              {mounted ? (
                <>
                  <span>{formatBrl(item.price)}</span>
                  <span className="mx-1 text-muted-foreground/60">×</span>
                  <span>{Math.max(1, Math.floor(item.quantity ?? 1))}</span>
                  <span className="mx-1 text-muted-foreground/60">=</span>
                  <span className="font-medium text-foreground/90">
                    {formatBrl(
                      item.price * Math.max(1, Math.floor(item.quantity ?? 1))
                    )}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground/50">…</span>
              )}
            </p>
            {item.scannedAt != null ? (
              <ScanTimestamp scannedAt={item.scannedAt} />
            ) : null}
          </>
        ) : (
          <p
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              item.status === "processing" && "text-foreground/80"
            )}
          >
            {item.status === "processing"
              ? "…"
              : item.errorMessage
                ? item.errorMessage
                : "—"}
          </p>
        )}
      </div>
      <CartItemQuantity item={item} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative z-[1] shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${item.name}`}
        onClick={onRemove}
      >
        <Trash className="size-4" aria-hidden />
      </Button>
    </motion.li>
  )
}

/** Avoids SSR/client mismatch for locale date & time (only renders after mount). */
function ScanTimestamp({ scannedAt }: { scannedAt: number }) {
  const mounted = useMounted()
  if (!mounted) return null
  const label = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(scannedAt))
  return (
    <p className="text-[0.65rem] tabular-nums text-muted-foreground/80">
      Scanned {label}
    </p>
  )
}

function CartItemQuantity({
  item,
}: {
  item: CartItem
}) {
  const updateItem = useCartStore((s) => s.updateItem)

  if (item.status !== "completed") {
    return null
  }

  const q = Math.max(1, Math.floor(item.quantity ?? 1))

  const setQuantity = (next: number) => {
    const clamped = Math.max(1, Math.min(999, Math.floor(next)))
    updateItem(item.id, { quantity: clamped })
  }

  return (
    <div
      className="relative z-[1] flex shrink-0 items-center gap-0.5 rounded-lg border border-border/80 bg-background/80 p-0.5 shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 touch-manipulation"
        disabled={q <= 1}
        aria-label={`Decrease quantity of ${item.name}`}
        onClick={() => setQuantity(q - 1)}
      >
        <Minus className="size-3.5" aria-hidden />
      </Button>
      <span
        className="min-w-[1.75rem] text-center text-xs font-medium tabular-nums text-foreground"
        aria-live="polite"
      >
        {q}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 touch-manipulation"
        disabled={q >= 999}
        aria-label={`Increase quantity of ${item.name}`}
        onClick={() => setQuantity(q + 1)}
      >
        <Plus className="size-3.5" aria-hidden />
      </Button>
    </div>
  )
}

function CartImageLightbox({
  item,
  onClose,
}: {
  item: CartItem | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const mounted = useMounted()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (item?.tempImage) {
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
    }
  }, [item])

  return (
    <dialog
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(96vw,42rem)] -translate-x-1/2 -translate-y-1/2",
        "rounded-xl border border-border bg-card p-4 shadow-2xl",
        "backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
      )}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {item?.tempImage ? (
        <div
          className="flex flex-col gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {item.name}
              </p>
              {item.status === "completed" ? (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {mounted ? formatBrl(item.price) : "…"}
                </p>
              ) : null}
              {item.status === "completed" && item.scannedAt != null ? (
                <ScanTimestamp scannedAt={item.scannedAt} />
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
            <img
              src={item.tempImage}
              alt=""
              className="mx-auto max-h-[min(75vh,640px)] w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </dialog>
  )
}

export function CartList({ className }: { className?: string }) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const mounted = useMounted()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const expandedItem =
    expandedId === null
      ? null
      : (items.find((i) => i.id === expandedId) ?? null)

  useEffect(() => {
    if (expandedId !== null && !items.some((i) => i.id === expandedId)) {
      setExpandedId(null)
    }
  }, [expandedId, items])

  const total = items
    .filter((item) => item.status === "completed")
    .reduce(
      (sum, item) =>
        sum + item.price * Math.max(1, Math.floor(item.quantity ?? 1)),
      0
    )

  const totalLabel = mounted ? formatBrl(total) : "—"

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
              <CartListRow
                key={item.id}
                item={item}
                mounted={mounted}
                onExpand={() => setExpandedId(item.id)}
                onRemove={() => removeItem(item.id)}
              />
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
            {totalLabel}
          </span>
        </CardContent>
      </Card>

      <CartImageLightbox
        item={expandedItem}
        onClose={() => setExpandedId(null)}
      />
    </div>
  )
}
