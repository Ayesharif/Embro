import { create } from 'zustand'

let nextId = 1

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, type }] }))
    setTimeout(() => get().dismiss(id), type === 'error' ? 6000 : 3500)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export const toast = {
  success: (message) => useToastStore.getState().push(message, 'success'),
  error: (message) => useToastStore.getState().push(message, 'error'),
  info: (message) => useToastStore.getState().push(message, 'info'),
}
