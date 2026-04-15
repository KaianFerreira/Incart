import { create } from "zustand"

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
    | "errorMessage"
    | "scannedAt"
  >
>

type CartState = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  updateItem: (id: string, patch: CartItemUpdate) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
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
}))
