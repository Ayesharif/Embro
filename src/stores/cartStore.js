import { create } from 'zustand'
import { apiRequest } from '../utils/api'
import { toast } from './toastStore'

const emptyCart = { items: [], itemCount: 0, subtotalAmount: 0, hasProblems: false }

// The cart lives on the server (per user, or per anonymous browser id), so it survives
// refreshes and devices. The store just mirrors the latest server response.
export const useCartStore = create((set, get) => ({
  cart: emptyCart,
  loaded: false,
  busy: false,
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  async run(request, { quiet = false } = {}) {
    set({ busy: true })
    try {
      const { cart } = await request()
      set({ cart, loaded: true })
      return true
    } catch (error) {
      if (!quiet) toast.error(error.message)
      return false
    } finally {
      set({ busy: false })
    }
  },
  load: () => get().run(() => apiRequest('/cart'), { quiet: true }),
  async add(productId, { variantId, quantity = 1 } = {}) {
    const ok = await get().run(() => apiRequest('/cart/items', { method: 'POST', body: { productId, variantId, quantity } }))
    if (ok) {
      toast.success('Added to your cart')
      set({ drawerOpen: true })
    }
    return ok
  },
  setQuantity: (itemId, quantity) => get().run(() => apiRequest(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } })),
  remove: (itemId) => get().run(() => apiRequest(`/cart/items/${itemId}`, { method: 'DELETE' })),
  clear: () => get().run(() => apiRequest('/cart', { method: 'DELETE' })),
  merge: () => get().run(() => apiRequest('/cart/merge', { method: 'POST' }), { quiet: true }),
  reset: () => set({ cart: emptyCart, loaded: false, drawerOpen: false }),
}))
