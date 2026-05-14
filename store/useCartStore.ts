import { create } from "zustand"
import type { Category } from "@/lib/categories"

export type CartItemStatus = "processing" | "completed" | "error"

export type CartItem = {
  id: string
  name: string
  /** Unit price in BRL (0 while processing / error) */
  price: number
  /** Count of this line item (min 1) */
  quantity: number
  status: CartItemStatus
  /** Base64 data URL of the captured label */
  tempImage: string
  /** AI-assigned product category */
  category?: Category
  /** Set when status is error */
  errorMessage?: string
  /** When the scan finished successfully (Unix ms, client clock) */
  scannedAt?: number
}

export type CartItemUpdate = Partial<
  Pick<
    CartItem,
    | "name"
    | "price"
    | "quantity"
    | "status"
    | "tempImage"
    | "category"
    | "errorMessage"
    | "scannedAt"
  >
>

type CartState = {
  items: CartItem[]
  /** Shopping session budget target in BRL, null if not set */
  budgetTarget: number | null
  addItem: (item: CartItem) => void
  updateItem: (id: string, patch: CartItemUpdate) => void
  removeItem: (id: string) => void
  clearCart: () => void
  setBudgetTarget: (value: number | null) => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  budgetTarget: null,
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearCart: () => set({ items: [] }),
  setBudgetTarget: (value) => set({ budgetTarget: value }),
}))
