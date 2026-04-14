"use client"

import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/useCartStore"

export function ClearCartButton() {
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)

  if (items.length === 0) {
    return null
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={clearCart}>
      Clear Cart
    </Button>
  )
}
