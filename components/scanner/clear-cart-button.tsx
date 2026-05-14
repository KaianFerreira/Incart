"use client"

import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/useCartStore"
import { useTranslation } from "@/lib/i18n/useTranslation"

export function ClearCartButton() {
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const { t } = useTranslation()

  if (items.length === 0) return null

  return (
    <Button type="button" variant="outline" size="sm" onClick={clearCart}>
      {t.cart.clearButton}
    </Button>
  )
}
