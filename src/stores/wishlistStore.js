import { create } from 'zustand'
import { apiRequest } from '../utils/api'
import { toast } from './toastStore'

export const useWishlistStore = create((set, get) => ({
  items: [],
  loaded: false,
  async load() {
    try {
      const { data } = await apiRequest('/wishlist')
      set({ items: data, loaded: true })
    } catch {
      set({ items: [], loaded: true })
    }
  },
  has: (productId) => get().items.some((item) => item.id === productId),
  async toggle(productId) {
    const present = get().has(productId)
    try {
      const { data } = present
        ? await apiRequest(`/wishlist/items/${productId}`, { method: 'DELETE' })
        : await apiRequest('/wishlist/items', { method: 'POST', body: { productId } })
      set({ items: data })
      toast.success(present ? 'Removed from wishlist' : 'Saved to wishlist')
    } catch (error) {
      toast.error(error.message)
    }
  },
  async clear() {
    try {
      await apiRequest('/wishlist', { method: 'DELETE' })
      set({ items: [] })
    } catch (error) {
      toast.error(error.message)
    }
  },
  reset: () => set({ items: [], loaded: false }),
}))
